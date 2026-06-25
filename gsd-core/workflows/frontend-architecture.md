<purpose>
Recommend a frontend architecture matched to the backend topology and the product — module structure, state, rendering, design system, and the FE side of the FE↔BE seam — avoiding both over- and under-engineering. Runs after recommend-architecture, only when the project has a frontend, before testing-strategy/plan-phase. The FE shape FOLLOWS the backend topology. Recommends; the user decides. Produces `.planning/FRONTEND-ARCHITECTURE.md`, registered as a canonical reference every later phase follows. Owns GLOBAL frontend architecture; per-phase visual design stays with ui-phase (UI-SPEC).
</purpose>

<required_reading>
@~/.claude/gsd-core/references/frontend-architecture.md
@~/.claude/gsd-core/references/fe-be-seam.md
@~/.claude/gsd-core/references/application-telemetry.md
@~/.claude/gsd-core/references/exploration-and-adaptability.md
@~/.claude/gsd-core/templates/frontend-architecture.md
</required_reading>

<process>

## Step 1: Initialize

```bash
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; if [ -f "$GSD_TOOLS" ]; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif command -v gsd-tools >/dev/null 2>&1; then GSD_TOOLS="$(command -v gsd-tools)"; gsd_run() { "$GSD_TOOLS" "$@"; }; elif [ -f "$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and gsd-tools is not on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi
COMMIT_DOCS=$(gsd_run query config-get commit_docs 2>/dev/null || echo "true")
RESPONSE_LANG=$(gsd_run query config-get response_language 2>/dev/null || true)
ls .planning/PROJECT.md >/dev/null 2>&1 && echo "PROJECT_FOUND" || echo "NO_PROJECT"
ls .planning/adr/*.md >/dev/null 2>&1 && echo "HAS_ADR" || echo "NO_ADR"
ls .planning/FRONTEND-ARCHITECTURE.md >/dev/null 2>&1 && echo "EXISTS" || echo "NEW"
```

**If `NO_PROJECT`:** Stop — "No project found. Run /gsd:new-project first." Exit.

**If `NO_ADR`:** unless recommend-architecture is a ledgered skip (`gsd_run query project strategy-skipped recommend-architecture --raw` = `true` → note once, don't re-offer), tell the user "No architecture decision found — I'll derive the FE shape from PROJECT.md/REQUIREMENTS directly. (Consider `/gsd:recommend-architecture` first — backend topology shapes the FE.)" Then proceed with the docs at hand (the ADR sharpens it; it is not required).

**If `RESPONSE_LANG` non-empty:** all user-facing text in that language; keep technical terms, code, library names, and rung labels in English.

**Text mode** (`--text` OR `workflow.text_mode: true`): replace every `AskUserQuestion` with a plain-text numbered list.

**If `EXISTS` and not `--auto`:** ask Update / View / Skip (header "Frontend"). On Skip: exit ("Existing FRONTEND-ARCHITECTURE.md preserved."). On View: show then Update/Skip.

## Step 2: Has-a-frontend gate

Determine whether this project actually has a frontend (a browser/mobile/desktop UI), vs a backend-only service / CLI / data pipeline:

```bash
cat .planning/PROJECT.md 2>/dev/null | head -60
cat .planning/REQUIREMENTS.md 2>/dev/null | grep -iE 'ui|screen|page|frontend|web app|mobile|dashboard|component' | head
ls package.json >/dev/null 2>&1 && grep -iE 'react|vue|svelte|angular|next|nuxt|solid|astro|expo|flutter' package.json 2>/dev/null | head
```

**If there is clearly no frontend** (backend-only / service / CLI / pipeline): say so — "No frontend detected — `/gsd:frontend-architecture` is not needed; the FE↔BE seam + telemetry decisions for service-to-service/clients are owned by `recommend-architecture` and `application-telemetry`." Do not invent a frontend. **Then auto-advance: follow `@~/.claude/gsd-core/workflows/strategy-chain/modes/advance.md` with `CURRENT=frontend-architecture`** — in `--auto` it dispatches the next Strategy-Plan step (so the chain doesn't stall when FE is dispatched on a no-frontend project); interactively it prints `Next: /gsd:testing-strategy`.

**If unsure**, ask once (AskUserQuestion, header "Frontend"): "Does this project have a user-facing frontend (web / mobile / desktop)?" — Yes → continue; No → exit as above.

## Step 3: Load context + detect mode

```bash
cat .planning/adr/*.md 2>/dev/null | tail -200    # backend topology drives FE shape
cat .planning/DOMAIN-MODEL.md 2>/dev/null || true  # feature modules mirror bounded contexts
ls .planning/codebase/*.md >/dev/null 2>&1 && echo "HAS_MAPS" || echo "NO_MAPS"
```

**Read `@~/.claude/gsd-core/references/frontend-architecture.md` now** — the FE floor, the rung table (triggers + traps), state management, rendering, the design-system criteria + insulation, and "the FE is a driving adapter (no hexagon around the SPA)". **Read `fe-be-seam.md`** for the contract/error-copy split this skill decides the FE side of, and **`application-telemetry.md`** for the FE-signal logging/analytics side.

**Detect the mode-combination** per `@~/.claude/gsd-core/references/exploration-and-adaptability.md` (read the persisted `## Mode` from PROJECT.md if present — authoritative; else detect): Origin (greenfield / brownfield-extend / rewrite) × Design-input (none / a provided design to ingest / an existing design system to honor) × Code-quality (clean / legacy / vibe-coded). This selects behavior:
- **Brownfield / vibe-coded:** assess the existing FE (from `.planning/codebase/*.md` or the source) and recommend an *evolution* via decision cards (current → target → gap cost → Follow | Improve | Refactor), default Improve — never impose a from-scratch ideal. Honor the existing framework/state/primitive choices unless there's a concrete reason to change. For vibe-coded, note the UI-hardening gaps (a11y/semantic-HTML/contrast) to address.
- **From-design:** ingest the provided design (read it per `@~/.claude/gsd-core/references/design-ingestion.md` — Figma / prototype / export / tokens package, from the `## Mode` Design-input pointer) as the UX/scope input and reconcile against code + requirements (designs under-show built behavior); a rewrite forces a full FE rebuild (done incrementally) while old code stays the behavior oracle. **Write the field oracle:** this skill leads the from-design path for a frontend-only project (where `model-domain` is often optional/skipped), so if `.planning/DESIGN-INVENTORY.md` does not exist, record it from `@~/.claude/gsd-core/templates/design-inventory.md` as you ingest — the design's user-facing fields (tagged `source: design`) + covered surfaces — so the downstream design-fidelity gate has an in-repo oracle. If it already exists (model-domain wrote it), read + reconcile against it rather than re-distilling (normalize once, per `design-ingestion.md`).
- **Greenfield:** recommend the target structure from scratch.

**Backend topology drives the FE (state it):** read the ADR's Axis A/B. Event-driven / real-time → the FE needs cache-reconciliation (socket→cache bridge); CQRS → read-model shapes; modular monolith vs services → how the FE talks to the API(s). The FE state/cache strategy FOLLOWS these, it does not re-decide them.

**Grounding maturity governs depth.** When the ADR / DOMAIN-MODEL / a provided design already answer a question, draft-from-docs and confirm — don't re-interview. Reserve `AskUserQuestion` for genuine decision points and contradictions.

## Step 4: The FE floor + the trigger-gated rungs

**State the FE floor in the artifact (applies to every frontend, even simple):** feature/domain folders (colocation); one typed data port (no ad-hoc fetch); server-state separated from client-state; derive-don't-sync (the view is a pure function of state; effects only at the external boundary); unidirectional dependency flow (lint-enforced); semantic HTML before ARIA.

Then decide the rungs, each earned by a concrete trigger (the meta-tell — the floor is exempt). Use `AskUserQuestion` only where the docs don't already answer:
- **State management** (header "FE state"): server-cache library for server state (the default for the bulk of state); a small client store only for genuinely global UI state; a state machine only when invalid states must be impossible. The test: "if a refetch could replace it, it's not client state." Optimistic-update approach per the reference.
- **Module architecture:** feature/domain folders by default; the full FSD layer stack only for a domain-heavy multi-contributor codebase.
- **Rendering** (header "Rendering"): server/static-first; client at the boundary; choose per app type (content → static/ISR; per-request personalized → SSR; data-heavy non-interactive → server components; interactive-behind-auth → client). Note the RSC caveat (adopt a mature host framework with eyes open; not the universal default).

Record each rung → the concrete trigger that justifies anything above the floor. No trigger → stay at the floor. Do NOT wrap the SPA in its own hexagon (the FE is already a driving adapter — its only port is the data boundary).

## Step 5: Runtime library-verify (training is stale — verify, don't recall)

The best-maintained library changes yearly, so **do not hard-code a winner.** For the detected framework, WebSearch/WebFetch the **current** best-maintained options and score them on the durable criteria (maintenance health / release cadence · funding/ownership & bus factor · framework-version nativeness · a11y/APG depth where relevant · lock-in · ecosystem momentum · distribution model). Verify, with citations + access date:
- the **UI-primitive** library (headless behavior + a11y) for the framework,
- the **state** library (server-cache + client-state),
- the **contract** mechanism for the detected stack (per the `fe-be-seam.md` matrix).

Record the chosen libraries **dated** in the artifact ("as of YYYY-MM-DD; re-verify before adoption"), with the maintenance-risk flags found. Apply dependency-minimization both ways: a proven lib for the genuinely hard (a11y/validation), an owned few lines for the trivial.

## Step 6: Design system + the FE side of the seam

- **Design system:** token layering (tokens → semantic → component, as CSS custom properties; DTCG format) is the durable backbone. Headless primitives + your tokens. **Pick the primitive *vendor* ONCE here** (the Step-5 verified choice); the **insulation pattern** (only `design-system/primitives/` imports the vendor + a `no-restricted-imports` lint + CSS-variable tokens) is gated on a trigger (multi-brand / real churn risk / reuse ~10 uses). Per-phase `ui-phase`/UI-SPEC records the chosen primitive + the specific blocks/tokens a phase uses — it does NOT re-decide the vendor (state this boundary in the artifact).
- **FE side of the seam:** the contract mechanism (from Step 5) + the rule that the FE branches on the machine `code`, owns the localized user copy, and has a fallback for unknown codes (per `fe-be-seam.md`). 
- **FE-signal telemetry:** the FE logs only client-only signals (unhandled errors, web-vitals, network failures); analytics journey events fire client-side from the typed catalog; trace context (`traceparent`) propagates FE→BE (per `application-telemetry.md`).

## Step 7: Present recommendation & write the artifact

**Recommend, don't dictate.** Present via `AskUserQuestion` (header "Frontend"): your recommended FE architecture in one paragraph (floor + the chosen rungs + the verified libraries + the design-system/insulation decision + the seam side), how it follows the backend topology, and 1–2 alternatives with trade-offs. options: "Accept", "Adjust (I'll tell you what)", "Show alternatives".

Once approved, render `@~/.claude/gsd-core/templates/frontend-architecture.md` and write to `.planning/FRONTEND-ARCHITECTURE.md`. Capture *why* + trade-offs, the dated library choices, and the over-/under-engineering check (each non-floor rung ↔ its concrete trigger).

## Step 8: Commit

```bash
if [ "$COMMIT_DOCS" = "true" ]; then
  gsd_run query commit "docs: record frontend architecture" --files .planning/FRONTEND-ARCHITECTURE.md
else
  echo "FRONTEND-ARCHITECTURE.md written but not committed (commit_docs is false)."
fi
```

## Step 9: Wrap up

Display:
```
FRONTEND-ARCHITECTURE.md written — frontend architecture decided.

  Structure: [feature folders | FSD]; State: [server-cache + client-store]; Rendering: [strategy]
  Libraries (verified [DATE]): primitives=[X], state=[Y], contract=[Z]
  Design system: [token layering + primitive vendor]; insulation: [on/deferred]
  Seam: FE branches on code, owns copy; trace context propagated

Next: /gsd:testing-strategy   (test shape follows architecture) → plan-phase
```

**Auto-advance (chain):** after this skill, follow `@~/.claude/gsd-core/workflows/strategy-chain/modes/advance.md` with `CURRENT=frontend-architecture` — in `--auto` it dispatches the next `## Strategy Plan` step (honoring skips) onward to the build loop; interactive runs use the `Next:` pointer above.

**Roadmap reconciliation:** scan ROADMAP.md against the FE architecture — if a phase assumes a FE structure/state/rendering this decision reshapes, SAY SO explicitly and offer `/gsd:phase --edit` (or a roadmap refresh). Never leave a known contradiction unspoken.

</process>

<critical_rules>
- **The FE shape FOLLOWS the backend topology** (ADR). Read it first; don't re-decide it.
- **Floor always; rungs by trigger.** Every non-floor rung maps to a current concrete trigger or it drops to the floor (both-directions meta-tell). No hexagon around the SPA.
- **No hard-coded library winner.** Runtime-verify the current best-maintained primitive/state/contract libs for the framework; record dated with risk flags.
- **Own GLOBAL architecture only.** Do NOT re-decide per-phase visual design — that's `ui-phase`/UI-SPEC. Pick the design-system vendor once; UI-SPEC records it per phase.
- **Recommend, don't dictate.** Respect `commit_docs` / `response_language`. Skip cleanly when there's no frontend.
</critical_rules>

<success_criteria>
- Has-a-frontend gate applied (clean skip when none)
- FE stack + mode detected and recorded; backend topology consumed (FE shape follows it)
- FE floor stated; each non-floor rung tied to a concrete trigger
- Best-maintained primitive/state/contract libs runtime-verified for the framework, recorded DATED with risk flags (no hard-coded winner)
- Design-system layering + insulation decided; vendor picked once (no bleed into ui-phase/UI-SPEC territory)
- FE side of the seam + FE-signal telemetry decided, consistent with fe-be-seam.md / application-telemetry.md
- FRONTEND-ARCHITECTURE.md written and committed (when commit_docs is true); user directed to /gsd:testing-strategy
</success_criteria>
