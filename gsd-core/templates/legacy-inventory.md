# Legacy Inventory — [PROJECT_TITLE]

**Inventoried:** [DATE] · **Mode:** [rewrite-with-design | rewrite-without-design | vibe-coded-harden] · **Infra:** [reused | from-scratch]

> Derived requirements = (design) ∪ (old-system behavior), reconciled. "Never lose a feature" — every capability below is covered by a requirement or explicitly dropped with sign-off.

## Coverage matrix (the old system's full surface)

| Surface area | Present? | What's there (file:line / notes) | V/I |
|---|---|---|---|
| Modules / services | | | |
| HTTP endpoints / APIs | | | |
| DB tables + migrations | | | |
| Background jobs / crons | | | |
| External integrations | | | |
| Roles / permissions | | | |
| Env / secrets | | | |
| CI/CD config | | | |
| Infra resources | | | |
| Seed / reference data | | | |
| Admin / internal tools | | | |
| Notification / email / SMS templates | | | |
| Feature flags | | | |
| Auth / identity / PII handling | | | |
| Shadow-IT / manual processes | | | |

**Honest coverage:** [covered N/M areas; what was skipped and why]. **Open questions:** [named, bounded].

## Three-way gap map (design × old-code × requirements)

| Bucket | Items | Decision |
|---|---|---|
| **In old, not in design** (the dangerous bucket) | [capabilities the old app has that the design under-shows] | [keep = missed requirement / drop with sign-off] |
| **In design, not in old** | [genuinely new] | build |
| **In both** | [salvage-candidates] | see dispositions |
| **In neither, but needed** | [gaps] | build |

*(Without a new design: two-way — old-behavior × new-structure.)*

## Salvage dispositions (per subsystem — default Rebuild)

| Subsystem | Quality | Coupling to debt | Coverage | Mappability | FE/BE | Disposition | Char-test gate? |
|---|---|---|---|---|---|---|---|
| [name] | | | | | FE→rewrite / BE→? | Retire / Retain / Refactor-salvage / Rebuild | [yes if behavior preserved] |

FE is always rewritten to the new design. BE logic salvaged = adapted onto the **new clean schema** (from DOMAIN-MODEL), never the old tables.

## Characterization-test gates

[Subsystems whose behavior must be preserved → pin OLD behavior with characterization tests first, run as the parity oracle before cutover. Not for Retire.]

## Reuse-infra plan (if infra reused)

[Reused: cloud project / secrets / DB / domains. Safe sequence: expand schema (additive) → dual-write/backfill → verify → backup → cutover (blue-green/canary) → contract (mandatory). What's reused vs migrated. Detail → infrastructure-strategy / cicd-strategy.]

## Source-of-truth precedence (for the conflicts found)

Locked design wins on UX/scope/structure · canonical spec wins on domain facts (roles/entities) · old code is the authority on actual + hidden behavior (never on quality/structure). [Record the conflicts resolved by this rule.]
