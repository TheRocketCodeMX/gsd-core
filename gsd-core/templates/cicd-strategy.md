# CI/CD Strategy — [PROJECT_TITLE]

**Created:** [DATE] via `/gsd:cicd-strategy`
**Basis:** `TEST-STRATEGY.md` (tiers + smoke list) · `INFRA-STRATEGY.md` / ADR (target cloud).

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

| Stage | What runs | Time budget |
|-------|-----------|-------------|
| PR gate | lint + types + small (unit) + fast medium + smoke e2e: [N flows from TEST-STRATEGY] | **≤10 min** |
| Merge to main | full medium + e2e subset vs [preview/ephemeral env] | [~X min] |
| Nightly / pre-release | full e2e portfolio + long suites + mutation run (Stryker on [targets]) | unbounded |

- **Merge queue:** [off — trigger: ~tens of merges/day / stale-base failures routine]

## Flaky-test policy

- PR-gate tests hold <1% flake rate; flakes **quarantined from the gate, kept running post-merge**, fix SLA: [N days].
- Differentiated retries for diagnosis only. **No blanket retry-until-green.**

## Deployment ladder

- **Rung:** [solo/low blast radius — trunk-based + PR previews + one-command rollback; NO staging]
- **Blast-radius additions:** [feature flags internal-first / revertable expand-contract schema changes / blue-keep-alive window — or n/a]
- **Promotion triggers:** [staging-thin: risky migration to rehearse · canary analysis: ~a dozen trustworthy SLIs + traffic signal on 1–5% slice · merge queue: see above]
- **Invariants:** build once, promote the same digest-pinned artifact; one-command rollback; config attaches at release.

## Supply-chain checklist (the free six)

- [ ] SHA-pin all actions + Dependabot updating pins
- [ ] Committed lockfile + `npm ci`
- [ ] Top-level read-only `permissions:` / read-only `GITHUB_TOKEN` default
- [ ] OIDC — zero long-lived cloud keys in CI
- [ ] Push protection + secret scanning; no `.env` in repo
- [ ] Branch ruleset on main: PR + status checks, no force-push

Never: `pull_request_target` + untrusted checkout · self-hosted runners on public repos.

## Anti-patterns acknowledged

- [long-lived keys in CI · secrets in images/.env · per-env artifacts · heavy e2e PR gate · retry-until-green · tag-pinned actions · wildcard OIDC `sub` · staging-as-safety-strategy — see reference]

## Deferred (with triggers)

- [SLSA L3 — when artifacts cross trust boundaries · cosign — when there's a verifier · SBOM program — when a customer/regulator asks · canary analysis — SLIs + traffic · staging — migration rehearsal]

## Handoff notes for plan-phase

- [CI workflow files to create, the OIDC role/WIF pool to provision, secret-manager entries, preview-env wiring, which phase owns each]

---
*CI/CD strategy. Consumed by `/gsd:plan-phase` (CI/deploy phases plan against it).*
