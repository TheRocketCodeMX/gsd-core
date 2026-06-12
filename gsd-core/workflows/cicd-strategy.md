<purpose>
Recommend a CI/CD strategy matched to the test strategy, the target infrastructure, and the team: WHERE CI runs, HOW it authenticates, WHICH test tiers gate which stage, and HOW deploys promote. GitHub Actions is the default platform; OIDC with a pinned `sub` is the default auth; the deployment ladder rung follows team size + blast radius — never aspiration. Runs after testing-strategy, before planning. Produces `.planning/CICD-STRATEGY.md`, consumed by plan-phase.
</purpose>

<required_reading>
@~/.claude/gsd-core/references/cicd-strategy.md
@~/.claude/gsd-core/templates/cicd-strategy.md
</required_reading>

<process>

## Step 1: Initialize

```bash
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; if [ -f "$GSD_TOOLS" ]; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif command -v gsd-tools >/dev/null 2>&1; then GSD_TOOLS="$(command -v gsd-tools)"; gsd_run() { "$GSD_TOOLS" "$@"; }; elif [ -f "$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and gsd-tools is not on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi
COMMIT_DOCS=$(gsd_run query config-get commit_docs 2>/dev/null || echo "true")
RESPONSE_LANG=$(gsd_run query config-get response_language 2>/dev/null || true)
ls .planning/PROJECT.md >/dev/null 2>&1 && echo "PROJECT_FOUND" || echo "NO_PROJECT"
ls .planning/TEST-STRATEGY.md >/dev/null 2>&1 && echo "HAS_TEST_STRATEGY" || echo "NO_TEST_STRATEGY"
ls .planning/INFRA-STRATEGY.md >/dev/null 2>&1 && echo "HAS_INFRA_STRATEGY" || echo "NO_INFRA_STRATEGY"
ls .planning/CICD-STRATEGY.md >/dev/null 2>&1 && echo "EXISTS" || echo "NEW"
```

**If `NO_PROJECT`:** Stop — "No project found. Run /gsd:new-project first." Exit.

**If `RESPONSE_LANG` non-empty:** all user-facing text in that language; keep technical terms, code, and stage names (PR gate / merge / nightly, OIDC, `sub`) in English.

**Text mode** (`--text` OR `workflow.text_mode: true`): replace every `AskUserQuestion` with a plain-text numbered list.

**If `EXISTS` and not `--auto`:** ask Update / View / Skip (header "Strategy"). On Skip: exit ("Existing CICD-STRATEGY.md preserved."). On View: show then Update/Skip.

## Step 2: Load context

```bash
cat .planning/TEST-STRATEGY.md 2>/dev/null || true
cat .planning/INFRA-STRATEGY.md 2>/dev/null || true
cat .planning/adr/*.md 2>/dev/null || true
cat .planning/PROJECT.md 2>/dev/null || true
```

**Read `@~/.claude/gsd-core/references/cicd-strategy.md` now** — it defines the GHA-default platform decision, OIDC-with-pinned-`sub`, the secrets split, the tier→stage mapping with the ≤10-min PR budget, the flaky canon, the merge-queue trigger, the deployment ladder, the free-six supply-chain table stakes, and the anti-pattern table.

**Grounding maturity governs elicitation depth.** When upstream artifacts (spec, ADR, strategies, research) already answer a step, draft-from-docs and present for confirmation — cite the source, don't re-interview. Reserve questions for genuine decision points and contradictions. Honor a posture stated in `$ARGUMENTS` without re-asking.


**If `NO_TEST_STRATEGY`:** tell the user "No test strategy found — the pipeline mapping is much better with one. (Consider `/gsd:testing-strategy` first.)" If they decline, proceed with generic tiers (small/unit → PR; medium/integration → merge; large/e2e → nightly) and note the gap in the output. From TEST-STRATEGY.md, extract: the per-subdomain level emphasis, the persistent e2e smoke list (the 3–7 flows), and the mutation-testing targets. From INFRA-STRATEGY.md / ADR / PROJECT.md, extract: target cloud + deploy target, repo host, team size, and blast radius (payments/PII/data = high). Ask only what's missing (header "Context"): team size, blast radius, expected merge volume.

## Step 3: Platform choice

**Default: GitHub Actions** — 41% org adoption, the ecosystem, merge queue, OIDC into all three clouds endorsed by AWS's and Google's own blogs. Recommend it whenever the repo is on GitHub.

**If the user wants cloud-native CI (Cloud Build / CodeBuild) — push back unless they have a real reason:** "Cloud-native CI is a deliberate exception, not a default — even AWS publishes first-class GitHub Actions → AWS paths. The two reasons that justify it: (1) VPC-isolated/regulated builds that must run inside a private network or compliance boundary, (2) cheap compute behind GHA (e.g., CodeBuild hosting GHA runner jobs). Do either apply?" If yes — **honor it**: that's exactly the carve-out (record which reason). If no, recommend GHA and record their final choice either way.

**The reverse holds too:** if the user has a genuine VPC/regulatory constraint and you were about to recommend GHA hosted runners, the cloud-native exception (or self-hosted runners in their VPC behind GHA) is the right call — don't dogmatically default.

Pricing context if cost comes up: GHA Linux $0.006/min (2,000–3,000 free min/mo), Cloud Build $0.006/min + 2,500 free min/mo, Azure $40/parallel-job unlimited minutes. Stay on hosted runners until the bill clears the free tier plus low-hundreds $/mo; then managed third-party runners before DIY self-hosted; never self-hosted on public repos.

## Step 4: Auth + secrets

**Recommendation: OIDC/WIF with a pinned `sub` condition (repo + branch/environment) — zero long-lived cloud keys in CI.** Always state the caveat: ~1,500 cloud roles have been found assumable by *any* GitHub repo due to missing/wildcard `sub` conditions — bare "OIDC" is not the recommendation; **pinned-`sub` OIDC** is.

**If the user says "we'll just put the service-account JSON in GitHub secrets" — push back:** "That's the exact pattern the CircleCI 2023 breach turned into a rotate-everything-everywhere incident, and GitGuardian finds 70% of leaked secrets still valid 2+ years later. Google, AWS, GitHub, and Microsoft all recommend OIDC federation instead — short-lived tokens, valid for a single job, nothing to steal. It's ~30 minutes of setup. Is there a target here that genuinely can't do federation?" Only if the target truly can't federate (legacy/3rd-party SaaS): a short-lived, scoped, rotated secret in CI secrets is the documented fallback.

**The secrets split (record it as a table):**
- Cloud deploy creds → nowhere (OIDC mints them per job).
- CI-scoped secrets → CI platform secrets ONLY when OIDC is unavailable for that target.
- Application secrets → ALWAYS the cloud secret manager, injected at runtime — **never baked into images, never a committed `.env`**.

## Step 5: Pipeline design (map TEST-STRATEGY tiers to stages)

Map the tiers from TEST-STRATEGY.md onto the three stages (this is Google's stated presubmit/postsubmit policy, and size↔flakiness is measured across 4.2M tests):

- **PR gate — ≤10 min wall clock (hard budget; CD book + DORA canon):** lint, types, small (unit), fast in-process medium, and the **persistent smoke e2e list from TEST-STRATEGY.md (3–7 flows, happy paths only)**. If the suite doesn't fit, cut the gate — don't stretch the budget.
- **Merge to main:** full medium suite + e2e subset against a real (preview/ephemeral) environment.
- **Nightly / pre-release:** full e2e portfolio, long suites, cross-browser/device, and the **mutation run** (Stryker targets from TEST-STRATEGY.md).

**Flaky policy (record it):** PR-gate tests must hold <1% flake rate; flaky tests are **quarantined from the PR gate but keep running post-merge with a fix SLA** (Google/Dropbox pattern). Differentiated retries (same-process / time-shifted / different-host) for *diagnosis* only. If the user asks for automatic retry-until-green on the gate, push back: blanket retries destroy the signal (Fowler) — quarantine + diagnose instead.

**Merge queue:** recommend only at ~tens of merges/day to one branch (Uber measured ~40% conflict-breakage odds at just 16 concurrent conflicting changes). Below that volume it's pure latency — record the trigger ("enable when stale-base failures become routine") instead of enabling now.

## Step 6: Deployment ladder rung

**Shipped-software route:** if the product ships as packages/binaries rather than an operated service, the ladder rung IS the publishing pipeline — walk the reference's "Publishing packages" section instead (tag-driven releases, PyPI Trusted Publishing, npm provenance, crates.io scoped+environment-protected tokens, attestations, fork-PR exclusion). The service ladder applies only to any future hosted tier, as promotion-trigger material.

Pick the rung from **team size + blast radius** (from Step 2), using the reference's ladder. Build-once/promote-same-artifact and one-command rollback are invariants at every rung.

- **Solo/small, low blast radius:** trunk-based + one automated deploy path + free platform PR previews (+ Neon-style DB branch per preview if Postgres) + one-command rollback. **No staging environment.**
- **High blast radius (payments/data) at any small size:** add feature flags (internal-first exposure) + revertable expand-contract schema changes + a deliberate blue-keep-alive rollback window.
- **~10 people:** previews for every PR incl. backend, real flag hygiene, DORA metrics, manual canary.
- **~50 / high traffic:** automated canary analysis.

**Scripted pushback — "we need a staging environment" (solo dev):** "Staging catches only known-unknowns, and mirroring it to prod is — per Charity Majors — a fool's errand; Uber is actively deprecating staging. For a team your size the evidence-backed spend is PR previews + one-command rollback + production observability. The one exception worth a thin pre-prod: rehearsing a risky migration. Does that apply here?" Honor a genuine migration-rehearsal or compliance need.

**Scripted pushback — "let's add canary deployments" without SLIs:** "Canary *analysis* has prerequisites (SRE Workbook): ~a dozen trustworthy low-variance SLIs and enough real traffic that a 1–5% slice yields signal. Without those it's automation theater on noise. Until then: rolling deploy + health checks + one-command rollback, and feature flags give you progressive exposure more simply. Do you have the SLIs and traffic today?" Record canary as a deferred item with its promotion trigger.

## Step 7: Supply-chain table stakes

Recommend the **free six** — each ≤ hours of work, each counters a real 2023–25 attack: (1) SHA-pin all actions + Dependabot pin updates (tj-actions CVE-2025-30066: moved tags, 23k+ repos), (2) lockfile + `npm ci` (Shai-Hulud worm), (3) top-level read-only `permissions:` / read-only `GITHUB_TOKEN` default, (4) OIDC zero-long-lived-keys (CircleCI breach), (5) push protection + secret scanning + no `.env` in repo, (6) branch ruleset on main (PR + checks, no force-push). Plus: never `pull_request_target` with untrusted checkout; never self-hosted runners on public repos.

**Defer the ceremony** (record as deferred, with triggers): SLSA L3, cosign-signing internal artifacts, SBOM programs beyond the free SPDX export, org-wide Scorecard dashboards, self-hosted runner fleets. If publishing packages, take the free provenance win (`npm publish --provenance`).

## Step 8: Over/under-engineering meta-tell check

Before writing, audit every choice against the meta-tell: **if you cannot point to a current, concrete requirement justifying a capability** — a real compliance boundary for cloud-native CI, real merge volume for a queue, real SLIs+traffic for canary, a real migration to rehearse for pre-prod — **it's over-engineering: defer it with a recorded trigger.** Conversely, if a concrete requirement exists and the strategy ignores it — high blast radius with no flags/revertable schema path, a target that can't federate with no rotation plan, >10 merges/day with no queue — **that's under-engineering: fix it now.**

## Step 9: Write CICD-STRATEGY.md

Render `@~/.claude/gsd-core/templates/cicd-strategy.md` (fill `[DATE]`, `[PROJECT_TITLE]`). Fill: platform + why, auth method (OIDC config incl. the `sub` condition), the secrets table, the pipeline map with time budgets, the flaky policy, the ladder rung + promotion triggers, the supply-chain checklist, anti-patterns acknowledged, deferred items, and handoff notes for plan-phase.

Write to `.planning/CICD-STRATEGY.md`.

## Step 10: Commit

```bash
if [ "$COMMIT_DOCS" = "true" ]; then
  gsd_run query commit "docs: add CI/CD strategy (pipeline follows test strategy)" --files .planning/CICD-STRATEGY.md
else
  echo "CICD-STRATEGY.md written but not committed (commit_docs is false)."
fi
```

## Step 11: Wrap up

Display:
```
CICD-STRATEGY.md written — pipeline mapped to the test strategy.

  Platform: [GitHub Actions] · Auth: [OIDC, sub pinned to repo+env]
  PR gate (≤10 min): [unit + fast integration + N smoke e2e]
  Ladder rung: [solo: trunk + previews + rollback — no staging]
  Supply chain: [6/6 free table stakes] · Deferred: [SLSA L3, cosign, canary]

Next: /gsd:plan-phase   (CI/deploy phases will plan against this strategy)
```

**Strategy-chain completion (this is the chain's last link — close the loop):**
1. **Synthesis table** — if other strategy artifacts exist (`PRODUCT-BRIEF`, `DOMAIN-MODEL`, `adr/*`, `TEST-STRATEGY`, `INFRA-STRATEGY`), display a one-line-per-artifact decision summary so the user sees the whole strategized picture in one place.
2. **Final roadmap reconciliation** — scan ROADMAP.md against ALL strategy artifacts (not just this one): phases straddling module seams, build-phases mooted by buy-decisions, missing walking skeleton, CI/release work unaccounted for. Surface every contradiction explicitly and offer `/gsd:phase --edit` or a roadmap refresh — never end the chain with a known contradiction unspoken.
3. Remind the user the artifacts are now canonical references: the planner must read them and the plan-checker raises HIGH on contradiction.
4. If the session is long, suggest a fresh session for the build loop (`/gsd:discuss-phase`) — the artifacts carry the full state.

</process>

<critical_rules>
- **GitHub Actions by default; cloud-native CI only as a deliberate exception** (VPC/regulatory isolation, or cheap compute behind GHA) — and honor the exception when the reason is real.
- **Never bare "OIDC" — always OIDC with a pinned `sub` condition** (repo + branch/environment). Long-lived cloud keys in CI only when federation is genuinely impossible, then short-lived/scoped/rotated.
- **App secrets live in the cloud secret manager, runtime-injected — never in images, never a committed `.env`.** CI platform secrets hold CI-scoped values only.
- **The PR gate is ≤10 minutes.** Cut the gate to fit the budget, never the reverse. Quarantine flakes from the gate but keep them running post-merge; never blanket retry-until-green.
- **Ladder rung follows team size + blast radius, not aspiration.** No staging for a solo dev (except migration rehearsal); no canary analysis without ~a dozen trustworthy SLIs + real traffic. Record promotion triggers for everything deferred.
- **Recommend, don't dictate.** Present trade-offs with rationale; the user has context you lack. Respect `commit_docs` / `response_language`.
</critical_rules>

<success_criteria>
- TEST-STRATEGY.md (or generic tiers, gap noted) + INFRA-STRATEGY/ADR context loaded; team size + blast radius established
- Platform chosen with rationale (GHA default; any cloud-native exception justified by VPC/regulatory or compute-behind-GHA)
- Auth recorded as pinned-`sub` OIDC (or the documented fallback with rotation); secrets split table filled
- Pipeline map: PR gate ≤10 min (unit + fast medium + 3–7 smoke e2e), merge, nightly+mutation; flaky quarantine policy + merge-queue trigger recorded
- Deployment ladder rung matched to team size + blast radius; staging/canary pushbacks applied; promotion triggers recorded
- The free-six supply-chain table stakes recommended; SLSA/cosign/SBOM ceremony deferred with triggers
- Meta-tell check passed (no capability without a current concrete requirement; no ignored requirement)
- CICD-STRATEGY.md written and committed (when commit_docs is true)
- User directed to /gsd:plan-phase
</success_criteria>
