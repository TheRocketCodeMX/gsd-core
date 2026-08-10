# CI/CD Strategy — Pipeline Follows the Test Strategy

Reference for `/gsd:cicd-strategy`. Decides WHERE CI runs, HOW it authenticates to the cloud, WHICH automation runs and when (**Axis C — the CI rung ladder**), and HOW code reaches users (**Axis D — the delivery rung ladder**). Consumes `TEST-STRATEGY.md` (the tiers), `INFRA-STRATEGY.md` (the target cloud), and `SECURITY-STRATEGY.md` (data classification → blast radius). Recommends; the user decides.

**The two axes are independent.** Axis C is driven by suite duration, merge volume, flake evidence, and dependency surface. Axis D is driven by production-user exposure, blast radius, deploy cadence, and compliance. Never let a long test suite imply a canary; never let real production users imply a nightly. Within each axis the ladder is **per-capability, not a monotonic staircase** — a project can sit at C0 with one C2 dependency-drift job and still be at D0. **Every rung above the floor names the concrete requirement forcing it, or it drops to the floor.**

## CI platform: GitHub Actions is the DEFAULT

GitHub Actions has **41% organizational adoption** (62% personal — JetBrains State of Developer Ecosystem 2025, n=24,534), and the old "all-in on one cloud → use that cloud's CI" argument has collapsed: **AWS and Google both publish first-class GitHub Actions → their-cloud deployment paths**, including official OIDC federation docs (AWS Security Blog; Google's keyless Workload Identity Federation blog). AWS even quietly stopped onboarding CodeCommit customers in June 2024 (reversed Nov 2025) while recommending GitHub/GitLab. Even the cloud vendors don't assume cloud-native CI for cloud-native apps.

**Cloud-native CI (Cloud Build / CodeBuild) is a deliberate EXCEPTION, justified only by:**
- **VPC-isolated / regulated builds** — builds that must execute inside a private network or compliance boundary (Cloud Build private pools, CodeBuild in-VPC).
- **Cheap compute behind GHA** — e.g., CodeBuild can host GitHub Actions runner jobs; GHA stays the orchestrator/ecosystem, the cloud supplies the metal.

If neither applies, cloud-native CI buys a smaller ecosystem for no security gain — OIDC/WIF closed the in-project-credentials advantage.

### Pricing anchors (official pages, verified 2026)

| Platform | Free tier | Marginal cost |
|---|---|---|
| GitHub Actions | 2,000–3,000 min/mo private; public repos free | Linux 1-core **$0.002/min**, Linux 2-core x64 **$0.006/min** (arm64 $0.005, Windows 2-core $0.010, macOS $0.062); Jan 2026 cut "up to 39%" |
| GCP Cloud Build | **2,500 min/mo free** | **$0.006/min**, per-second proration, queue time free |
| AWS CodeBuild | 100 min/mo | general1.small $0.005/min |
| Azure Pipelines | 1 hosted job (1,800 min/mo) | **$40/mo per parallel job**, unlimited minutes |
| GitLab CI | 400 min/mo | $10/1,000 min; per-seat Premium $29 is the real cost driver |

Runner rule of thumb: stay on hosted runners until you exceed the free tier plus low-hundreds of $/mo, or macOS/heavy-Docker dominates — then **managed third-party runners** (Depot/RunsOn class) before DIY self-hosted. Never self-hosted runners on public repos (GitHub: "almost never").

### What THIS pipeline costs (not just what the platform charges)

Platform rates answer "which CI"; they do not answer "should this job exist". Multiply it out instead — **stages × matrix legs × merges/week × duration** — and compare against the allowance:

- **Included minutes/month (private repos; public repos are unmetered on standard runners):** Free **2,000** · Pro/Team **3,000** · Enterprise Cloud **50,000**.
- **Billing granularity:** every job is billed per-minute with **partial minutes rounded up to the nearest whole minute**, independently. *(Inference from those two verified primitives: a matrix inflates billed minutes super-linearly on short jobs — see "Matrix builds".)*
- **Storage is a real line item:** artifacts/Packages **$0.25/GB-month** and Actions cache **$0.07/GB-month** beyond the included **500 MB artifacts / 10 GB cache** (Free; Team 2 GB / 10 GB). GitHub's **default artifact retention is 90 days** — set `retention-days` explicitly or upload nothing.
- **Concurrency caps (standard runners):** Free 20 · Pro 40 · Team 60 · Enterprise Cloud 500 (macOS sub-capped at 5). A wide matrix queues behind itself long before it bankrupts you.
- **A scheduled job's cost is independent of whether anyone reads its output.** That is the whole argument for the owner + triage SLA admission gate below.

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

## The CI rung ladder (Axis C) — consume TEST-STRATEGY.md

Tier splitting is stated **policy** at Google (SWE at Google ch. 23: presubmit runs only fast, reliable small tests; large/slow tests deferred to postsubmit; release candidates get the full sweep), and the size↔flakiness link is **measured across 4.2M tests** ("larger tests are more flaky… test it in a different, smaller way"). But *tiering* is a response to a suite that no longer fits the budget — it is not the starting shape.

**C0 is the floor and the complete answer for most projects.** DORA's capability catalog (34 capabilities) contains **no capability tied to pipeline complexity, stage count, environment count, or tool sophistication**, and its *Continuous Integration* capability is exactly: trunk-based development with everyone merging to the mainline **at least daily**, **fixing a broken build takes priority over any other work**, and **automated unit tests** comprehensive enough to give confidence. A single-workflow, single-job pipeline satisfies that completely. What DORA measures is deployment frequency and change lead time — both of which a second stage makes *worse*.

| Rung | What it contains | Entry criteria (ANY one, observable) | Promotion trigger to record when declined |
|---|---|---|---|
| **C0 — the CI floor. Always.** | **One workflow file, one job.** `on: pull_request` + `push: [main]` → lint · typecheck · **the whole test suite** · build. `concurrency: {group: <workflow>-<ref>, cancel-in-progress: true}`. Explicit `retention-days: 7` (or upload no artifacts). Branch ruleset on `main`: require PR + this check, block force-push. The free six below. Delivery invariants: build once / promote the same digest-pinned artifact, one-command rollback, app secrets in the cloud secret manager. **Explicit non-goals: no matrix, no `schedule:` job, no second stage, no environments, no preview envs, no merge queue, no flake-SLA machinery.** | A git repository exists. Applies from the first commit, including a solo weekend project. | — (this is the floor) |
| **C1 — tier the gate** | PR gate keeps lint + types + unit + fast in-process integration + the **3–7 persistent smoke e2e** from TEST-STRATEGY.md (happy paths only), **≤10 min wall clock** — Continuous Delivery's commit stage ("ideally less than five minutes and no more than ten"); DORA: test feedback "in less than ten minutes". Everything else moves to `push: main`. Cut the gate to fit the budget, never stretch the budget. | **C1-a budget breach** — the full suite's measured wall clock exceeds 10 minutes. **C1-b structural impossibility** — a tier *cannot* run on a PR (needs secrets a fork PR can't see, a licensed device farm, a real third-party sandbox, or a URL that only exists after merge). **C1-c cost breach** — projected monthly minutes exceed the plan's included allowance and moving the expensive tier off every-PR is the cheapest fix. | "suite wall clock crosses 10 min" — record today's measured number so the next milestone can compare. |
| **C2 — scheduled jobs** | Up to four independently-triggered jobs (C2-a flake detection · C2-b a suite with nowhere else to live · C2-c dependency/vulnerability drift · C2-d external-contract drift). Each needs its own trigger, a named owner, and a triage SLA — see the next section. | A job that a `pull_request`/`push` job **structurally cannot do**, or wall clock that genuinely has nowhere else to live. None of the four implies the others. | The specific job-to-be-done, named — never "a nightly gives us confidence". |
| **C3 — merge queue** | GitHub merge queue / GitLab merge trains in front of `main`. | Roughly **tens of merges/day to one branch** — "PR passed CI against a stale base" failures have become routine. Below that it is pure latency. | "enable when stale-base failures become routine" (see the merge-queue math below). |

**The explicit non-trigger for C1 — write it into the strategy doc:** *"the post-merge stage is more thorough"* is **not** a reason. Fowler is explicit about the direction: "the commit build is the one that has to be done quickly, as a result it will take a number of shortcuts" — later stages exist to **protect the commit build's speed**, not to add thoroughness. **If the whole suite runs in under ten minutes, one stage is the correct pipeline** and a second stage is pure latency plus spend.

**The under-engineering floor.** C0 is only real if the check actually gates `main` and the suite contains real assertions. A CI workflow that exists but runs against a feature branch instead of the shared mainline, is not a required status check, or wraps a vacuous suite is **CI theatre** — Thoughtworks Radar ring **Hold** (2017): "many developers simply set up a CI server and falsely assume they are 'doing CI' when in reality they miss out on all the benefits." That is an anti-pattern, not a lighter rung.

Tests in the PR gate must hold <1% flake rate or be quarantined out (Google: "as you approach 1% flakiness, the tests begin to lose value").

### Flaky tests — the canon

- **Quarantine from the PR gate but KEEP RUNNING post-merge, with a fix SLA** — Google ch. 23 + Dropbox Athena (the cleanest published implementation).
- **Differentiated retries for diagnosis only** (same-process / time-shifted / different-host, to classify root cause) — GitHub Engineering cut flaky-failure impact 18x this way.
- **NEVER blanket retry-until-green** — Fowler ("Eradicating Non-Determinism in Tests"): rerun-until-green destroys the signal.

### Merge queue trigger

Enable a merge queue at roughly **tens of merges/day to one branch** — when "PR passed CI against a stale base" failures become routine. The math: Uber SubmitQueue (EuroSys 2019) showed **~40% chance of conflict-induced breakage at just 16 concurrent potentially-conflicting changes**. Commodity now: GitHub merge queue GA, GitLab merge trains. Below that volume it's pure latency.

Supporting datapoint on team size: trunkbaseddevelopment.com puts the *branching-mechanics* threshold at **15 or fewer contributors → commit direct to trunk; 16 or more → short-lived feature branches with CI verifying them before they land** (and a branch that lives longer than two days is a long-lived branch). Below ~15 contributors a merge queue answers a question the team does not have.

## When a scheduled job earns its keep (C2)

A `schedule:` job is justified **only** by a job that a `pull_request`/`push` job structurally cannot do, or by wall clock that genuinely has nowhere else to live. Four jobs-to-be-done, four independent triggers:

| C2 job | Trigger (all must hold) | Notes |
|---|---|---|
| **C2-a — flake detection** (repeat the same commit N times; feed the quarantine list) | The project has a quarantine list, **or** ≥1 unexplained red on a commit that later passed unchanged in the last month | **The strongest justification for a schedule.** Flakiness is a statistical property of *repeated runs of the same input*, which no PR-triggered job can produce. Google: **~1.5% of all test runs** report a flaky result, **almost 16% of tests** have some level of flakiness, **~84% of pass→fail transitions involve a flaky test**, and their detection loop cannot classify a breakage "until 3 executions of the test complete." |
| **C2-b — a suite with nowhere else to live** (full e2e portfolio, cross-browser/device, full mutation run) | The post-merge stage's wall clock **exceeds what the team will actually tolerate** (they are already skipping or ignoring it) **AND** the tests still carry value | This is a *slow* job, not a *repetition* job. Ask first whether **`workflow_dispatch`** (run it on demand, before a release) beats a schedule. A nightly is the answer only when the value is in *unattended regular* execution. |
| **C2-c — dependency / vulnerability drift** | The project has third-party dependencies **AND** ships to anyone **AND** the platform's managed scanner does not already cover it | **Usually already solved.** Dependabot takes `schedule: interval` natively (default weekly, Monday 05:00 UTC; GitHub's own advice is to "start with a `daily` schedule until the dependencies are up-to-date, and then drop back to a weekly schedule"). **A hand-rolled nightly `npm audit` workflow is re-implementing a free managed feature.** |
| **C2-d — external-contract drift** (vendor sandbox smoke) | A real third-party integration exists whose breakage you would otherwise learn about **from users** | Non-blocking by construction — never a required check. The vendor's uptime is not your build's health. |

**The admission gate — every scheduled job must additionally have:**

- **a named owner and a triage SLA.** A nightly nobody triages is worse than no nightly: it manufactures a red badge the team is trained to ignore, and then the *real* red is invisible. No owner → the job does not get built.
- **a written answer to "can this ever be red when the last PR run was green?"** If no, the job is a duplicate of the gate and must not be scheduled.

**Platform caveats to record in the strategy doc:**

- **Public repos: "scheduled workflows are automatically disabled when no repository activity has occurred in 60 days."** The dormant projects that most want drift detection are exactly the ones where it silently stops working. Prefer Dependabot, or accept the failure mode knowingly.
- `schedule` has a **5-minute minimum interval** and "**can be delayed during periods of high loads** … which include the start of every hour". So: **never make a scheduled job a release gate**, and don't schedule on `:00`.

**Anti-triggers — name them out loud:**

- "A nightly gives us confidence." *(Confidence in what fact, that the PR gate didn't already establish?)*
- A nightly running a suite that already runs on every PR — it can never be red first.
- A nightly on a repo with fewer commits than schedule firings per week — the schedule fires more often than the code changes; run on `push` instead.
- A cross-OS/cross-version matrix adopted for completeness rather than for a supported-platform promise (below).

## Matrix builds

**Default: no matrix.** One runner, one OS, one runtime version — the one you deploy on.

**A matrix is justified only by a promise you have made to someone:**

- You **publish** a library/CLI and support N runtime versions or M OSes → matrix **exactly the supported set**; the support policy defines the legs, not curiosity.
- Users run your software on OSes you don't develop on (a desktop app, a self-hosted binary).
- A documented compatibility requirement in `PROJECT.md` / the README.

**Not justified by:** "good practice", "we might support Windows later", "the template had it".

**Cost mechanics.** GitHub: "a job will run for each possible combination of the variables" (a 2-variable example yields 6 jobs), and all rates are "billed per-minute with partial minutes rounded to the nearest whole minute". *Inference from those two verified primitives:* every leg rounds up **independently**, so a 6-leg matrix on a 40-second job bills roughly **6 minutes, not 4**, against a 2,000-minute (Free) or 3,000-minute (Pro/Team) monthly allowance. On a private repo an unjustified matrix is one of the fastest ways to eat the free tier.

**Rung-down check:** if a matrix exists and no supported-platform promise backs it, cut it to one leg and record "restore leg X when we promise to support X."

## The delivery rung ladder (Axis D)

"You must be this tall." The invariant at every rung (DORA + SRE Workbook + Charity Majors converge): **small frequent changes through one automated pipeline, fast trustworthy rollback, production observability — these beat pre-prod environment fidelity.** Build once; promote the same digest-pinned artifact with env-attached config (12factor build-release-run).

The rung follows **production-user exposure + blast radius**, never team size alone and never aspiration.

| Rung | Capability justified | Entry criteria |
|---|---|---|
| **D0 — no operated delivery yet** | Deployment is **one command, checked into the repo, documented in the README**, with a **one-command rollback**. That's it. No preview environments, no automated deploy pipeline, no pre-production environment. | **Zero production users** *and* (no deployed service yet **or** the deploy is a single command a human runs). DORA calls deployment automation a real capability ("deploy your software to testing and production environments with the push of a button") — but nothing in the model makes it a day-zero prerequisite, and a project with no users has no deploy risk to mitigate. **Promote to D1 when:** the deploy is run by hand more than ~weekly, or a second person needs to be able to run it, or the first real user arrives. |
| **D1 — one automated deploy path** | Trunk-based + the C0 gate + **one automated deploy path from `main`** + **one-command rollback**; build once, promote the same digest-pinned artifact, config attaches at release. **Conditional, not bundled:** free platform PR previews (Vercel/Netlify/Cloud Run revisions) **only when the platform genuinely gives them for free** — if previews must be *built*, that is a decision with its own trigger; a Neon-class **DB branch per preview** only when previews exist **and** the app has schema-coupled behavior worth previewing. | Real users exist (however few), **or** deploys happen more than ~weekly, **or** more than one person deploys. |
| **D2 — risk controls for high blast radius** | Add: **feature flags** for risky paths (internal-first exposure) + **revertable expand-contract schema changes** (Neon/PlanetScale-style reviewed deploy requests) + a deliberate blue-keep-alive rollback window (AWS: 15–30 min). Still no automated canary analysis — insufficient traffic for signal. | High blast radius — payments, PII, regulated data, or irreversible side effects — **AND real users exposed to it**. Both conjuncts: a pre-launch prototype with zero users does not get the full treatment. |
| **D3 — progressive rollout (weighted, human-judged)** | Shift **5 → 25 → 100%** with a **human gate between steps** and one-command rollback. **No metrics backend required**: Argo Rollouts' basic canary is `setWeight` + `pause` with no analysis configured, and Google Cloud Deploy treats deploy analysis as optional-but-recommended, not intrinsic. | Real users **AND** the platform provides traffic splitting as a built-in (Cloud Run revision weights, ACA revisions, Argo Rollouts, Cloud Deploy canary phases) **AND** somebody watches a dashboard during the rollout. |
| **D4 — automated canary analysis** | Argo `AnalysisTemplate` / Flagger-class automated promotion and rollback. Flagger additionally needs a service mesh (Istio/Linkerd/Kuma/Gateway API) or an ingress controller for traffic shifting. | **ALL of:** traffic **sizeable and long-running enough to be representative**; **an evaluation process that judges good/bad, integrated into the release process** (the requirement most teams skip); a metrics provider actually wired up (Prometheus/Datadog/New Relic/CloudWatch class); deploy frequency exceeding human attention — otherwise D3's human gate is cheaper and better. |
| **D5 — staging environment** *(the TOP rung, and usually never reached)* | A pre-production environment, deliberately ordered **above** progressive delivery — it is not a stepping stone toward it. Majors: "trying to mirror your staging environment to production is a fool's errand"; it catches only known-unknowns; Uber is deprecating it (SLATE, tenancy-isolated test-in-prod). | **Exactly two:** a **risky migration to rehearse**, or a **contractual/regulatory requirement** for a pre-production environment (change approval, segregation of duties). |

**What the SRE Workbook actually requires of a canary (ch. 16 — qualitative, and all required):** the canary must be **representative**, not a token slice — "we need to receive enough traffic … to ensure it has handled a representative sample, and that the system has a chance to react negatively to the inputs"; "it should be sizeable and last long enough … terminating a canary deployment after receiving just a handful of queries doesn't provide a useful signal." Three foundational requirements: a way to deploy to a subset, **an evaluation process** to judge good/bad, and **integration of that evaluation into the release process**. Use "the simplest model that meets your technical and business objectives." Plain blue-green is a "before/after canary" — risky because time is the largest source of metric variance.

**GSD's heuristic for "enough" (ours, not Google's):** ~**a dozen trustworthy, low-variance SLI-derived metrics** and enough real traffic that a **1–5% slice** yields signal. Google publishes **no numeric traffic floor** — the Workbook states the requirement qualitatively only. Use the heuristic as a decision aid, cite the Workbook only for the qualitative requirement it actually states, and below it: rolling deploy + health checks + one-command rollback.

**Cost of the progressive rungs:** AWS puts canary and blue/green at roughly **4× the deploy time** of an in-place deploy, in exchange for "Minimal" failure impact and zero downtime, with blue/green keeping the old environment "idle in case a rollback is needed" — *cited with AWS's own caveat that the page is marked "historical reference only… some content might be outdated."*

**Feature flags are inventory, not a free lunch (D2 honesty note):** Fowler — "toggles introduce complexity"; teams should "view Feature Toggles in their codebase as inventory which comes with a carrying cost and seek to keep that inventory as low as possible", mitigated with expiration dates and "time bombs" that fail tests when a toggle outlives its life. Recommend flags **with** their retirement mechanism, or they become the next over-engineering surface.

## Publishing packages — the deploy ladder for shipped software

When the product ships as packages/binaries (CLI, library, SDK), the "deployment ladder" IS the publishing pipeline:

- **Tag-driven releases**: version tag → one release workflow builds, tests, publishes everything (never publish from a laptop; never build different artifacts per registry from different commits).
- **PyPI: Trusted Publishing** (OIDC — the official PyPA standard): no long-lived API tokens; the workflow identity is the credential, with the repo/workflow pinned on the PyPI side (the publishing analog of the pinned `sub`).
- **npm: `npm publish --provenance`** on CI — provenance attestation links the package to its source commit and workflow.
- **crates.io: scoped tokens** (no OIDC support yet) — token scoped to the crate(s), stored in an **environment-protected secret** with required reviewers on the release environment; rotate on release-process changes.
- **Signed/attested artifacts**: GitHub artifact attestations (free) or cargo-dist/goreleaser-class tooling for binaries + checksums; full cosign ceremony stays deferred until artifacts cross trust boundaries.
- **Release environment protection + manual dispatch** for anything that spends money or publishes — doubles as the fork-PR secrets-safety rule (publish workflows never run on fork PRs).

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
| A nightly with nothing it can be red for that the gate wasn't | A schedule that duplicates the PR gate can never fail first; it only manufactures a badge |
| A scheduled job with no named owner and no triage SLA | An untriaged red trains the team to ignore red — then the *real* red is invisible |
| A hand-rolled nightly dependency audit | Dependabot schedules natively (`schedule: interval`, default weekly Mon 05:00 UTC) — this re-implements a free managed feature |
| A matrix leg with no supported-platform promise | Each combination is a separately billed job, each rounding partial minutes up independently |
| Default 90-day artifact retention on a Free-tier repo | Artifacts bill $0.25/GB-month past the included 500 MB — set `retention-days` explicitly |
| A second pipeline stage adopted "for thoroughness" | Fowler: later stages exist to protect the **commit build's speed**, not to add thoroughness. Under ten minutes, one stage is the correct pipeline |
| **CI theatre** — the canonical UNDER-engineering anti-pattern | Thoughtworks Radar, ring **Hold** (2017): a CI server that exists while the team misses every benefit — infrequent commits to mainline, insufficient test coverage, prolonged build failures, CI run against feature branches instead of the shared mainline |

## The meta-tell

If you cannot point to a **current, concrete requirement** — a measured suite over ten minutes, a tier that structurally cannot run on a PR, a flake you have actually seen, a supported-platform promise, tens of merges/day, real users behind a risky path, an evaluation process wired into the release, a migration to rehearse or a compliance mandate — that justifies a rung **above C0 / D0**, you are over-engineering: **drop to the floor and record the trigger**. If such a requirement exists and you parked it on the floor anyway (a known-flaky suite handled by re-running until green, real users on a payments path with no revertable schema route, a CI check that isn't required on `main`), you are under-engineering: **raise that one capability — and only that one.**

## Consumes / produces

- **Consumes** `TEST-STRATEGY.md` (the tiers and the persistent smoke list → the PR gate's contents), `INFRA-STRATEGY.md` (target cloud → OIDC provider, secret manager, deploy target, whether a production environment exists at all), and `SECURITY-STRATEGY.md` (data classification / regulated flows → **blast radius**, so it is never re-interviewed). If TEST-STRATEGY is absent, suggest `/gsd:testing-strategy` first; proceed with generic small/medium/large tiers if declined.
- **Produces** `.planning/CICD-STRATEGY.md` — platform, auth, secrets split, the **CI rung (Axis C)** and **delivery rung (Axis D)** with the forcing fact for each non-floor rung, the pipeline map, flaky policy, supply-chain checklist, and the deferred list with triggers. Feeds `plan-phase` (CI/deploy phases plan against it).
