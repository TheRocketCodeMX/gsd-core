# CI/CD Strategy — [PROJECT_TITLE]

**Created:** [DATE] via `/gsd:cicd-strategy`
**Basis:** `TEST-STRATEGY.md` (tiers + smoke list) · `INFRA-STRATEGY.md` / ADR (target cloud) · `SECURITY-STRATEGY.md` (data classification → blast radius).

## Rungs

- **CI rung (Axis C):** [C0 — one workflow, one job] — forcing fact for anything above C0: [n/a]
- **Delivery rung (Axis D):** [D0 — one-command deploy, no prod users] — forcing fact for anything above D0: [n/a]
- **Suite wall clock:** [N min, measured YYYY-MM-DD | unmeasured — no suite yet; assume under budget, re-measure at the first milestone with a real suite]
- **Merges/week:** [N, from `git log --first-parent`] · **Contributors (90d):** [N, from `git shortlog -sn HEAD`]
- **Production users:** [none yet | a handful of internal/pilot users | real external users]
- **Deploy cadence aimed for:** [whenever it's ready | weekly | release train]

## CI platform

- **Chosen:** [GitHub Actions]
- **Why:** [default — repo on GitHub, ecosystem + OIDC into the target cloud / OR the deliberate exception: VPC-isolated/regulated builds → Cloud Build/CodeBuild, or cheap compute behind GHA]
- **Runners:** [hosted, until bill > free tier + low-hundreds $/mo → managed third-party before DIY; never self-hosted on public repos]

## Auth (CI → cloud)

- **Method:** [OIDC / Workload Identity Federation — zero long-lived cloud keys]
- **`sub` condition (MANDATORY):** [pinned to `repo:ORG/REPO` + `environment:prod` / branch — never wildcard]
- **Fallback (only where federation impossible):** [target + short-lived scoped secret, rotation cadence]

## Secrets

| Secret | Lives where | Injected how |
|--------|-------------|--------------|
| Cloud deploy creds | nowhere — OIDC mints per job | short-lived token |
| [CI-scoped token, e.g. SaaS API] | CI platform secrets (only because OIDC unavailable) | env at job start |
| [app secrets — DB url, API keys] | cloud secret manager | runtime injection — never in images, never committed `.env` |

## Pipeline map (tiers → stages)

| Stage | Trigger | What runs | Time budget |
|-------|---------|-----------|-------------|
| PR gate | `on: pull_request` + `push: [main]` | lint + types + the whole suite (small + fast medium + smoke e2e: [N flows from TEST-STRATEGY]) + build | **≤10 min** |

<!-- C0 is ONE stage. Add a second row ONLY if a C1 trigger fired (suite >10 min measured · a tier
     that structurally can't run on a PR · included-minutes breach) — and name that trigger in the
     row. Add a scheduled row ONLY per C2, and name the job (C2-a/b/c/d), its OWNER, and its TRIAGE
     SLA in the row. "It's more thorough" is not a trigger. -->

- **Concurrency:** [`cancel-in-progress: true` on the PR ref]
- **Matrix:** [none — no supported-platform promise / OR: legs = the exact supported set, promise = [where it's documented]]
- **Merge queue:** [off — trigger: ~tens of merges/day / stale-base failures routine]

## Flaky-test policy

- [No flakes observed yet — policy on first occurrence:] PR-gate tests hold <1% flake rate; flakes **quarantined from the gate, kept running post-merge**, fix SLA: [N days].
- Differentiated retries for diagnosis only. **No blanket retry-until-green, ever.**

## Delivery ladder (Axis D)

| Rung | Forcing fact | What that buys |
|------|--------------|----------------|
| [D0 — one-command deploy, documented, one-command rollback] | [zero production users; deploy is one command a human runs] | [no pipeline to maintain] |

<!-- One row per rung actually adopted. An above-floor rung without a forcing fact is over-engineering:
     delete it and move it to Deferred. D1 automated deploy · D2 flags/expand-contract/blue-keep-alive
     (needs high blast radius AND real users) · D3 weighted rollout with a human gate · D4 automated
     canary analysis · D5 staging (top rung: a migration to rehearse or a compliance mandate). -->

- **Conditional at D1:** [PR previews — only if the platform gives them free] · [DB branch per preview — only if previews exist AND behavior is schema-coupled]
- **Flag retirement mechanism (if flags are on):** [expiry dates / test time-bombs — flags are inventory with a carrying cost]
- **Invariants at every rung:** build once, promote the same digest-pinned artifact; one-command rollback; config attaches at release.

## Supply-chain checklist (the free six + two free floor items)

- [ ] SHA-pin all actions + Dependabot updating pins
- [ ] Committed lockfile + `npm ci`
- [ ] Top-level read-only `permissions:` / read-only `GITHUB_TOKEN` default
- [ ] OIDC — zero long-lived cloud keys in CI
- [ ] Push protection + secret scanning; no `.env` in repo
- [ ] Branch ruleset on main: PR + status checks, no force-push
- [ ] Artifact retention set explicitly (the platform default is 90 days and is billable)
- [ ] `concurrency: cancel-in-progress` on the PR ref

Never: `pull_request_target` + untrusted checkout · self-hosted runners on public repos.

## Cost guardrails

- **Est. monthly minutes:** [stages × matrix legs × merges/week × duration] vs [plan allowance: Free 2,000 / Pro-Team 3,000]
- **Artifact + cache storage:** [GB] vs [included 500 MB artifacts / 10 GB cache on Free]

## Anti-patterns acknowledged

- [long-lived keys in CI · secrets in images/.env · per-env artifacts · heavy e2e PR gate · retry-until-green · tag-pinned actions · wildcard OIDC `sub` · staging-as-safety-strategy · a nightly that duplicates the gate · an unowned scheduled job · a matrix with no support promise · **CI theatre** (a check that doesn't gate `main`) — see reference]

## Deferred (with triggers)

The floor's explicit non-goals — **decided, not forgotten**:

- **nightly / any `schedule:` job** — [trigger: a C2-a/b/c/d job-to-be-done + a named owner + a triage SLA]
- **matrix** — [trigger: a supported-platform promise we've actually made]
- **merge queue** — [trigger: ~tens of merges/day; stale-base failures routine]
- **preview environments** — [trigger: the platform gives them free]
- **canary analysis (D4)** — [trigger: representative traffic + an evaluation process wired into the release + a metrics provider]
- **staging (D5)** — [trigger: a risky migration to rehearse, or a compliance mandate]
- [SLSA L3 — when artifacts cross trust boundaries · cosign — when there's a verifier · SBOM program — when a customer/regulator asks]

## Handoff notes for plan-phase

- [CI workflow files to create, the OIDC role/WIF pool to provision, secret-manager entries, preview-env wiring, which phase owns each]

---
*CI/CD strategy. Consumed by `/gsd:plan-phase` (CI/deploy phases plan against it).*
