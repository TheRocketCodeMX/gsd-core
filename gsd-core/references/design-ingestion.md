# Design Ingestion — Reading a Provided Design Into the Build

How GSD turns a **provided design** into the build's UX/scope spec. The mode taxonomy names the forms (`exploration-and-adaptability.md`'s Design-input dimension); this file is the **how** — the per-form reading mechanics that were previously missing. Consumed by `ui-researcher`, `frontend-architecture`, and `legacy-inventory` whenever PROJECT.md `## Mode` records a provided design.

> Not to be confused with `ui-brand.md` (that's GSD's *CLI output* styling — banners/status symbols, for orchestrators). This is about ingesting a *product* design.

## The single-pointer rule (recap)

The design's location is recorded **once** in PROJECT.md `## Mode` → **Design input** (a path or link). Every distilling skill ingests **that same source** — never re-locate a different one, so they can't drift. Read the pointer first; if it's empty, there is no provided design (greenfield-UX) — do not invent one.

## Read by form (runtime-verify the tool — don't hardcode one)

The Design-input value tells you the form. Use the best-maintained current reader for it (check what's available — an MCP/API, a CLI, or fetch tools — per the runtime tech-selection discipline); fall back to asking the user for an export when no programmatic reader is available.

- **Figma file / link** — if a Figma API token or Figma MCP is available, pull frames + styles + variables (tokens) directly. Otherwise ask the user to export (key frames as images + a tokens/styles/variables export, e.g. a Design Tokens JSON) or paste screenshots of the core screens. Extract: color/type/spacing tokens, component inventory, screen list, states, and flows.
- **Stitch / Claude-generated / other generated-design export** — parse the exported artifact (often HTML/CSS or a React/component export, sometimes images + a spec). Lift the same: tokens, components, screens, states. The generated code is a *design reference*, not necessarily the target implementation — extract intent, then build to the project's chosen stack/rung.
- **Deployed / clickable prototype (URL)** — scrape the rendered pages with the available fetch tools (`WebFetch` / firecrawl). Capture structure, copy, and visual tokens (from computed CSS), and enumerate screens + states by walking the routes. Treat it as the behavior+UX oracle, reconciled against requirements.
- **External tokens / component package (npm dependency or separate repo)** — read the package: the tokens file + the component API. **Honor it, don't reinvent** — this is "an existing design system to honor."
- **In-repo design system** — scout `tailwind.config`/`components.json`/tokens files + existing components (the `ui-researcher` already does this). Honor the established primitives.

## Normalize to one reading

Distill whatever form into the **UI-SPEC contract** (screens · components · tokens: color/type/spacing · copy · states · flows) — one canonical reading so `ui-researcher`/`frontend-architecture`/`legacy-inventory` consume the *same* distillation, not the raw source re-interpreted differently each time.

- **Single phase / one screen:** distill inline into the phase's UI-SPEC — no extra artifact.
- **Multi-consumer / a rewrite (the design spans the whole app):** record a normalized `DESIGN-INVENTORY.md` (the design-side mirror of `LEGACY-INVENTORY.md`) once, and have every distiller read it. Recommended only when more than one skill ingests the design or the surface is large — don't manufacture the artifact for a small design.

## Reconcile — never assume the design is complete

Designs routinely **under-show already-built behavior** and omit edge/empty/error states. Reconcile the design against code + requirements before treating it as final. Precedence on conflict (from `exploration-and-adaptability.md` / `brownfield-adaptation.md`): the **locked design wins on UX/scope/structure**; the **canonical spec wins on domain facts**; **old code is the authority on what was actually built** (hidden behavior) — never on quality. Surface gaps (a flow the design omits, a state it doesn't draw) rather than silently inventing them.

## Honored downstream as a fidelity contract

The distilled UI-SPEC is a **fidelity contract**: the executor matches it (`gsd-executor` from-design), `ui-checker` validates against it *with a design-override* (a value faithful to the provided design is not a violation even if it exceeds house defaults — see `ui-checker`), and the in-loop verifier checks design fidelity for from-design phases. Don't push house defaults over a provided design.

## Sufficiency stop

Ingest enough to build the phase confidently — the core screens/tokens/flows in scope — then stop. Don't exhaustively catalog a 200-screen design to ship one phase; ingest the slice the phase needs (the rest is ingested as later phases reach it).

## Consumes / produces

- **Consumes:** the PROJECT.md `## Mode` Design-input pointer, the design source (in its form), and — for reconciliation — REQUIREMENTS + existing code. Pairs with `ui-brand.md` (CLI output, distinct), the `sketch-*` references (GSD's own design-decision capture), and `exploration-and-adaptability.md` (the DESIGN exploration + precedence).
- **Produces:** the normalized design reading feeding UI-SPEC (and, for large/multi-consumer designs, `DESIGN-INVENTORY.md`) — honored as a fidelity contract through build + verify.
