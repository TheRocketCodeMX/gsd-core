# Grounding Citations — How the Plan Proves It Read the Sources

The `## Grounding` block in every PLAN.md is where the planner proves it grounded in the project's active sources instead of memory/abstractions. `check.grounding-plan` (blocking) parses this block and **cross-checks each citation against the actual source file** — a missing or mismatched *required* source blocks the plan. The command itself always exits 0 and reports `{ passed: false, problems: [...] }` JSON; the **workflow gate** (plan-phase's `jq -e '.passed == true'` check) is what turns a failed report into a hard stop. Because the cited value is the project-specific decision that exists only in that file, you cannot write it correctly without reading the file. **Every citation line must pass** — one valid citation cannot carry a mismatched sibling line.

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

Cite the decision that only that file holds, **keyed to its unit**. The **Check** column is honest about what the gate mechanically verifies per artifact:
- **cross-checked** — the gate parses the source's table and verifies the cited key/value against the real row; a mismatch or unknown key blocks.
- **row-checked** — the gate verifies the cited key names a real row in the source's table (a fabricated key blocks); the value is not value-matched.
- **mention-only** — the gate verifies a citation for the artifact exists and is not a `[...]` placeholder, but does NOT verify the value against the file (no single canonical key table to check). Cite honestly — a reviewer, not the script, is the backstop here.

| ARTIFACT | key (unit) | value (cite this) | Check |
|---|---|---|---|
| `ADR` | subdomain | the rung as a **compound set** exactly as the ADR row records it — `Domain Model + Hexagonal`, not just `Domain Model` (checked by set-equality) | cross-checked |
| `DOMAIN-MODEL` | subdomain | the `Type` (`Core` / `Supporting` / `Generic`) | cross-checked |
| `TEST-STRATEGY` | subdomain | the **primary level** — the leading `small` / `medium` / `large` token | cross-checked |
| `DESIGN-INVENTORY` | `<field> @ <surface>` | `<source-enum> / <shape>` — e.g. `design / single input` (source ∈ design/requirement/internal) | cross-checked |
| `LEGACY-INVENTORY` | subsystem (a salvage-dispositions row) | salvage disposition + parity disposition | row-checked |
| `SECURITY-STRATEGY` | app / resource | derived ASVS level + authz model (e.g. `L2 / RBAC+ReBAC`) | mention-only |
| `FRONTEND-ARCHITECTURE` | app / feature | chosen state rung + rendering strategy | mention-only |
| `INFRA-STRATEGY` | component | compute rung + promotion trigger | mention-only |
| `CICD-STRATEGY` | pipeline | deploy-ladder rung + PR-gate tier mapping | mention-only |
| `PRODUCT-BRIEF` | product | outcome metric + wedge + a must-NOT | mention-only |

(`SOURCE` lines are always grep-verified against the real file — see below.) Never cite a `[...]` placeholder cell — an unfilled source artifact fails the gate.

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
