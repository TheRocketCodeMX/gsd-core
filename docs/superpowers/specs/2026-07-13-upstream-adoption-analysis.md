# Upstream Adoption Analysis — `@therocketcode/gsd-core` ← `open-gsd/gsd-core`

> **Status: ANALYSIS ONLY.** This document is decision-support and the input for a
> future GSD milestone/spec. It contains no implementation and mandates none. Nothing
> here has been applied to the codebase.
>
> **Date:** 2026-07-13 · **Analyst pass:** 8 verification agents + 4 deep-dive agents,
> all cross-checked against the fork's real code (`main`).

---

## 1. Executive summary

The fork was created from **upstream `v1.4.0`** (`7eb4d286`, 2026-06-08) and has since
done **60 commits of independent product work** (source-fidelity 1.13.0, gsd-learn
1.14.0, grounding on `next`). Upstream has done **619 commits**, releasing through
**v1.6.1** (2026-07-01). Version numbers collide across the two trees and are **not**
identity — everything below is judged by content, compared against `upstream/main`,
never by tag name. Per `docs/MAINTAINING-FORK.md`, `main` must never be
fast-forwarded to `upstream/main` (it would drop the branding + independent work).

The upstream delta splits cleanly into **two tracks**:

- **Track A — Correctness/feature back-ports (near-term).** Genuine bugs and small
  improvements in code the fork still shares. **9 HIGH** (security / data-loss /
  correctness) + a **pruned MED set** (5 clean adopts). Runtime-agnostic except two
  items. Independent of any release; safe to ship as a hardening pass.

- **Track B — The capability architecture (strategic program).** Upstream's two
  largest efforts — ADR-857 (capability model) and ADR-1244 (third-party ecosystem +
  security), plus ADR-1016 (runtimes-as-capabilities). **This does not change the
  methodology's flow; it re-plumbs how the same flow is assembled**, so that runtimes
  and features become pluggable contributions. Under the fork's **new goal — a real
  open-source, multi-runtime project that external contributors extend** — this is no
  longer skippable: it is the contributor-extensibility architecture. It is a
  multi-milestone program, not a patch.

**Headline recommendations:**

1. Do the **9 HIGH** as a runtime-agnostic hardening release (independent of Track B).
2. Adopt the **pruned MED set** (5 items), led by the multi-runtime-strategic
   `#903 launcher-shim`.
3. Treat **Track B as a phased program** (6 phases). Adopt the *principle* and the
   *seam* early; pilot on `drift`; converge the runtime model to stop permanent drift;
   port the security core; **defer** the full third-party roof until scale.
4. **Keep source-fidelity/grounding in the core** — it is your differentiator and, by
   upstream's own predicate-boundary logic, constitutive of verification reach. Do not
   make it a capability.

---

## 2. The fork ↔ upstream relationship

| | Fork `@therocketcode/gsd-core` | Upstream `open-gsd/gsd-core` |
|---|---|---|
| Base | forked at upstream `v1.4.0` (`7eb4d286`) | — |
| Current | `1.14.0` (own scheme) | `1.6.1` (2026-07-01) |
| Commits since base | ~60 (independent features) | ~619 |
| Direction | source-fidelity, gsd-learn, grounding, Waves 0–5 | capability platform, runtime parity |
| Multi-runtime | **yes** — 15 runtimes via profile+switch model | yes — via capability descriptors |

The fork is **not a stale mirror**. Both trees evolved heavily and independently. The
adoption question is therefore *"which upstream changes are (a) still relevant to
shared code, (b) not already fixed independently, (c) not superseded by our own
architecture"* — not *"merge upstream."*

---

## 3. Track A — Correctness back-ports (the 9 HIGH)

All nine verified against the fork's real code. Grouped by runtime blast-radius (the
CTO's explicit concern).

### 3.1 Runtime-agnostic, data/Node-only — safe to batch (fix once for all 15 runtimes)

| # | Defect (file:line) | Fix | Effort |
|---|---|---|---|
| 1 | **Stale model catalog** — `gsd-core/bin/shared/model-catalog.json` Sonnet `claude-sonnet-4-6` (lines 12, 32, 37, 42, 89, 90). Anthropic-verified: current is `claude-sonnet-5`. Opus/Haiku already current. | `claude-sonnet-4-6` → `claude-sonnet-5` (+ `anthropic/…` variants). Sync `docs/CONFIGURATION.md` (1197–1203), `settings-advanced.md`; update `tests/core.test.cjs:511-513`. **OpenAI/Google IDs (`gpt-5.3-codex`, `gemini-3-pro/flash`) NOT verifiable by Anthropic tooling — CTO must confirm vs provider docs.** | S |
| 2 | **`is_last_phase` misses checkbox roadmaps** — `src/phase.cts:1548` heading-only `#{2,4}\s*Phase` regex. On `- [ ] Phase N:` roadmaps with no phase dir yet → false "Milestone complete" + `total_phases` decrement (STATE corruption). (upstream #1819) | Add a bullet/checkbox fallback reusing the existing `bulletPattern` (phase.cts:868–875); heading matches still win. | S–M |
| 3 | **Locks steal on mtime, no PID liveness** — `src/state.cts:1134` (`acquireStateLock`), `src/planning-workspace.cts:166` (`withPlanningLock`). Live-but-slow holder can be stolen → lost update. (upstream #1532) | On `EEXIST`, read PID + `process.kill(pid,0)`: dead → steal now; alive → keep mtime as runaway backstop. Guard NaN/0; retain mtime fallback for cross-host/NFS. | M |
| 4 | **`deepMergeConfig` prototype pollution** — `src/configuration.cts:101`, reached via line 197 on the file-load path (config-set CLI is already guarded). (upstream #1534, security) | Skip `__proto__`/`constructor`/`prototype` keys at the top of the merge loop. | S |
| 5 | **`phases clear` no git-dirty guard** — `src/milestone.cts` `cmdPhasesClear` (391–419) `rmSync`s phase dirs with no uncommitted-work check. (upstream #1484, data-loss) | `git status --porcelain` scoped to phases dir; refuse if dirty unless `--force`; skip in non-git repos. Mirror `roadmap-upgrade.cts:484`. | S–M |
| 7 | **`generate-claude-md` clobber guard is partial** — `src/profile-output.cts` `cmdGenerateClaudeMd`. **Verified 3 gaps:** (A) no-clobber `detectManualEdit` runs only under `--auto` → a plain run overwrites hand edits *inside* managed markers; (B) `--force` is parsed by the handler but never read (dead flag); (C) a marker-less hand-authored file gets 6 sections appended. (upstream #1098/#1118) | Make no-clobber the default (run `detectManualEdit` regardless of `--auto`); wire `--force`; gate append on marker-less files. Already codex-aware (targets `AGENTS.md`) — keep. | M |

### 3.2 Per-runtime projection matters

| # | Defect | Fix + nuance | Effort |
|---|---|---|---|
| 6 | **`gsd-planner` lacks `Edit`; whole-file ROADMAP Write** — `agents/gsd-planner.md:4` tools omit `Edit`; `update_roadmap` (1069–1089) does whole-file Write → truncates milestone history. The truncation-fallback contract (1010–1012, 1170) already says use `Edit` but it isn't granted (dead). (upstream #973/#989) | Grant `Edit`; rewrite `update_roadmap` to targeted `Edit`. **The tool grant must reach every runtime's generated agent** (esp. Codex TOML), not just the `.md` — verify installer frontmatter→per-runtime tool mapping. | S |

### 3.3 Genuinely runtime-divergent — the fix differs by runtime

| # | Defect | Fix + nuance | Effort |
|---|---|---|---|
| 8 & 9 | **Nested-spawn silently skips isolation + verification** — `gsd-core/workflows/plan-review-convergence.md` wraps `gsd-plan-phase` in an `Agent` (#936); `autonomous.md` (330–333, 352–355) and `manager.md` (248–259, 282–293) dispatch plan+execute as `Agent(run_in_background=true)` (#863). On **Claude, subagents cannot spawn subagents** → inner executor/verifier degrade silently, yet VERIFICATION.md is read as if it ran. Codex/Gemini differ (files already carry "ORCHESTRATOR RULE — CODEX RUNTIME" carve-outs). | **Runtime-capability-gated branch:** inline `Skill()` where the runtime lacks nested/parallel agents (Claude); background/parallel only where supported. Add a post-dispatch assertion that VERIFICATION.md reflects a real verifier run (hard-fail if skipped). Fix in the shared `gsd-core/workflows/*.md` (propagates via `@`-include). **This is the item where a uniform change would be wrong.** | L |

> **Note — same family as the fork's own 1.11.1 fix.** The fork closed the `context: fork`
> variant of this bug but missed the Agent-wrap (#936) and background-dispatch (#863)
> variants. Upstream's sweep was more complete.

---

## 4. Track A′ — MED + EVALUATE (revised after deep verification)

Going deeper **shrank the MED batch from ~15 to 5 clean adopts** — several candidates
were already fixed independently.

### 4.1 ADOPT — priority order

1. **`#903` launcher-shim non-Claude homes** *(S–M)* — `autonomous.md:51`/`manager.md:22`
   shim only probes `$HOME/.claude`, though `runtime-homes.cts:70-155` already maps
   `.gemini`/`.codex`/`.hermes`/etc. **The multi-runtime promise leaking** — promoted to
   #1 by the OSS reframe.
2. **`#1550` mktemp BSD/macOS** *(S)* — `XXXXXX`+suffix templates in `ship.md:249`,
   `quick.md:665`, `execute-phase.md:569,816`, `profile-user.md:221,235`,
   `agents/gsd-code-fixer.md:265` collide on macOS. Direct contributor portability.
3. **`#866` profile-pipeline temp leak** *(S)* — `profile-pipeline.cts:416,604` create under
   `os.tmpdir()` root; reap (`core.cts:105`) only scans `GSD_TEMP_DIR`. Relocate under
   `GSD_TEMP_DIR`.
4. **`#904` branch_name normalization** *(S)* — `init.cts:263`, `commands.cts:550` fill
   `{phase}` raw; `normalizePhaseName` used everywhere else → "3" vs "03" branch/dir drift.
5. **`#1656/#1664` frontmatter fail-closed writer** *(M)* — `frontmatter.cts` only warns on
   empty `must_haves` (310–317); no change-only-regenerate writer. **Protects the
   source-fidelity oracle** (`gsd-verifier.md:148`) — strongest thematic fit.

**ADOPT-IF (conditional):** `#1632` config-set value validation *(only if reworked
schema-driven, not more `if` branches)*; `#1081` read-only `disallowedTools` *(Claude-only
belt-and-suspenders; allow-list already fences them)*; `#934` migration-004 prune half;
`#1419` gap-range-expand; `#1013/#1198` worktree edge-cases *(only if a concrete edge named)*.

### 4.2 DROP — already fixed or superseded

- **STATE-math + parser batch** (`#1490/#1568/#1655/#1663/#1662/#1386/#1665/#1536`) —
  **already handled** (div-by-zero guards, phase-dedup, multi-digit/decimal roadmap regex,
  ADR/decisions parsers). No live gap.
- **`#1355` agent-teams stall guard** — guards a feature the fork never adopted.
- **`#1133` model_policy on claude / `#1014` anthropic-fable** — fork's `model_policy`
  (`core.cts:1369-1420`) already supersedes; fable is a Claude-only model that fights the
  runtime-neutral tier abstraction.
- **`#72` Business-Context block** — subsumed by the richer existing `templates/project.md`.
- **`#1421/#1583/#1611` reviewer/verifier robustness** — **the fork's own gates are
  stronger** (verifier claims-not-evidence + Level-4 data-source tracing; eval-auditor
  anti-downgrade rules). The fork *leads* here.

> **Confidence signal:** the fork's source-fidelity pillar already exceeds upstream's
> reviewer/verifier work — the divergent bet is paying off.

---

## 5. Track B — The capability architecture (strategic)

### 5.1 What it is (and what it is *not*)

Upstream did **not** change the five-step methodology (Discuss→Plan→Execute→Verify→Ship)
and did **not** add new core flows. It **re-plumbed how the same flow is assembled**:
optional features (TDD, drift, security, code-review, nyquist, UI, gap-analysis) moved
from being **welded inline** into the loop prose to being **self-declaring capabilities**
that plug into named sockets. *Same behavior, pluggable internals.* Analogy: the assembly
line's stations went from hardwired to sockets — so outsiders can add a module without
rebuilding the line.

The stack (foundation → roof):

```
  ADR-1244  ── third-party ecosystem + security (ROOF; amends 857-D7/D8)
  ADR-1016  ── runtimes-as-capabilities (a wing)
  ADR-857   ── the capability model itself (FOUNDATION)
```

- **ADR-857** — host/feature line; ~12 stable **loop extension points**; three hook kinds
  (`step`, `contribution`, `gate`); `produces`/`consumes` topological data-flow (survives
  `/clear`); **invariant: the core runs with ZERO capabilities**; federated per-capability
  config. A malformed capability is skipped with a warning — except one that declared a
  `gate`, which gets a **synthetic blocking gate** so it fails *closed*.
- **ADR-1244** — third-party plugin lifecycle (install/update/remove/outdated) via
  git/npm/tarball/local; versioned manifests (`engines.gsd`, `integrity`, `provenance`);
  and the **security model** (the crown jewel, portable independently): no-code-execution
  staging (`npm pack --ignore-scripts`, clone-not-install), **sha512 integrity verified
  before extraction**, tar-slip/symlink/transport rejection, and a **user-owned consent
  store keyed to a recomputed content hash** (a forged in-repo ledger cannot self-authorize).
  Honest limit: no sandbox — consent + integrity + reversibility *are* the barrier.
- **ADR-1016** — a runtime is a `capability.json` over a **closed 12-axis vocabulary**;
  the interpreter modules become pure data-readers.

### 5.2 How it collides with the fork

The fork is the **pre-857 world, frozen**: no capability machinery at all.

- `execute-phase.md` carries **25 inline `<step>` blocks**; features are welded
  (`code_review_gate:1162`, `schema_drift_gate:1318`, `codebase_drift_gate:1384`, TDD across
  two files, security/nyquist/UI/gap-analysis inline). `plan-phase.md` is prose-structured
  (0 `<step>`), so the seams don't exist yet and must be *invented*.
- Config is the **opposite of federated**: one flat **110-key** `config-schema.manifest.json`.
  `clusters.cts` is a manual 10-group pre-capability grouping.
- **Runtime smoking gun:** the fork's `src/runtime-config-adapter-registry.cts` is the
  **pre-1016 hand-kept `REGISTRY`** that upstream **retired**; upstream's copy `require`s a
  `capability-registry.cjs` the fork lacks. **The two files are already incompatible, one
  generation apart — the fork is diverging *backward*.** Adding a runtime today = editing
  **6–8 switch tables + 13 dispatch sites in `install.js`** (code, not data; hostile to
  outside PRs). Cost of *not* converging: every upstream per-runtime fix (a one-line data
  edit for them) becomes a manual port into five divergent switches, **forever**.
- **The fork's own features assume the welded loop.** Source-fidelity/grounding is prose
  baked into agents/steps + a shared in-repo oracle (`DESIGN-INVENTORY.md`), not a hook.
  It **must stay core** (predicate boundary: grounding = verification reach), but the
  render-hooks *seam* can still host a core, always-on gate.

### 5.3 Graded verdict

| Piece | Verdict |
|---|---|
| "Core runs with zero capabilities" invariant | **ADOPT AS PRINCIPLE — now** (cheapest, highest-value; stops inline-`<step>` sprawl before relaunch) |
| Loop-extension-point seam (`render-hooks` + ~12 points, step/contribution/gate) | **ADOPT THE SEAM — pilot with `drift`** |
| Federated config + first-party registry generator | **BUILD — staged** |
| Runtime-capability descriptor (ADR-1016) | **CONVERGE — stageable hybrid; keep converters first-party + orthogonal profile system** |
| ADR-1244 security/trust core | **ADOPT ~verbatim — but only once a model exists to gate** |
| Third-party overlay loader, command-contribution (ADR-959), central registry | **DEFER until scale** |
| Source-fidelity / grounding → capability? | **NO — keep core** |

### 5.4 Phased roadmap (mirrors upstream's own staged rollout)

- **Phase 0 — Capability substrate ("Define", no cutover).** `capability-schema.cts`
  (ADR-894), a `gen-capability-registry` build step → committed read-only registry, port
  `loop-resolver.cts`, add `gsd-tools loop render-hooks <point>`, enumerate the 12 points as
  data mapped onto existing step names. *Effort M.* Verify: registry generates empty→green;
  `render-hooks` returns empty ordered envelope; full suite `$?`==0. **Not:** no spine edits,
  no runtime touched.
- **Phase 1 — Host seam + zero-capability proof.** Insert resolver calls at the 12 points,
  resolving to nothing; golden **byte-equivalence harness** vs today. *Effort L (risky prose
  surgery on ~3,600 loop lines; `plan-phase.md` has no natural seams to invent).* **This is
  the single highest-risk step** — split into its own phase precisely because the fork's loop
  is inline prose, unlike upstream's already-seamed spine.
- **Phase 2 — Migrate first-party features → capabilities + federated config.** Author
  `capabilities/{drift,ui,security,code-review,research,…}/capability.json`; relocate keys out
  of the flat manifest; retire `clusters.cts`. *Effort L.* **Not:** do NOT migrate
  source-fidelity/grounding (core substrate).
- **Phase 3 — Runtime-as-capability (ADR-1016 convergence).** 15 `role:runtime` descriptors;
  drive the switch modules from the descriptor in upstream's staged 5a→5g order, retiring the
  `REGISTRY`. *Effort XL.* **Independent of Phase 2 — can run in parallel** (depends only on
  the Phase-0 registry). Kills permanent runtime drift.
- **Phase 4 — Ecosystem substrate: versioned manifest + registry overlay (1244 D1/D2).**
  `integrity`/version stamping; `loadRegistry({includeInstalled})` composing first-party ∪
  overlay; per-capability install/upgrade/remove. *Effort M.* Prereq: Phases 2 **and** 3.
- **Phase 5 — Third-party roof: source resolver + security + trust gate + dispatch (1244
  D3–D7).** Port `capability-source/consent/trust/lock.cts`; no-exec staging; sha512-before-
  extract; tar-slip/symlink rejection; user-owned consent store; registry-driven dispatch
  **last, behind the gate**. *Effort XL.* **Not:** third-party auto-update stays off.

### 5.5 The `drift` pilot (concrete first proof-of-concept for Phases 0–1)

Feasible and **bounded** if scoped to the **`codebase_drift_gate` only** (non-blocking by
contract, already externalized to `steps/codebase-drift-gate.md`, config-gated by keys that
already exist). Upstream's 575-line resolver collapses to **~120 lines** once the
third-party-overlay machinery is dropped. The fork already has **four** hand-rolled gate
blocks converging on one pattern (`schema_drift`, `codebase_drift`, `decision-coverage`,
`grounding`) — the seam factors out real duplication, not hypothetical.

**Equivalence test (byte-identical proof):**
`diff <(gsd_run loop render-hooks execute:wave:post | jq -r .rendered) gsd-core/workflows/execute-phase/steps/codebase-drift-gate.md` → empty; drift tool-verb JSON envelopes unchanged before/after; toggle `drift_action=auto-remap` → rendered branch unchanged.

> **Seam vs verb-routing:** the render-hooks seam composes the gate *wrapper prose*; the
> `verify.codebase-drift` verb still dispatches direct-to-CJS (per ADR-3524). State this
> explicitly so the PoC doesn't appear to violate 3524.

### 5.6 Program-level risk register

1. **The 12 loop-extension-point names are a one-way door** (Hyrum's Law) — a wrong Phase-0
   cut forces breaking renames downstream.
2. **Prose-spine equivalence is unprovable by `test:unit` alone** — byte-identical rendering
   can pass while executor *behavior* drifts; needs live dogfood gating.
3. **Validator drift** (build-time gen vs runtime overlay) silently accepts malformed
   descriptors — mandate a generative-parity assertion from Phase 3.
4. **Federated-config merge fail-open** — a merge bug that silences a security/drift gate is
   invisible until it matters; fail-closed by construction.
5. **XL fan-out (Phases 3 + 5) can stall the calendar** — if forced to cut, ship **Phases
   0–3** (convergence value, runtime drift stopped) and defer the roof.

---

## 6. Recommended sequencing (both tracks)

- **Track A (9 HIGH + 5 MED)** is independent of Track B and of any release. Ship it as a
  **runtime-agnostic hardening pass** — batch 3.1 (data/Node), land 3.2 (planner `Edit`
  cross-runtime), and treat 3.3 (nested-spawn) as its own runtime-gated change with dogfood
  verification. Good candidate to precede the OSS relaunch.
- **Track B** is a **multi-milestone program**, best expressed as a GSD milestone with the
  6 phases as its roadmap. Adopt the principle + seam early (Phases 0–1), pilot `drift`,
  converge runtimes (Phase 3) to stop drift, port the security core, **defer** the full
  third-party roof until the project has contributor demand.

**Suggested immediate next step (when you choose to act):** create the GSD milestone/spec
for Track B from this document; run Track A HIGH as a parallel hardening release.

---

## 7. Open questions / decisions for the CTO

1. **Model IDs:** only the Anthropic Sonnet staleness is verified. Confirm
   `gpt-5.3-codex`/`gpt-5.4-mini` and `gemini-3-pro/flash` against provider docs before
   editing the catalog.
2. **How far into Track B before the public relaunch?** Options: (a) Phases 0–1 only (seam +
   principle, minimal), (b) Phases 0–3 (adds runtime convergence — stops the backward drift),
   (c) full 0–5 (opens the third-party ecosystem). Recommendation: **0–3 for relaunch, defer
   4–5** behind contributor demand.
3. **MED conditionals:** decide `#1632` (only if schema-driven), `#1081`, `#934` prune half,
   `#1419`, `#1013/#1198`.
4. **Localized docs** (`ja-JP`, `ko-KR`) carry an older `claude-opus-4-6` and are separately
   stale — fold into a doc pass or leave.

---

*Provenance: analysis produced 2026-07-13 against `main` and `upstream/main`. Upstream ADRs
and capability source read from `upstream/main` (the `_reference/` mirror is stale at
`1.3.1-dev`, pre-capability). All file:line citations verified at time of writing; re-verify
before implementation — the code moves.*
