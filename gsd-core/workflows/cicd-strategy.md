<purpose>
Recommend a right-sized CI/CD strategy matched to the test strategy, the target infrastructure, and the team: WHERE CI runs, HOW it authenticates, WHAT automation runs and when, and HOW deploys promote. Two independent ladders: **the CI rung ladder (Axis C) and the delivery rung ladder (Axis D) — the floor is one workflow, one job; every rung above it must name the fact forcing it.** GitHub Actions is the default platform; OIDC with a pinned `sub` is the default auth; the delivery rung follows **production-user exposure** + blast radius — never aspiration. Runs after testing-strategy, before planning. Produces `.planning/CICD-STRATEGY.md`, consumed by plan-phase.
</purpose>

<required_reading>
@~/.claude/gsd-core/references/cicd-strategy.md
@~/.claude/gsd-core/references/brownfield-adaptation.md
@~/.claude/gsd-core/templates/cicd-strategy.md
</required_reading>

<process>

## Step 1: Initialize

```bash
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; if [ -f "$GSD_TOOLS" ]; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.codex/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.codex/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif command -v gsd-tools >/dev/null 2>&1; then GSD_TOOLS="$(command -v gsd-tools)"; gsd_run() { "$GSD_TOOLS" "$@"; }; elif [ -f "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${HERMES_HOME:-$HOME/.hermes}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${HERMES_HOME:-$HOME/.hermes}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CURSOR_CONFIG_DIR:-$HOME/.cursor}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CURSOR_CONFIG_DIR:-$HOME/.cursor}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CODEX_HOME:-$HOME/.codex}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CODEX_HOME:-$HOME/.codex}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${GEMINI_CONFIG_DIR:-$HOME/.gemini}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${GEMINI_CONFIG_DIR:-$HOME/.gemini}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${COPILOT_CONFIG_DIR:-$HOME/.copilot}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${COPILOT_CONFIG_DIR:-$HOME/.copilot}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${WINDSURF_CONFIG_DIR:-$HOME/.codeium/windsurf}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${WINDSURF_CONFIG_DIR:-$HOME/.codeium/windsurf}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${AUGMENT_CONFIG_DIR:-$HOME/.augment}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${AUGMENT_CONFIG_DIR:-$HOME/.augment}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${TRAE_CONFIG_DIR:-$HOME/.trae}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${TRAE_CONFIG_DIR:-$HOME/.trae}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${QWEN_CONFIG_DIR:-$HOME/.qwen}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${QWEN_CONFIG_DIR:-$HOME/.qwen}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CODEBUDDY_CONFIG_DIR:-$HOME/.codebuddy}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CODEBUDDY_CONFIG_DIR:-$HOME/.codebuddy}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CLINE_CONFIG_DIR:-$HOME/.cline}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CLINE_CONFIG_DIR:-$HOME/.cline}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${GROK_AGENTS_HOME:-$HOME/.agents}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${GROK_AGENTS_HOME:-$HOME/.agents}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${ANTIGRAVITY_CONFIG_DIR:-$HOME/.gemini/antigravity}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${ANTIGRAVITY_CONFIG_DIR:-$HOME/.gemini/antigravity}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${KILO_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/kilo}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${KILO_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/kilo}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and gsd-tools is not on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi; if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -n "${GSD_TOOLS:-}" ]; then printf "export PATH='%s':\"\$PATH\"\n" "${GSD_TOOLS%/*}" >> "$CLAUDE_ENV_FILE" 2>/dev/null || true; fi
COMMIT_DOCS=$(gsd_run query config-get commit_docs 2>/dev/null || echo "true")
RESPONSE_LANG=$(gsd_run query config-get response_language 2>/dev/null || true)
ls .planning/PROJECT.md >/dev/null 2>&1 && echo "PROJECT_FOUND" || echo "NO_PROJECT"
ls .planning/TEST-STRATEGY.md >/dev/null 2>&1 && echo "HAS_TEST_STRATEGY" || echo "NO_TEST_STRATEGY"
ls .planning/INFRA-STRATEGY.md >/dev/null 2>&1 && echo "HAS_INFRA_STRATEGY" || echo "NO_INFRA_STRATEGY"
ls .planning/CICD-STRATEGY.md >/dev/null 2>&1 && echo "EXISTS" || echo "NEW"
```

**If `NO_PROJECT`:** Stop — "No project found. Run /gsd:new-project first." Exit.

**If `RESPONSE_LANG` non-empty:** all user-facing text in that language; keep technical terms, code, rung labels (C0–C3 / D0–D5) and stage names (PR gate / post-merge, OIDC, `sub`) in English.

**Text mode** (`--text` OR `workflow.text_mode: true`): replace every `AskUserQuestion` with a plain-text numbered list.

**If `EXISTS` and not `--auto`:** ask Update / View / Skip (header "Strategy"). On Skip: exit ("Existing CICD-STRATEGY.md preserved."). On View: show then Update/Skip.

## Step 2: Load context

```bash
cat .planning/TEST-STRATEGY.md 2>/dev/null || true
cat .planning/INFRA-STRATEGY.md 2>/dev/null || true
cat .planning/SECURITY-STRATEGY.md 2>/dev/null || true   # authoritative for data classification → BLAST RADIUS. Never re-interview what this already answers.
cat .planning/adr/*.md 2>/dev/null || true
cat .planning/PROJECT.md 2>/dev/null || true
cat .planning/codebase/STACK.md 2>/dev/null || true
ls .planning/codebase/STACK.md >/dev/null 2>&1 && echo "HAS_MAPS" || echo "NO_MAPS"   # plus the ## Mode block cat'd above — Origin is authoritative
# ── MEASURE, don't ask (§ Step 2.5). A number derived from the repo beats a number the user guesses.
echo "MERGES_90D=$(git log --since='90 days ago' --first-parent --oneline HEAD 2>/dev/null | wc -l)"   # ÷13 → merges/week (the C3 trigger)
echo "CONTRIBUTORS_90D=$(git shortlog -sn --since='90 days ago' HEAD 2>/dev/null | wc -l)"              # the TBD 15-vs-16 threshold (HEAD is required — without a revision shortlog reads stdin and always returns 0)
ls .github/workflows/ 2>/dev/null || echo "NO_CI_YET"                                                    # brownfield CI surface
grep -rl "schedule:" .github/workflows/ 2>/dev/null || true                                              # existing scheduled jobs
grep -rl "matrix:" .github/workflows/ 2>/dev/null || true                                                # existing matrix legs
ls .github/dependabot.yml >/dev/null 2>&1 && echo "HAS_DEPENDABOT" || echo "NO_DEPENDABOT"               # if present, C2-c is already closed
```

**Brownfield mode (existing pipeline).** Trigger when `## Mode` records Origin = brownfield-extend / rewrite-refactor (authoritative), or — when `## Mode` is absent — `HAS_MAPS`/CI-config already exists. Then **read `@~/.claude/gsd-core/references/brownfield-adaptation.md` now** and recommend a **transition plan**, not a rip-and-replace: **audit the existing pipeline** (from STACK.md + the CI config) against the **CI rung ladder** (Step 4.5), the **≤10-min PR budget** (Step 5), the **matrix check** (Step 5.5), and the **pinned-`sub` OIDC / secrets** standard (Step 4). Recommend incremental fixes via **decision cards** (current → target → gap cost → Follow / Improve / Refactor), e.g. "15-min gate → split to PR-smoke + a post-merge stage (C1-a fired)," "scheduled job with no owner → delete it or name an owner + SLA," "matrix with no support promise → cut to one leg," "long-lived service-account key → OIDC federation," "moved-tag actions → SHA-pin." **Rung-down is a legitimate decision card**: an existing capability with no forcing fact should be removed, not grandfathered. **Default-select Improve**; sequence the changes (don't enable everything at once). Greenfield (no map, no pipeline) keeps the from-scratch pipeline design below as the default.

**Read `@~/.claude/gsd-core/references/cicd-strategy.md` now** — it defines the GHA-default platform decision, OIDC-with-pinned-`sub`, the secrets split, **the CI rung ladder (Axis C: C0–C3) with the ≤10-min PR budget**, when a scheduled job earns its keep, the matrix gate, the flaky canon, the merge-queue trigger, **the delivery rung ladder (Axis D: D0–D5)**, the free-six supply-chain table stakes, the anti-pattern table, and the meta-tell.

**Grounding maturity governs elicitation depth.** When upstream artifacts (spec, ADR, strategies, research) already answer a step, draft-from-docs and present for confirmation — cite the source, don't re-interview. Reserve questions for genuine decision points and contradictions. Honor a posture stated in `$ARGUMENTS` without re-asking.


**If `NO_TEST_STRATEGY`:** first check the skip-ledger — `gsd_run query project strategy-skipped testing-strategy --raw` (true = a deliberate skip). **If `true`: note once ("test strategy deliberately skipped — proceeding with generic tiers") and do NOT re-offer** (the skip-ledger exception in `strategy-chain.md`). Otherwise tell the user "No test strategy found — the pipeline mapping is much better with one. (Consider `/gsd:testing-strategy` first.)" If they decline, proceed with generic tiers (small/unit + medium/integration + a lean e2e smoke set, **all in the one C0 job** until a C1 trigger fires) and note the gap in the output. From TEST-STRATEGY.md, extract: the per-subdomain level emphasis, the persistent e2e smoke list (the 3–7 flows), and the mutation-testing targets. From INFRA-STRATEGY.md / ADR / PROJECT.md, extract: target cloud + deploy target, repo host, team size, and whether a production environment exists at all. **Blast radius comes from `SECURITY-STRATEGY.md`** (data classification, regulated flows, ASVS level) — fall back to INFRA/ADR/PROJECT only when it is absent.

**If `NO_INFRA_STRATEGY`:** first check the skip-ledger — `gsd_run query project strategy-skipped infrastructure-strategy --raw` (true = a deliberate skip). **If `true`: note once and do NOT re-offer.** Otherwise tell the user "No infrastructure strategy found — the target cloud, deploy targets, and environments come from it, so the pipeline maps much better with one. (Consider `/gsd:infrastructure-strategy` first.)" If they decline, fall back to the ADR / PROJECT.md for the target cloud and note the gap in the output.

## Step 2.5: Measure, infer, ask — in that order

The number that decides the pipeline's shape is the **suite wall clock** — and `/gsd:testing-strategy` (Step 6.5) already records it in TEST-STRATEGY.md's `## Suite health` table. One number, one source: read it before ever re-timing. Derive what you can; ask only what nothing else answers.

**MEASURE — run the command, don't ask:**

- **Suite wall clock** *(the C1 trigger)* — read the newest dated row of TEST-STRATEGY.md's `## Suite health` table and use it (the `wall_clock` column is **integer milliseconds**; a legacy row headed `wall_clock (s)` — or a bare small integer from a pre-ms file — is seconds: multiply by 1000 before comparing to the 10-minute budget, exactly as `transition.md`'s compare does); run `time <test command>` **only when** no measured row exists (no TEST-STRATEGY.md, the row reads `unmeasured`, or the table is absent) — never re-time a number the strategy already recorded, and never produce a second independently-dated value for one fact. If the repo has no code yet (greenfield at strategy time), record `unmeasured — assume under budget; re-measure at the first milestone with a real suite` and **default to C0**.
- **Merges/week** *(the C3 trigger)* — `MERGES_90D` ÷ 13. **Contributors** *(the trunk-based 15-vs-16 threshold)* — `CONTRIBUTORS_90D`.
- **Existing CI surface** *(brownfield input)* — the `.github/workflows` listing plus the `schedule:` / `matrix:` greps from Step 2; each one found needs a forcing fact or a rung-down card.
- **Flake evidence** *(the C2-a trigger)* — ask the CI platform, not the user: `gh run list --status failure --limit 50` re-run patterns, or an existing quarantine/skip list in the test config.
- **Dependency surface** *(the C2-c trigger)* — lockfile + `HAS_DEPENDABOT`; if Dependabot already covers it, **C2-c is closed**.

**INFER from existing artifacts** (draft-from-docs, present for confirmation — never re-interview): test tiers / smoke list / mutation targets / **suite wall clock** (`## Suite health`, newest row) ← `TEST-STRATEGY.md` · deploy target, environments, whether a prod exists, cloud + secret manager ← `INFRA-STRATEGY.md` · **blast radius ← `SECURITY-STRATEGY.md`** · shipped-software vs operated service and brownfield vs greenfield ← `PROJECT.md` `## Mode` · team size ← `PROJECT.md` / `INFRA-STRATEGY.md`.

**ASK — one round, at most three questions** (header "Context"), and only what nothing above answers:

1. **"Are there production users today?"** — *none yet · a handful of internal/pilot users · real external users.* **This is the strongest right-sizing signal in the domain.** It sets the Axis-D floor and gates D2's blast-radius additions.
2. **"What deploy cadence are you aiming for?"** — *whenever it's ready · weekly · a release train.* (Deployment frequency is a DORA *outcome* — the thing worth optimizing, unlike stage count.)
3. **Only if `SECURITY-STRATEGY.md` indicates a regulated context:** "Any compliance requirement on the release path — change approval, artifact retention, segregation of duties?" (the only legitimate D5 trigger besides migration rehearsal).

## Step 3: Platform choice

**Default: GitHub Actions** — 41% org adoption, the ecosystem, merge queue, OIDC into all three clouds endorsed by AWS's and Google's own blogs. Recommend it whenever the repo is on GitHub.

**If the user wants cloud-native CI (Cloud Build / CodeBuild) — push back unless they have a real reason:** "Cloud-native CI is a deliberate exception, not a default — even AWS publishes first-class GitHub Actions → AWS paths. The two reasons that justify it: (1) VPC-isolated/regulated builds that must run inside a private network or compliance boundary, (2) cheap compute behind GHA (e.g., CodeBuild hosting GHA runner jobs). Do either apply?" If yes — **honor it**: that's exactly the carve-out (record which reason). If no, recommend GHA and record their final choice either way.

**The reverse holds too:** if the user has a genuine VPC/regulatory constraint and you were about to recommend GHA hosted runners, the cloud-native exception (or self-hosted runners in their VPC behind GHA) is the right call — don't dogmatically default.

Pricing context if cost comes up: GHA Linux $0.006/min 2-core ($0.002 1-core; 2,000–3,000 free min/mo), Cloud Build $0.006/min + 2,500 free min/mo, Azure $40/parallel-job unlimited minutes. Stay on hosted runners until the bill clears the free tier plus low-hundreds $/mo; then managed third-party runners before DIY self-hosted; never self-hosted on public repos.

## Step 4: Auth + secrets

**Recommendation: OIDC/WIF with a pinned `sub` condition (repo + branch/environment) — zero long-lived cloud keys in CI.** Always state the caveat: ~1,500 cloud roles have been found assumable by *any* GitHub repo due to missing/wildcard `sub` conditions — bare "OIDC" is not the recommendation; **pinned-`sub` OIDC** is.

**If the user says "we'll just put the service-account JSON in GitHub secrets" — push back:** "That's the exact pattern the CircleCI 2023 breach turned into a rotate-everything-everywhere incident, and GitGuardian finds 70% of leaked secrets still valid 2+ years later. Google, AWS, GitHub, and Microsoft all recommend OIDC federation instead — short-lived tokens, valid for a single job, nothing to steal. It's ~30 minutes of setup. Is there a target here that genuinely can't do federation?" Only if the target truly can't federate (legacy/3rd-party SaaS): a short-lived, scoped, rotated secret in CI secrets is the documented fallback.

**The secrets split (record it as a table):**
- Cloud deploy creds → nowhere (OIDC mints them per job).
- CI-scoped secrets → CI platform secrets ONLY when OIDC is unavailable for that target.
- Application secrets → ALWAYS the cloud secret manager, injected at runtime — **never baked into images, never a committed `.env`**.

## Step 4.5: Pick the CI rung (Axis C)

Use the reference's **CI rung ladder**. The rungs are **independently triggered, not unlocked in sequence** — a project can sit at C0 with one C2-c job and nothing else.

| Rung | What it is | Adopt only when |
|---|---|---|
| **C0 — the floor. Always.** | One workflow file, one job (spelled out in the default block below). | A git repository exists. No exceptions, no project too small. |
| **C1 — tier the gate** (PR gate + post-merge stage) | PR gate = lint + types + unit + fast in-process medium + the 3–7 persistent smoke e2e; the remainder moves to `push: main`. | **C1-a** measured suite wall clock > 10 min · **C1-b** a tier that structurally cannot run on a PR (fork-invisible secrets, a device farm, a third-party sandbox, a post-merge URL) — but never certification: a TEST-STRATEGY `Not a pipeline tier` line is outside the pipeline by design, and no C1 trigger may claim it · **C1-c** projected minutes exceed the included allowance. **Name which one fired.** |
| **C2 — scheduled jobs** | Up to four independently-triggered jobs (below). | A job a `pull_request`/`push` job structurally cannot do, or wall clock with nowhere else to live — **plus the admission gate**. |
| **C3 — merge queue** | Merge queue in front of `main`. | ~tens of merges/day to one branch; stale-base failures routine (Uber SubmitQueue: ~40% conflict-breakage odds at 16 concurrent conflicting changes). Below ~15 contributors it answers a question the team doesn't have. |

**C2 — the four jobs-to-be-done** (walk the reference's *"When a scheduled job earns its keep"* for the full triggers, citations, and platform caveats — don't improvise): **C2-a flake detection** (repeat the same commit N times to feed the quarantine list — **the strongest justification for a schedule**, because flakiness is only measurable by repetition and no PR run can do it) · **C2-b a suite with nowhere else to live** (a *slow* job, not a *repetition* job — ask whether `workflow_dispatch` beats a schedule first) · **C2-c dependency drift** (usually already solved — Dependabot schedules natively, so a hand-rolled nightly audit re-implements a free managed feature) · **C2-d external-contract drift** (vendor sandbox smoke; non-blocking, never a required check).

**Admission gate — no scheduled job ships without both:** a **named owner** and a **triage SLA** (a nightly nobody triages trains the team to ignore red, and then the real red is invisible), and a written answer to **"can this ever be red when the last PR run was green?"** — if no, it duplicates the gate and must not be scheduled. Record the platform caveats too: on public repos scheduled workflows are **auto-disabled after 60 days of repository inactivity**, and `schedule` is delayed under load — so **never make a scheduled job a release gate**.

**Anti-triggers — say them out loud if the user reaches for a nightly:** "it gives us confidence" (in *what fact* the PR gate didn't already establish?) · a suite that already runs on every PR (it can never be red first) · a repo with fewer commits than schedule firings per week (run on `push` instead) · a matrix adopted for completeness.

### The default for the common case — state it confidently

> **Solo or 2–3 people · no production users yet · full suite under ten minutes → Rung C0 + Rung D0. One workflow file. One job.**
>
> `on: [pull_request, push:main]` → lint · typecheck · the whole test suite · build. Plus `concurrency: cancel-in-progress`, `retention-days: 7`, a branch ruleset making that check required on `main`, and the six free supply-chain settings. Deploy is one command with one-command rollback.
>
> **No nightly. No matrix. No merge queue. No staging. No canary. No preview environments.**
>
> This is **not a starter kit** you are expected to outgrow on a schedule — it is the complete implementation of DORA's *Continuous Integration* capability (trunk-based development, merging to the mainline at least daily, fix-the-build-first, automated unit tests), and DORA's capability model contains **no** capability that rewards more pipeline stages, more environments, or more scheduled jobs. What DORA measures is deployment frequency and change lead time — both of which a second stage makes *worse*, not better.
>
> Every capability above this floor goes under **Deferred**, each with the specific observable fact that will promote it. When that fact becomes true, add exactly that one thing.

Never present the floor apologetically. "We'll start small and grow into the real thing" is the wrong sentence; "this is the whole measured capability, and here is what would force more" is the right one.

## Step 5: Pipeline design (fill the stages the rung earned)

**C0 is one stage.** Map TEST-STRATEGY.md's tiers into that single job. Tier into a PR gate + post-merge stage **only when a C1 trigger fired — and say which one** in the strategy doc.

- **PR gate — ≤10 min wall clock (hard budget; CD book + DORA canon):** lint, types, small (unit), fast in-process medium, and the **persistent smoke e2e list from TEST-STRATEGY.md (3–7 flows, happy paths only)**. If the suite doesn't fit, cut the gate — don't stretch the budget. (At C0 this is simply the whole suite; the split only becomes real at C1.)
- **Post-merge stage (C1 only):** whatever could not fit the budget, or could not run on a PR at all. (Certification is never a candidate — it is not a pipeline tier.)

**The explicit non-trigger — write it into the doc:** *"the post-merge stage is more thorough"* is **not** a reason. Fowler: "the commit build is the one that has to be done quickly, as a result it will take a number of shortcuts" — later stages exist to **protect the commit build's speed**, not to add thoroughness. **If the whole suite runs in under ten minutes, one stage is the correct pipeline**; a second stage is pure latency plus spend. (Scheduled work is not a pipeline stage — it is Rung C2, with its own trigger, owner, and SLA.)

**Flaky policy (record it):** PR-gate tests must hold <1% flake rate; flaky tests are **quarantined from the PR gate but keep running post-merge with a fix SLA** (Google/Dropbox pattern). Differentiated retries (same-process / time-shifted / different-host) for *diagnosis* only. If the user asks for automatic retry-until-green on the gate, push back: blanket retries destroy the signal (Fowler) — quarantine + diagnose instead. **Until a flake has actually occurred, record the policy as "no flakes observed yet — on first occurrence:" rather than manufacturing a fix-SLA for a problem the project doesn't have.**

**Merge queue:** recommend only at ~tens of merges/day to one branch (Uber measured ~40% conflict-breakage odds at just 16 concurrent conflicting changes). Below that volume it's pure latency — record the trigger ("enable when stale-base failures become routine") instead of enabling now.

## Step 5.5: Matrix check

**Default: no matrix.** One runner, one OS, one runtime version — the one you deploy on. (Reference: *"Matrix builds"*.)

**A matrix is justified only by a promise you have made to someone:** you publish a library/CLI and support N runtime versions or M OSes (matrix **exactly the supported set** — the support policy defines the legs, not curiosity) · users run your software on OSes you don't develop on · a documented compatibility requirement in `PROJECT.md` / the README. **Not justified by** "good practice", "we might support Windows later", "the template had it."

**State the cost:** each combination is a separately billed job and each rounds partial minutes up **independently** — a 6-leg matrix on a 40-second job bills ~6 minutes, not ~4, against a 2,000-minute (Free) allowance.

**Rung-down check (brownfield):** a matrix with no supported-platform promise behind it gets cut to one leg — record "restore leg X when we promise to support X."

## Step 6: Pick the delivery rung (Axis D)

**Shipped-software route:** if the product ships as packages/binaries rather than an operated service, **Axis D does not apply** — the release pipeline IS the ladder. Walk the reference's "Publishing packages" section instead (tag-driven releases, PyPI Trusted Publishing, npm provenance, crates.io scoped+environment-protected tokens, attestations, fork-PR exclusion). The service ladder applies only to any future hosted tier, as promotion-trigger material.

Pick the rung from **production-user exposure + blast radius** (Step 2.5), using the reference's Axis-D ladder for the full entry criteria. Build-once/promote-same-digest-pinned-artifact and one-command rollback are invariants at every rung.

- **D0 — no operated delivery yet** *(the floor)*: deploy is **one command, checked into the repo, documented in the README**, with one-command rollback. Nothing else. *Entry: zero production users and (no deployed service, or the deploy is one command a human runs).* Promote when it is run by hand more than ~weekly, a second person needs to run it, or the first real user arrives.
- **D1 — one automated deploy path** from `main`, plus rollback. **PR previews only when the platform genuinely gives them for free**; a **DB branch per preview** only when previews exist *and* behavior is schema-coupled. Neither is a floor item. *Entry: real users (however few), or deploys more than ~weekly, or more than one deployer.*
- **D2 — risk controls:** feature flags (internal-first) + revertable expand-contract schema changes + a blue-keep-alive rollback window. *Entry: high blast radius (payments, PII, regulated data, irreversible side effects) **AND real users exposed to it** — both conjuncts.* **Recommend flags with their retirement mechanism** — Fowler calls toggles "inventory which comes with a carrying cost"; expiry dates and test time-bombs, or flags become the next over-engineering surface.
- **D3 — progressive rollout (weighted, human-judged):** 5 → 25 → 100% with a human gate between steps. **No metrics backend required.** *Entry: real users AND platform-native traffic splitting AND somebody watching a dashboard.* This is the honest answer for a team with a real staged-rollout need that cannot meet D4's prerequisites.
- **D4 — automated canary analysis:** *Entry, ALL of:* representative traffic · **an evaluation process that judges good/bad, integrated into the release** · a metrics provider wired up · deploy frequency exceeding human attention.
- **D5 — staging environment — the TOP rung, usually never reached:** *Entry, exactly two:* a risky migration to rehearse, or a contractual/regulatory pre-production requirement. **Staging is a *higher* rung than progressive delivery, not a stepping stone toward it.**

**Scripted pushback — "we need a staging environment" (solo dev):** "Staging catches only known-unknowns, and mirroring it to prod is — per Charity Majors — a fool's errand; Uber is actively deprecating staging. For a team your size the evidence-backed spend is PR previews + one-command rollback + production observability. The one exception worth a thin pre-prod: rehearsing a risky migration. Does that apply here?" Honor a genuine migration-rehearsal or compliance need.

**Scripted pushback — "let's add canary deployments" without SLIs:** "Canary *analysis* has prerequisites. The SRE Workbook's are qualitative and all required: enough traffic that the canary is representative — 'terminating a canary deployment after receiving just a handful of queries doesn't provide a useful signal' — plus **an evaluation process that judges good/bad and is integrated into the release process**, which is the part most teams skip. **GSD's own heuristic** for 'enough' is ~a dozen trustworthy low-variance SLIs and a 1–5% slice that yields signal — that number is ours, not Google's. Without those it's automation theater on noise. If you want staged exposure today, weighted rollout with a human gate (D3) needs no metrics backend at all. Do you have the evaluation process and the traffic?" Record automated canary as a deferred item with its promotion trigger.

## Step 7: Supply-chain table stakes

Recommend the **free six** — each ≤ hours of work, each counters a real 2023–25 attack: (1) SHA-pin all actions + Dependabot pin updates (tj-actions CVE-2025-30066: moved tags, 23k+ repos), (2) lockfile + `npm ci` (Shai-Hulud worm), (3) top-level read-only `permissions:` / read-only `GITHUB_TOKEN` default, (4) OIDC zero-long-lived-keys (CircleCI breach), (5) push protection + secret scanning + no `.env` in repo, (6) branch ruleset on main (PR + checks, no force-push). Plus: never `pull_request_target` with untrusted checkout; never self-hosted runners on public repos.

**Defer the ceremony** (record as deferred, with triggers): SLSA L3, cosign-signing internal artifacts, SBOM programs beyond the free SPDX export, org-wide Scorecard dashboards, self-hosted runner fleets. If publishing packages, take the free provenance win (`npm publish --provenance`).

## Step 8: Over/under-engineering meta-tell check

Run this in **both directions** — it is a first-class gate, not a formality. A check cannot fire on what it does not name, so it enumerates **every** capability the skill can turn on.

**Downward (over-engineering) — build this table, one row per capability that is ON:**

| Capability | The concrete requirement forcing it | Where that fact is observable |
|---|---|---|
| A second pipeline stage | suite > 10 min · fork-secret/device/deployed-URL impossibility · included-minutes breach — never TEST-STRATEGY's "Not a pipeline tier" line (certification is not a tier; C1 cannot claim it) | the measured suite time; the tier that can't run on a PR |
| Any `schedule:` job | one of C2-a/b/c/d **plus a named owner and a triage SLA** | the flake/quarantine evidence; the post-merge wall clock; `dependabot.yml` absence; the vendor integration |
| A matrix leg | a supported-platform promise | the publish target / README support policy |
| A merge queue | ~tens of merges/day; stale-base failures routine | `MERGES_90D` ÷ 13 |
| Preview environments | the platform gives them for free | the INFRA-STRATEGY platform |
| A DB branch per preview | previews exist **and** behavior is schema-coupled | the INFRA-STRATEGY data layer |
| Feature flags | a risky path **with real users**, **plus a retirement mechanism** | the user-exposure answer + blast radius |
| Progressive rollout (D3) | real users + platform-native traffic split + a human watching | the INFRA-STRATEGY platform |
| Automated canary (D4) | representative traffic **+ an evaluation process integrated into the release** + a metrics provider | the SLI inventory; traffic volume |
| A staging environment (D5) | a migration to rehearse **or** a compliance mandate | the migration; SECURITY-STRATEGY.md |
| Cloud-native CI | a VPC/regulatory boundary, or cheap compute behind GHA | the compliance boundary |
| A flake fix-SLA policy | a flake has actually occurred | the CI failure history |

**Any row whose middle column is empty → delete the capability** and record it under *Deferred*, with the fact that would promote it.

**Upward (under-engineering) — the floor is not optional:**

- CI exists but is **not a required status check on `main`**, runs against feature branches rather than the shared mainline, or wraps a vacuous suite → that is **CI theatre** (Thoughtworks Radar, ring **Hold**). Fix now.
- Long-lived cloud keys in CI where the target *can* federate → fix now.
- App secrets in images or a committed `.env` → fix now.
- Real users + high blast radius with no flags, no revertable schema path, and no one-command rollback → raise to D2 now.
- ~tens of merges/day with no merge queue → raise to C3 now.
- A known-flaky suite with **no quarantine list at all**, where flakes are handled by re-running until green → the Fowler anti-pattern; raise to C2-a.
- A published package with no provenance / trusted publishing → raise now (it's free).

<!-- FORK:context BEGIN -->
After each elicitation round, append it to `.planning/PROJECT-DISCUSSION-LOG.md` per `references/context-lifecycle.md` (skip if `context_lifecycle.discussion_logs` is disabled).
<!-- FORK:context END -->

## Step 9: Write CICD-STRATEGY.md

Render `@~/.claude/gsd-core/templates/cicd-strategy.md` (fill `[DATE]`, `[PROJECT_TITLE]`). Fill: the **Rungs** block first (CI rung, delivery rung, measured suite wall clock, merges/week, production users, deploy cadence), then platform + why, auth method (OIDC config incl. the `sub` condition), the secrets table, the pipeline map (**one stage unless a C1 trigger fired — name it in the row**), matrix decision, the flaky policy, the Axis-D rung + its forcing fact, the supply-chain checklist incl. retention and concurrency, cost guardrails, anti-patterns acknowledged, deferred items **with the observable fact that promotes each**, and handoff notes for plan-phase.

Write to `.planning/CICD-STRATEGY.md`.

## Step 10: Commit

```bash
gsd_run project strategy-done cicd-strategy 2>/dev/null || true  # flip the Strategy Plan row — the grounding gate keys on `done`
if [ "$COMMIT_DOCS" = "true" ]; then
  # The discussion log is part of the durable record — commit it with the docs it explains (empty when absent/disabled).
  DLOG=$([ -f .planning/PROJECT-DISCUSSION-LOG.md ] && echo ".planning/PROJECT-DISCUSSION-LOG.md")
  gsd_run query commit "docs: add CI/CD strategy (pipeline follows test strategy)" --files .planning/CICD-STRATEGY.md .planning/PROJECT.md $DLOG
else
  echo "CICD-STRATEGY.md written but not committed (commit_docs is false)."
fi
```

## Step 11: Wrap up

Display:
```
CICD-STRATEGY.md written — right-sized to the measured facts.

  CI rung: [C0 — one workflow, one job]  (suite wall clock: [N min | unmeasured])
  Delivery rung: [D0 — one-command deploy, no prod users yet]
  Platform: [GitHub Actions] · Auth: [OIDC, sub pinned to repo+env]
  Supply chain: [8/8 free floor items]
  Deferred: [nightly, matrix, merge queue, staging, canary, preview envs — N triggers recorded]

Next: /gsd:plan-phase   (CI/deploy phases will plan against this strategy)
```

**Auto-advance (chain):** after this skill, follow `@~/.claude/gsd-core/workflows/strategy-chain/modes/advance.md` with `CURRENT=cicd-strategy` — in `--auto` it dispatches the build loop (`/gsd:discuss-phase 1`) since cicd is the last strategy step; interactive runs use the `Next:` pointer above.

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
- **C0 is the default and the complete answer for most projects** — one workflow file, one job. Every rung above it names the current, concrete fact forcing it, or it drops to the floor. State the floor confidently: it is the whole of DORA's *Continuous Integration* capability, not a starter kit. "The next stage is more thorough" is not a trigger.
- **A `schedule:` job needs a job a PR run structurally cannot do, plus a named owner and a triage SLA.** No owner, no job. And never make a scheduled job a release gate.
- **No matrix without a supported-platform promise.** Default is one leg — the one you deploy on.
- **Delivery rung follows production-user exposure + blast radius, not aspiration and not team size alone.** No staging for a solo dev (except migration rehearsal or a compliance mandate — and staging is the TOP rung, above progressive rollout); no automated canary analysis without representative traffic and an evaluation process wired into the release. Record promotion triggers for everything deferred.
- **Recommend, don't dictate.** Present trade-offs with rationale; the user has context you lack. Respect `commit_docs` / `response_language`.
</critical_rules>

<success_criteria>
- TEST-STRATEGY.md (or generic tiers, gap noted) + INFRA-STRATEGY/ADR + SECURITY-STRATEGY context loaded; blast radius taken from SECURITY-STRATEGY rather than re-interviewed
- **Suite wall clock read from `## Suite health` where a measured row exists (measured here only when absent) — or explicitly recorded as `unmeasured`** (greenfield); merges/week and contributor count derived from `git`
- Platform chosen with rationale (GHA default; any cloud-native exception justified by VPC/regulatory or compute-behind-GHA)
- Auth recorded as pinned-`sub` OIDC (or the documented fallback with rotation); secrets split table filled
- **CI rung (Axis C) and delivery rung (Axis D) recorded, each non-floor rung carrying the concrete fact that forced it.** A **single-stage** pipeline at C0/D0 is a passing, complete outcome — not a gap
- Pipeline map filled: PR gate ≤10 min (unit + fast medium + 3–7 smoke e2e); a second stage present only with its named C1 trigger; flaky quarantine policy + merge-queue trigger recorded
- **Every scheduled job has a named owner and a triage SLA**, or there are no scheduled jobs; **a matrix is justified by a supported-platform promise, or absent**
- Delivery rung matched to production-user exposure + blast radius; staging/canary pushbacks applied; promotion triggers recorded
- The free-six supply-chain table stakes recommended plus explicit artifact retention and `concurrency: cancel-in-progress`; SLSA/cosign/SBOM ceremony deferred with triggers
- Meta-tell check passed in both directions (every ON capability has a forcing fact; no ignored requirement; no CI theatre)
- CICD-STRATEGY.md written and committed (when commit_docs is true)
- User directed to /gsd:plan-phase
</success_criteria>
