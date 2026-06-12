# CI/CD Strategy — Pipeline Follows the Test Strategy

Reference for `/gsd:cicd-strategy`. Decides WHERE CI runs, HOW it authenticates to the cloud, WHICH test tiers gate which stage, and HOW deploys promote — matched to team size and blast radius. Consumes `TEST-STRATEGY.md` (the tiers) and `INFRA-STRATEGY.md` (the target cloud). Recommends; the user decides.

## CI platform: GitHub Actions is the DEFAULT

GitHub Actions has **41% organizational adoption** (62% personal — JetBrains State of Developer Ecosystem 2025, n=24,534), and the old "all-in on one cloud → use that cloud's CI" argument has collapsed: **AWS and Google both publish first-class GitHub Actions → their-cloud deployment paths**, including official OIDC federation docs (AWS Security Blog; Google's keyless Workload Identity Federation blog). AWS even quietly stopped onboarding CodeCommit customers in June 2024 (reversed Nov 2025) while recommending GitHub/GitLab. Even the cloud vendors don't assume cloud-native CI for cloud-native apps.

**Cloud-native CI (Cloud Build / CodeBuild) is a deliberate EXCEPTION, justified only by:**
- **VPC-isolated / regulated builds** — builds that must execute inside a private network or compliance boundary (Cloud Build private pools, CodeBuild in-VPC).
- **Cheap compute behind GHA** — e.g., CodeBuild can host GitHub Actions runner jobs; GHA stays the orchestrator/ecosystem, the cloud supplies the metal.

If neither applies, cloud-native CI buys a smaller ecosystem for no security gain — OIDC/WIF closed the in-project-credentials advantage.

### Pricing anchors (official pages, verified 2026)

| Platform | Free tier | Marginal cost |
|---|---|---|
| GitHub Actions | 2,000–3,000 min/mo private; public repos free | Linux x64 **$0.006/min** (arm64 $0.005, macOS $0.062); Jan 2026 cut "up to 39%" |
| GCP Cloud Build | **2,500 min/mo free** | **$0.006/min**, per-second proration, queue time free |
| AWS CodeBuild | 100 min/mo | general1.small $0.005/min |
| Azure Pipelines | 1 hosted job (1,800 min/mo) | **$40/mo per parallel job**, unlimited minutes |
| GitLab CI | 400 min/mo | $10/1,000 min; per-seat Premium $29 is the real cost driver |

Runner rule of thumb: stay on hosted runners until you exceed the free tier plus low-hundreds of $/mo, or macOS/heavy-Docker dominates — then **managed third-party runners** (Depot/RunsOn class) before DIY self-hosted. Never self-hosted runners on public repos (GitHub: "almost never").

## Auth: OIDC keyless is THE standard — with the pinned `sub` caveat

Rare four-party unanimity: **GitHub** ("no cloud secrets… short-lived access token valid for a single job"), **Google** ("Workload Identity Federation is recommended over Service Account Keys"), **AWS** ("OIDC, recommended… temporary credentials"), and **Microsoft** (federation "eliminates the risk of leaking secrets") all say the same thing. Long-lived cloud keys in CI are empirically disqualified: the CircleCI Jan 2023 breach exfiltrated every stored CI secret via one infected laptop ("immediately rotate any and all secrets"); GitGuardian found 23.8M secrets leaked on public GitHub in 2024 with **70% still valid 2+ years later**; Unit 42 honeypots saw leaked AWS keys exploited in **~5 minutes**.

**The MANDATORY caveat:** OIDC moves the risk from secret hygiene to **trust-policy hygiene**. Three independent security teams (Datadog Security Labs, Rezonate, Tinder Security Labs) found hundreds-to-**~1,500 cloud roles assumable by ANY GitHub repo** due to missing/wildcard `sub` conditions. The recommendation is always "**OIDC with a pinned `sub` condition (repo + branch/environment)**" — never bare "OIDC."

**Fallback:** long-lived cloud keys in CI secrets are acceptable ONLY when the target genuinely cannot do federation (legacy/3rd-party SaaS) — then short-lived, scoped, rotated.

## The secrets split

| Secret type | Lives where | Rule |
|---|---|---|
| Cloud deploy credentials | **Nowhere** — OIDC mints them per job | Pinned `sub`; zero long-lived keys |
| CI-scoped secrets (e.g., an SaaS API token CI itself needs) | CI platform secrets | **ONLY when OIDC is unavailable** for that target; short-lived, scoped, rotated |
| Application secrets | **ALWAYS the cloud secret manager** (Secret Manager / Secrets Manager) | Injected at **runtime** (native integration or API fetch); **never baked into images, never a committed `.env`** |

Backing: 12factor config (repo open-sourceable without compromising credentials); OWASP ("never built-in [to the container], as this will leak the secret with the container definition"); GCP/AWS secret-manager best practices; GitHub's own docs position Actions secrets as small CI-scoped values (48 KB limit, imperfect log masking) and point to OIDC for cloud creds. Empirical: ~100k valid secrets in 15M public Docker images (GitGuardian); Unit 42's large-scale extortion campaign built on exposed `.env` files.

## Test tiers → pipeline stages (consume TEST-STRATEGY.md)

This is stated **policy** at Google (SWE at Google ch. 23: presubmit runs only fast, reliable small tests; large/slow tests deferred to postsubmit; release candidates get the full sweep), and the size↔flakiness link is **measured across 4.2M tests** ("larger tests are more flaky… test it in a different, smaller way").

| Stage | What runs | Budget |
|---|---|---|
| **PR gate** | lint, types, **small (unit)** + fast **medium (in-process integration)** + the **3–7 persistent smoke e2e** from TEST-STRATEGY.md (happy paths only) | **≤10 min wall clock** — Continuous Delivery's commit stage ("ideally less than five minutes and no more than ten"); DORA: test feedback "in less than ten minutes" |
| **Merge to main** | full medium suite + e2e subset against a real (preview/ephemeral) environment | minutes-to-tens-of-minutes |
| **Nightly / pre-release** | **full e2e portfolio**, long-running suites, cross-browser/device, **mutation run** (Stryker on the critical modules) | unbounded |

Tests in the PR gate must hold <1% flake rate or be quarantined out (Google: "as you approach 1% flakiness, the tests begin to lose value").

### Flaky tests — the canon

- **Quarantine from the PR gate but KEEP RUNNING post-merge, with a fix SLA** — Google ch. 23 + Dropbox Athena (the cleanest published implementation).
- **Differentiated retries for diagnosis only** (same-process / time-shifted / different-host, to classify root cause) — GitHub Engineering cut flaky-failure impact 18x this way.
- **NEVER blanket retry-until-green** — Fowler ("Eradicating Non-Determinism in Tests"): rerun-until-green destroys the signal.

### Merge queue trigger

Enable a merge queue at roughly **tens of merges/day to one branch** — when "PR passed CI against a stale base" failures become routine. The math: Uber SubmitQueue (EuroSys 2019) showed **~40% chance of conflict-induced breakage at just 16 concurrent potentially-conflicting changes**. Commodity now: GitHub merge queue GA, GitLab merge trains. Below that volume it's pure latency.

## The deployment ladder ("you must be this tall")

The invariant at every rung (DORA + SRE Workbook + Charity Majors converge): **small frequent changes through one automated pipeline, fast trustworthy rollback, production observability — these beat pre-prod environment fidelity.** Build once; promote the same digest-pinned artifact with env-attached config (12factor build-release-run).

| Rung | Capability justified |
|---|---|
| **Solo / small team, low blast radius** | Trunk-based + CI + one automated deploy path + **free platform PR previews** (Vercel/Netlify; Neon-style DB branch per preview if Postgres) + **one-command rollback**. **NO staging environment** — Majors: "trying to mirror your staging environment to production is a fool's errand"; staging catches only known-unknowns. |
| **1–3 people, HIGH blast radius (payments/data)** | Add: **feature flags** for risky paths (internal-first exposure) + **revertable expand-contract schema changes** (Neon/PlanetScale-style reviewed deploy requests) + deliberate blue-keep-alive rollback window (AWS: 15–30 min). Still no canary analysis — insufficient traffic for signal. |
| **~10 people** | Previews standard for every PR incl. backend; real flag system with hygiene (expiry dates — Knight Capital is the failure mode); DORA metrics; *manual* canary (one instance, watch dashboards). |
| **~50 people / high traffic + risk** | Automated canary analysis (Argo/Flagger); shared staging is now actively failing you (Uber SLATE deprecates staging for tenancy-isolated test-in-prod). |

**Canary ANALYSIS prerequisites (SRE Workbook ch. 16 — all required):** ~**a dozen trustworthy, low-variance SLI-derived metrics**, real traffic volume that yields signal on a 1–5% slice, and deploy frequency exceeding human attention — on top of repeatable builds and automated deploys. Below that: rolling deploy + health checks + one-command rollback. Use "the simplest model that meets your technical and business objectives." Plain blue-green is a "before/after canary" — risky because time is the largest source of metric variance.

## Supply-chain table stakes (small team — all free, each ≤ hours, each counters a real 2023–25 attack)

1. **SHA-pin all third-party actions + Dependabot updating the pins.** tj-actions/changed-files (Mar 2025, **CVE-2025-30066**): attacker retroactively moved version tags to a malicious secrets-dumping commit, 23,000+ repos hit — tag pinning gave zero protection. Dependabot updates SHA pins with version comments, so "pins go stale" is solved.
2. **Committed lockfile + `npm ci`** (errors instead of mutating the lock) — counters the 2025 npm wave (chalk/debug compromise, Shai-Hulud worm: ~796 packages, ran TruffleHog on victims).
3. **Top-level read-only `permissions:`** (`contents: read`) in every workflow + org read-only `GITHUB_TOKEN` default — in tj-actions and Shai-Hulud the blast radius was whatever the stolen token could do (OpenSSF Scorecard Token-Permissions).
4. **OIDC federation, zero long-lived cloud keys in CI** (above) — counters the CircleCI 2023 breach class.
5. **Push protection + secret scanning on; no `.env` in repo** — GitGuardian's 23.8M-leaked-secrets numbers.
6. **Branch ruleset on main: require PR + status checks, block force-push** — GitHub rulesets + Scorecard Branch-Protection.

Plus two free habits: dependency-review-action + a short cooldown on new dep versions; `npm publish --provenance` / artifact attestations if publishing.

**DEFER until bigger:** SLSA L3 (the spec itself: "usually requires significant changes to existing build platforms" — hosted runners already ≈ L1–L2), cosign-signing internal artifacts (ceremony without a verifier until artifacts cross trust boundaries), SBOM management programs (enable the free SPDX export, stop there), org-wide Scorecard dashboards, self-hosted runner fleets.

## Anti-patterns

| Anti-pattern | Why / best citation |
|---|---|
| Long-lived cloud keys in CI secrets | CircleCI 2023 breach: rotate-everything advisory, "use OIDC tokens wherever possible" |
| Secrets/`.env` committed to repo | 28.65M secrets leaked on public GitHub in 2025; 70% still valid 2+ yrs later (GitGuardian) |
| Secrets baked into images | OWASP: "never built-in… this will leak the secret with the container definition" |
| Different artifact per environment | 12factor build-release-run; Humble & Farley "build once, deploy many" |
| Manual prod deploys, no audit trail | DORA: manual steps increase time and error; deploy any version on demand |
| Heavy e2e suite as PR gate | SWE at Google ch. 23 (presubmit = small fast tests only) + measured size↔flakiness (4.2M tests) |
| Blanket retry-until-green on flakes | Fowler: rerun-until-green destroys signal; GitHub's differentiated-retry alternative |
| Actions pinned to tags, not SHAs | tj-actions CVE-2025-30066: tags retroactively moved to malicious commit |
| Default-write `GITHUB_TOKEN` | OpenSSF Scorecard Token-Permissions check |
| `pull_request_target` + untrusted checkout | GitHub Security Lab "Preventing pwn requests" |
| Self-hosted runners on public repos | GitHub: "should almost never be used" |
| Force-push to main / no branch protection | GitHub rulesets docs + Scorecard Branch-Protection check |
| OIDC with wildcard/missing `sub` condition | Datadog Security Labs: 275+ accounts with roles assumable by arbitrary repos |
| High-fidelity staging as the safety strategy | Majors: "mirror staging to production is a fool's errand"; Uber deprecating staging (SLATE) |

## Consumes / produces

- **Consumes** `TEST-STRATEGY.md` (the tiers and the persistent smoke list → stage mapping) and `INFRA-STRATEGY.md` (target cloud → OIDC provider, secret manager, deploy target). If TEST-STRATEGY is absent, suggest `/gsd:testing-strategy` first; proceed with generic small/medium/large tiers if declined.
- **Produces** `.planning/CICD-STRATEGY.md` — platform, auth, secrets split, pipeline map, flaky policy, ladder rung, supply-chain checklist. Feeds `plan-phase` (CI/deploy phases plan against it).
