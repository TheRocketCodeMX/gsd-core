---
type: Added
pr: 3
---
Source-fidelity: every agent now grounds in the literal sources of truth (a provided design, legacy code, a vibe-coded prototype, external dependencies) alongside the strategy artifacts — never from an abstraction (DOMAIN-MODEL/ADR/UI-SPEC/PLAN) in place of the source it distills. Closes the laundering failure where a from-design build turned one `address` input into an invented street/city/state/zip schema. Adds a canonical 5-source precedence rule (`exploration-and-adaptability.md` § Source precedence — design owns the observable shape, legacy owns behavior-to-preserve never structure, vibe owns intent, dependency owns its real contract), a shared in-repo provenance-tagged design oracle (`DESIGN-INVENTORY.md`), grounding in `model-domain`/`planner-source-audit`/the researchers, a per-source fidelity gate in `gsd-verifier`+`gsd-plan-checker` (invented/dropped user-facing field = BLOCKER; internal value-objects allowed), a disposition-gated parity gate that exempts design-mandated changes (the gap-map allowlist), and a vibe intent-gate (harden intent, never pin the prototype's bugs as a parity oracle). Names source-fidelity as a third failure axis in `engineering-standards.md`.

<!-- docs-exempt: framework-internal behavior; its documentation ships in gsd-core/references/ (loaded by the agents) + the DESIGN-INVENTORY template, not under docs/ -->
