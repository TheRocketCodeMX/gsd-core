# Frontend Architecture — Floor, Triggers, State & Design System

The frontend half of the architecture doctrine — owns client structure, state, rendering, and the design system. Mirrors `architecture-decision.md` for the client; training data skews backend-brained, so this half is the one most often under-built (yet it's the harder half: state, optimistic rendering, the network boundary).

Runs **after `recommend-architecture`** (backend topology drives FE cache/read-model shape — event-driven → cache-reconciliation; CQRS → read-model shapes); conditional on a frontend existing. The seam (contract/errors) is `fe-be-seam.md`'s; telemetry (logging/analytics) is `application-telemetry.md`'s — this owns FE structure, state, rendering, design system. Library names are **leaves** (runtime-verify per `exploration-and-adaptability.md`).

## The calibration spine (FE half — both directions are failures)

Same threshold-up doctrine as the backend: **simple = smart code that follows best practices and is navigable by humans and AI agents — not simplistic/under-engineered.** The FE floor is higher than most assume; rungs above it are earned by concrete triggers. The dominant AI-era FE failure is **under-building the core** (flat dumps, server data in a client store, business rules in components) **while over-scaffolding features** (FSD on a 5-screen app, a hexagon around the SPA).

## The FE floor (always — even for "simple")

Applies to *every* frontend; skipping it is under-engineering, not minimalism:

- **Feature/domain folders** (colocation / "screaming architecture") — strategic-DDD feature modules mirroring the backend bounded contexts.
- **One typed data port** — the contract hooks from `fe-be-seam.md`; no ad-hoc `fetch`. A *thin* data-fetching abstraction (the best abstractions are not configurable).
- **Server-state separated from client-state** — most "state" in a CRUD/orchestration app is server cache, not app state.
- **Derive, don't sync; side-effects only at the external boundary** — the view is a pure function of state; derived values are computed, not stored-and-synced (React effects / Vue computed / Svelte derived / Angular signals); effects exist only to synchronize with external systems.
- **Unidirectional dependency flow** (shared → features → app), lint-enforced.
- **Semantic HTML before ARIA** (the accessibility floor).

## The FE rungs — earn each with a trigger

| Rung | Move up when | Over-engineering tell |
|---|---|---|
| **Local state / colocation** (floor) | UI-only, synchronous, owned by one subtree | — |
| **Context / provide-inject** | genuine deep prop-drilling that composition can't fix | Context for state living in one subtree; Context as a store → re-render storms |
| **Global client store** (small store default; Redux-class only for complex shared sync logic) | large, frequently-changing, cross-cutting *client* state, multi-author | a global store for *server* data (hand-rolling caching) — the canonical under-engineering failure |
| **State machine** | invalid states must be made impossible (wizards, ceremony flows) | a state machine for a boolean toggle |
| **Layered FE architecture (full FSD)** | domain-heavy, multi-contributor codebase outgrowing simple modules | all FSD layers + full segment trees on a small app |
| **Tactical FE-DDD (client aggregates/VOs)** | the client genuinely owns rich invariants (offline/local-first) | client aggregates duplicating authority the backend owns |

**The meta-tell:** if you cannot point to a current, concrete trigger, you are over-engineering; if such a trigger exists and you skipped the structure, you are under-engineering. *(The FE floor above is always-on and exempt — it is the baseline, not a rung.)*

## State management

- **Server state** (fetched from a backend you don't own — async, shared ownership, can go stale) → a **server-cache library**. The right default for the bulk of app state.
- **Client state** (UI-only, synchronous, owned) → local state, or a small store for genuinely global UI; Redux-class only for complex shared sync logic. **The test: "if a refetch could replace it, it's not client state."**
- **Optimistic updates:** one place shows the value → track in-flight variables, no rollback. Multiple components must update at once → the full snapshot → mutate → rollback-on-error → invalidate-on-settle dance. *Trap:* always cancel in-flight refetches first, or a stale response clobbers the optimistic value.
- Forms → a form library; URL state → the router. Real-time (websocket) reconciles **into** the server-cache via one socket→cache bridge — not a parallel store.

## Rendering strategy

- **Default to the server/static; reach for the client at the boundary.** Static content → static generation; mostly-static-periodically-fresh → revalidate/ISR; per-request personalized → SSR; data-heavy non-interactive subtrees → server components; highly-interactive behind-auth shells → client.
- **The JS-toggle vs CSS-hide question is an accessibility decision first, a perf decision second** — *who should perceive this?* Unmount (not in DOM, gone for everyone) · `display:none`/`hidden` (gone for everyone incl. screen readers, preserves state) · visually-hidden/`.sr-only` (gone visually, **available to screen readers**; must reveal on focus) · `aria-hidden` (visible, hidden from screen readers). Decide by intent, then optimize hydration cost (large inactive trees → unmount; small toggles → CSS-hide).
- **RSC caveat (version-sensitive):** in practice RSC means adopting a host framework with mature RSC support (today one is clearly production-dominant; others emerging — runtime-verify), with eyes open to the real, survey-documented friction (~⅓ positive sentiment among adopters). Do not treat RSC as the universal default.

## Design system & UI primitives

The durable backbone, independent of which library wins:

- **Token layering:** tokens → semantic/alias → component tokens → components, as CSS custom properties (multi-brand = data, not forks). Standardize on the DTCG token format (W3C Community Group stable report, Oct 2025 — note: not a W3C Standard). This layer outlives every primitive vendor.
- **Headless primitives + your appearance.** The cross-framework principle: **headless primitives own behavior + accessibility (WAI-ARIA/APG); you own appearance via tokens.** On native mobile (SwiftUI/Compose/Flutter) the OS owns control behavior, so the principle degrades to its **tokens half** (semantic colors / token tiers / theme extensions).
- **Pick by durable criteria, not a frozen name** — maintenance health · funding/ownership & bus factor · framework-version nativeness · a11y/APG depth · headless-vs-styled / lock-in · ecosystem momentum · distribution (copy-in vs dependency). Then **runtime-verify the current best-maintained primitive for the detected framework**. *(This is the global, once-per-project primitive-vendor choice; per-phase `UI-SPEC` records the chosen primitive + the specific blocks/tokens a phase uses — it does not re-decide the vendor.)*
- **The insulation pattern (triggered):** only `design-system/primitives/` imports the vendor; a `no-restricted-imports` lint forbids it elsewhere; the public component API + CSS-variable tokens are the seam, so a vendor swap edits one folder. Gate behind a trigger (multi-brand, real churn risk, or reuse ~10 uses) — don't wrap on day one (the wrapper of an everything-component just becomes a copy of it).

## The FE is a driving adapter — no hexagon around the SPA

Does clean architecture translate? **Strategic-DDD yes** (feature modules + bounded-context boundaries scale with team size); **tactical FE-DDD rarely** (only when the client owns invariants); **a full hexagon around the SPA, no** — the frontend is *already* a driving adapter in the backend's hexagon, so its only port is the data boundary. A four-ring onion inside the SPA is backend-brained over-engineering.

## Anti-patterns (both directions)

- **Under-engineering:** server data in a client store with hand-rolled caching; business/validation/error-classification logic in components; flat `components/`+`utils/` dump with no domain vocabulary; ad-hoc fetch everywhere; skipping semantic HTML/ARIA.
- **Over-engineering:** Redux-first; effects/watchers used for derived/transform state (`useEffect`/`watch` for what should be computed — the #1 modern FE anti-pattern); dogmatic container/presentational split (its inventor retracted it — extract a hook instead); micro-frontends by default; a hexagon around the SPA; a formal design-system pipeline for a single small app; a heavy UI/util library for trivial needs.

## Consumes / produces

- **Consumes:** `recommend-architecture`'s ADR, `DOMAIN-MODEL.md`, `fe-be-seam.md`, `application-telemetry.md`, any provided design/design-system (read it per `design-ingestion.md`; `sketch-*` for GSD's own design capture), and the live ecosystem (runtime-verify state/primitive libs).
- **Produces:** the FE architecture decision (module structure, state strategy, rendering strategy, design-system + insulation, the FE side of the seam) — recorded for `plan-phase`/`execute-phase` and the UI skills.

*Basis: React docs (server vs client state; effects); TanStack Query / TkDodo; Abramov (container/presentational retraction); Feature-Sliced Design; Cockburn (the UI as a driving adapter); WAI-ARIA/APG; W3C DTCG; primitive-maintenance research + State-of-React/CSS + ThoughtWorks Tech Radar (2026); the calibration doctrine in `engineering-standards.md` / `architecture-decision.md`. Full citations in the research corpus.*
