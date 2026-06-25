# Design Inventory — [PROJECT_TITLE]

**Ingested:** [DATE] · **Design source:** [path-or-link from PROJECT.md `## Mode` → Design input] · **Form:** [figma | generated-export | deployed-prototype | tokens-package | in-repo-system]

> The normalized, in-repo **fidelity oracle** for a provided design — the design-side mirror of `LEGACY-INVENTORY.md`. Written by the first design-ingesting step that runs — `model-domain` (full-stack), `frontend-architecture` (frontend-led, where model-domain is often skipped), or the `planner` as a fallback (when neither ran) — and read by the design-fidelity gate (`gsd-plan-checker` at plan time, `gsd-verifier` at build time), which diffs the built **observable shape** against this file — never the raw design (the Read-only gate agents can't fetch a Figma URL). The gate fires on any built field that **backs** a covered surface — a **schema column, DTO/contract, or UI field** — not only when UI files changed, so a backend/data-schema phase can't slip the diff; the `Backs (surface field)` column below is what lets the gate map a built schema column to its single user-facing field. See `@~/.claude/gsd-core/references/design-ingestion.md` and `exploration-and-adaptability.md` § Source precedence.

## Covered surfaces

The screens / surfaces the provided design actually addresses. A phase whose surface is **not** listed here is greenfield-UX for that surface — the design-fidelity gate SKIPs it (do not read "all fields invented").

| Surface / screen | In the design? | Notes |
|---|---|---|
| [e.g. New deal form] | yes | |
| [e.g. Admin console] | no — design doesn't cover it | greenfield-UX for this surface |

## User-facing fields (THE field oracle)

Every field the user enters or sees, per surface, with **provenance**. The gate's rule keys on `Source`:
- `design` — the design collects/shows it → **required by the design; dropping it is a BLOCKER**.
- `requirement` — REQUIREMENTS need it but the design under-showed it → **legitimately kept** (design ∪ requirements), not an invention.
- `internal` — a modeling/normalization artifact the user never touches (value-object part, derived value, surrogate key) → **not user-facing; the gate ignores it.**

A built **user-facing** field that matches **no `design` or `requirement` row** here is an **invention → BLOCKER** (the address-failure guard: one `address` input must not become four required user-facing fields).

**The `Backs (surface field)` column is what makes a backend/schema phase verifiable.** A backend/data-schema phase often touches **no UI files** — so the gate can't see "user-facing fields changed." It instead extracts the built schema/DTO field names and diffs them here. For that diff to pass a legitimate column-split, each `internal` part must declare **which single user-facing field it backs**. So: when you split a `design` field (e.g. `address`) into persistence columns (`street`/`city`/`state`/`zip`), record each column as an `internal` row whose **Backs** points at that one `design` field. A built schema column that **Backs** a covered user-facing field is faithful; a built column that surfaces as a **new required user-facing field backing nothing** is the invention the gate blocks. Leave **Backs** blank for genuinely user-facing rows (`design`/`requirement`) and for surrogate keys that back nothing.

| Field (user-facing label/name) | Surface / screen | Source | Required? | Backs (surface field) | Captured shape (what the user enters) | Notes |
|---|---|---|---|---|---|---|
| [e.g. address] | New deal form | design | yes | — | single free-text input | one input — internal `Address` VO / column-split is allowed; 4 required user inputs is NOT |
| [e.g. street] | (persistence) | internal | — | address | — | column-split of `address`; not user-facing, backs the one design field |
| [e.g. apartment_no] | New deal form | requirement | no | — | text | design under-showed; REQ-12 needs it |
| [e.g. addressId] | (persistence) | internal | — | — | — | surrogate key, never user-facing, backs nothing |

## Screens & flows

| Screen / flow | Steps / states the design specifies | Notes |
|---|---|---|
| [e.g. Create deal] | empty → filling → submitting → success/error | |

## Reconciliation notes (design ∪ requirements; gaps surfaced, never silently invented)

- [States/fields the design omits that requirements need — recorded as `requirement`-sourced above, not dropped.]
- [Open questions — named, bounded.]
