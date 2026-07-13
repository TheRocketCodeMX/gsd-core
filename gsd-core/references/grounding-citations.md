# Grounding Citations — How the Plan Proves It Read the Sources

The `## Grounding` block in every PLAN.md is where the planner proves it grounded in the project's active sources instead of memory/abstractions. `check.grounding-plan` (blocking) parses this block and **cross-checks each citation against the actual source file** — a missing or mismatched *required* source blocks the plan (`exit 1`). Because the cited value is the project-specific decision that exists only in that file, you cannot write it correctly without reading the file.

## The required set (what you MUST cite)

The gate requires a citation for every strategy source marked **`done`** in PROJECT.md's `## Strategy Plan`, plus any `DESIGN-INVENTORY.md` / `LEGACY-INVENTORY.md` present. **Skipped** steps (in the skip-ledger) and **not-yet-run** steps are NOT required — cite only what exists. A project with no strategy artifacts yet requires nothing (the engineering-standards floor still applies).

Get the exact set: `gsd_run query grounding required`.

## The line format

One citation per line inside `## Grounding`:

```
- <ARTIFACT> · <key> → <value>
```

The separators are **`·` (U+00B7, middle dot)** between artifact and key, and **`→` (U+2192, right arrow)** between key and value — never `:` or `-` (they collide with subdomain colons and rung names). Keys/values may contain spaces.

## What to cite per source (the high-entropy, un-guessable cell)

Cite the decision that only that file holds, **keyed to its unit**:

| ARTIFACT | key (unit) | value (cite this) |
|---|---|---|
| `ADR` | subdomain | the rung as a **compound set** exactly as the ADR row records it — `Domain Model + Hexagonal`, not just `Domain Model` (checked by set-equality) |
| `DOMAIN-MODEL` | subdomain | the `Type` (`Core` / `Supporting` / `Generic`) |
| `TEST-STRATEGY` | subdomain | the **primary level** — the leading `small` / `medium` / `large` token |
| `DESIGN-INVENTORY` | `<field> @ <surface>` | `<source-enum> / <shape>` — e.g. `design / single input` (source ∈ design/requirement/internal) |
| `SECURITY-STRATEGY` | app / resource | derived ASVS level + authz model (e.g. `L2 / RBAC+ReBAC`) |
| `FRONTEND-ARCHITECTURE` | app / feature | chosen state rung + rendering strategy |
| `INFRA-STRATEGY` | component | compute rung + promotion trigger |
| `CICD-STRATEGY` | pipeline | deploy-ladder rung + PR-gate tier mapping |
| `PRODUCT-BRIEF` | product | outcome metric + wedge + a must-NOT |
| `LEGACY-INVENTORY` | subsystem / region | salvage disposition + parity disposition |

Never cite a `[...]` placeholder cell — an unfilled source artifact fails the gate.

## Source-direct citations (the literal sources)

When the phase grounds in a **literal source file** — an exported design (Stitch/Claude/Figma-Make HTML/CSS), legacy code to refactor, a vibe-coded prototype, or an additional context app — cite a specific fact **with its `file:line`**, which the gate greps against the real file:

```
- SOURCE · <fact> → <path>:<line>
```

e.g. `- SOURCE · single address input → design/checkout.export.html:142`. This forces reading the source itself, not a distillation. For coverage-bearing exploration, cite the enumeration (every screen/endpoint), mirroring the LEGACY-INVENTORY coverage matrix.

## Example

```markdown
## Grounding
- ADR · pricing → Domain Model + Hexagonal
- DOMAIN-MODEL · pricing → Core
- TEST-STRATEGY · pricing → small
- DESIGN-INVENTORY · address @ signup → design / single input
- SOURCE · single address input → design/signup.export.html:88
```

## Consumes / produces

- **Consumed by** the planner (writes the block) and `check.grounding-plan` (verifies it). The required set comes from `gsd-tools grounding required` (the `## Strategy Plan`); the cross-check reads each source file directly. Pairs with `exploration-and-adaptability.md § Source precedence` (the authority the citations honor) and `engineering-standards.md` (the floor that applies regardless).
