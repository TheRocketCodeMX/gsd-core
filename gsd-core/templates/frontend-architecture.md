# Frontend Architecture — [PROJECT_TITLE]

**Decided:** [DATE] · **Status:** Accepted

> Global frontend architecture. Per-phase visual design (tokens/copy/components in use) lives in each phase's UI-SPEC, which records — but does not re-decide — the choices below.

## Mode

[Detected combination — Origin (greenfield / brownfield-extend / rewrite) × Design-input (none / provided design / existing design system) × Code-quality (clean / legacy / vibe-coded). For brownfield/vibe-coded, the evolution posture (Follow/Improve/Refactor) + any UI-hardening gaps.]

## Backend topology it follows

[From the ADR — Axis A/B. How it shapes the FE: e.g. event-driven → socket→cache reconciliation; CQRS → read-model shapes; modular monolith vs services → how the FE talks to the API. The FE state/cache strategy follows this.]

## The FE floor (always-on — exempt from the meta-tell)

- Feature/domain folders (colocation) — modules mirror the backend bounded contexts
- One typed data port (no ad-hoc fetch); a thin data-fetching abstraction
- Server-state separated from client-state
- Derive-don't-sync — view is a pure function of state; effects only at the external boundary
- Unidirectional dependency flow (shared → features → app), lint-enforced
- Semantic HTML before ARIA

## Rungs decided (each non-floor rung ↔ its concrete trigger)

| Decision | Choice | Trigger that earned it (or "floor") |
|---|---|---|
| Module architecture | [feature folders / full FSD] | [trigger] |
| Client state | [local / small store / Redux-class] | [trigger; "if a refetch could replace it, it's not client state"] |
| State machine | [none / XState-class for which flows] | [invalid-states-impossible trigger] |

## State management

[Server-cache library for server state; client-state approach; optimistic-update approach; real-time → socket→cache bridge if applicable.]

## Rendering strategy

[Server/static-first; client at the boundary; the per-surface choice (static/ISR/SSR/RSC/CSR). RSC caveat if relevant.]

## Design system + insulation

- **Token layering:** tokens → semantic → component (CSS custom properties; DTCG format)
- **Primitive vendor (picked once here):** [chosen primitive — see Verified libraries]
- **Insulation pattern:** [on / deferred] — [trigger: multi-brand / churn risk / reuse ~10 uses]. When on: only `design-system/primitives/` imports the vendor; `no-restricted-imports` lint elsewhere; CSS-variable tokens; a vendor swap edits one folder.

## Verified libraries (as of [DATE] — re-verify before adoption)

| Concern | Chosen | Why (maintenance health / fit) | Risk flags |
|---|---|---|---|
| UI primitives | [X] | [cited evidence] | [if any] |
| State | [Y] | [cited evidence] | [if any] |
| FE↔BE contract | [Z] | [per fe-be-seam matrix] | [if any] |

## FE side of the seam

[Contract mechanism; FE branches on the machine `code`, owns localized user copy, has a fallback for unknown codes; never renders raw `detail`. Per `fe-be-seam.md`.]

## FE-signal telemetry

[FE logs only client-only signals (unhandled errors, web-vitals, network failures); analytics journey events client-side from the typed catalog; `traceparent` propagated FE→BE. Per `application-telemetry.md`.]

## Over-/under-engineering check

[Each non-floor rung ↔ its current concrete trigger. Anything without a trigger dropped to the floor. Any documented need not captured → raised.]

## Consequences / notes

[Trade-offs, promotion triggers (what would later move a rung), and anything the planner/executor must honor.]
