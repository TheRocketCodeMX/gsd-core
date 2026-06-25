# Learn Catalog — The Concept Graph

The curriculum backbone for `/gsd:learn`. It defines **what is teachable**, **where each concept's truth lives** (the source reference + section), **what it depends on** (prerequisite edges), and **whether a beat is worth rendering visually**. The teaching engine (`teaching-pattern.md`) consumes a node from here and renders it concept-first, then application — it never re-authors content, it transforms the cited source section for a human learner.

**Why a catalog and not prose:** the value of `/gsd:learn` is one coherent teacher across every domain. That coherence is only enforceable if every lesson traces to a single source of truth and the graph is machine-checkable. A node whose `source` doesn't resolve to a real reference section is a build failure (`tests/learn-catalog-*.test.cjs`), not a silent gap.

## Node schema

Each row is one concept node:

| Field | Meaning |
|---|---|
| **ID** | stable kebab id, track-prefixed (`test-doubles`). Lessons, progress, and prereq edges reference it. |
| **Concept** | the learnable unit — taught **concept first (what it is, clearly), then application (when/why/how-it-fits)**. |
| **Source** | `reference.md § Section` — the authoritative content the five beats draw from. Single source of truth: update the skill → the lesson updates. |
| **Prereqs** | node IDs that must be understood first (the graph edges guided mode walks). `—` = entry node. |
| **Visual** | `diagram` (graphviz concept figure) · `code` (code-both-ways side-by-side) · `—` (terminal-only). Drives the optional browser layer. |

**Cross-track rule:** a concept lives in exactly ONE track (its home) and is referenced by ID from others — never duplicated. `test-contract` is the home of contract testing; the Seam track links to it. `sec-secrets` is the home of secrets; CI/CD and Ops link to it.

---

## Track 1 — Domain & modeling
Source skill: `domain-modeling.md`

| ID | Concept | Source | Prereqs | Visual |
|---|---|---|---|---|
| `dom-ubiquitous-language` | Ubiquitous language — why shared vocabulary is load-bearing; polysemes as boundary signals | `domain-modeling.md § 1. Ubiquitous language` | — | — |
| `dom-subdomain-distillation` | Core vs supporting vs generic — and what each means for where you invest | `domain-modeling.md § 2. Subdomain distillation` | `dom-ubiquitous-language` | diagram |
| `dom-complexity-rubric` | How you actually tell if something is "core" — the complexity-signals rubric | `domain-modeling.md § What "complex" means` | `dom-subdomain-distillation` | — |
| `dom-strategic-vs-tactical-ddd` | The two halves of DDD; why tactical-without-strategic (DDD-Lite) fails | `domain-modeling.md § Core principle: separate strategic from tactical DDD` | `dom-subdomain-distillation` | — |
| `dom-bounded-contexts` | Surfacing context boundaries via big-picture event storming | `domain-modeling.md § 3. Bounded contexts` | `dom-subdomain-distillation` | diagram |
| `dom-context-mapping` | Naming the relationships between contexts (ACL, conformist, shared kernel, OHS…) | `domain-modeling.md § 4. Context mapping` | `dom-bounded-contexts` | diagram |

## Track 2 — Architecture
Source skills: `architecture-decision.md`, `engineering-standards.md`

| ID | Concept | Source | Prereqs | Visual |
|---|---|---|---|---|
| `arch-floor` | The floor — Functional-Core/Imperative-Shell + dependency inversion at true boundaries | `architecture-decision.md § The floor` | — | diagram |
| `arch-transaction-vs-domain-model` | Transaction Script vs Domain Model; the anemic-model trap | `architecture-decision.md § Axis A — domain logic` | `arch-floor` | code |
| `arch-hexagonal` | Hexagonal / Ports & Adapters = Clean = Onion — one principle, three names; the second-adapter trigger | `architecture-decision.md § Axis A` (Hexagonal/Clean rung) | `arch-transaction-vs-domain-model` | diagram |
| `arch-cqrs` | CQRS — separate read/write models; the divergence trigger | `architecture-decision.md § Axis A` (CQRS rung) | `arch-transaction-vs-domain-model` | diagram |
| `arch-eda-vs-event-sourcing` | Event-driven (communication style) vs Event Sourcing (persistence style), distinguished | `architecture-decision.md § Axis A` (Event Sourcing rung) + `§ Evolving the topology` (sagas/outbox) | `arch-cqrs` | diagram |
| `arch-when-to-use` | The comparative capstone — the whole ladder as one calibrated judgment | `architecture-decision.md § The meta-tell` + `§ Default baseline` | `arch-hexagonal`, `arch-cqrs`, `arch-eda-vs-event-sourcing` | diagram |
| `arch-deployment-topology` | Modular monolith vs microservices (Axis B — team/ops, not complexity); the distributed-monolith trap | `architecture-decision.md § Axis B — deployment topology` | `arch-floor` | diagram |
| `arch-evolving-topology` | How to split later — strangler fig, ACL, saga/outbox, data decomposition | `architecture-decision.md § Evolving the topology` | `arch-deployment-topology` | diagram |

## Track 3 — Testing (the build wedge)
Source skills: `test-strategy.md`, `test-doubles.md`, `tdd.md`, `ai-test-quality.md`, and the integration how-tos

| ID | Concept | Source | Prereqs | Visual |
|---|---|---|---|---|
| `test-behavior-over-impl` | Behavior over implementation — tests resilient to refactoring; why mockist tests break | `test-strategy.md § Core principles` (#1) | — | code |
| `test-doubles` | The five doubles — dummy/stub/spy/mock/fake, each pinned + what you may assert on each | `test-doubles.md § The taxonomy` | `test-behavior-over-impl` | code |
| `test-sociable-vs-solitary` | Sociable (real collaborators) vs solitary/mockist tests | `test-strategy.md § Core principles` (#1) + `test-doubles.md § Anti-patterns` | `test-doubles` | code |
| `test-mockable-seam` | The mockable-seam allow-list — managed vs unmanaged dependencies; what you may double at all | `test-doubles.md § The mockable-seam allow-list` | `test-doubles` | — |
| `test-fake-at-ports` | Fake-at-ports + contract-verifying the fake — the hexagonal-core testing pattern | `test-doubles.md § Fake-at-ports` | `test-mockable-seam`, `arch-hexagonal` | code |
| `test-levels` | Small/medium/large (unit/integration/e2e) — what each is, what belongs where | `test-strategy.md § Core principles` (#2, #4) | — | diagram |
| `test-shape-follows-arch` | Pyramid/diamond/trophy as outputs of architecture, not picks | `test-strategy.md § Shape follows architecture` | `test-levels`, `arch-when-to-use` | diagram |
| `test-what-to-unit-test` | The gnarly bits worth unit-testing — and what NOT to test | `test-strategy.md § When unit tests pay off` + `§ What NOT to test` | `test-levels` | — |
| `test-coverage-mutation` | Coverage as a floor; mutation testing; green ≠ correct | `test-strategy.md § Core principles` (#3) + `ai-test-quality.md § E. Mutation gate` | `test-levels` | — |
| `test-tdd` | Red-green-refactor; when it pays vs when to skip | `tdd.md § When to Use TDD` + `§ Red-Green-Refactor Cycle` | `test-behavior-over-impl` | code |
| `test-ai-quality` | AI-written test quality — independence, the falsifiability gate, change-detector tests | `ai-test-quality.md § A–F` | `test-behavior-over-impl`, `test-coverage-mutation` | — |
| `test-containers` | Real DBs/services via Testcontainers — singleton, pinned tags, Ryuk | `test-containers.md` | `test-levels` | — |
| `test-db-isolation` | Parallel-safe DB isolation — txn rollback / schema-per-worker / template DB | `db-test-isolation.md` | `test-containers` | — |
| `test-contract` | Consumer-driven contracts + provider verification (HOME node; linked from Seam) | `contract-testing.md` | `test-mockable-seam` | — |
| `test-e2e-tiering` | Persistent smoke (3–7) vs transient; the portfolio cap | `e2e-tiering.md` | `test-levels` | diagram |
| `test-flaky` | The three causes (async/concurrency/order) + quarantine-not-retry | `flaky-test-checklist.md` | `test-levels` | — |
| `test-auth-in-tests` | Authenticate-once/storageState; one-account-per-worker (pairs with `test-realistic-data`) | `auth-in-tests.md` | `test-containers` | — |
| `test-realistic-data` | Synthetic factories over dumps; deterministic, never raw Faker (pairs with `test-auth-in-tests`) | `realistic-test-data.md` | `test-containers` | — |

## Track 4 — Security
Source skills: `security-posture.md`, `fe-be-seam.md`, `untrusted-input-boundary.md`

| ID | Concept | Source | Prereqs | Visual |
|---|---|---|---|---|
| `sec-asvs-by-context` | Derive the ASVS level (L1/L2/L3) from risk; don't default it | `security-posture.md § ASVS level by context` | — | diagram |
| `sec-data-protection-floor` | The non-negotiable data-protection floor | `security-posture.md § The data-protection floor` | — | — |
| `sec-authn` | Session vs JWT vs OAuth/OIDC; the "JWT-is-not-a-web-session" lesson | `security-posture.md § Auth method & session` | `sec-data-protection-floor` | — |
| `sec-authz-models` | RBAC → ABAC → ReBAC; permission-checks over role-checks | `security-posture.md § Authorization model` | `sec-data-protection-floor` | diagram |
| `sec-object-level-authz` | BOLA/BFLA/BOPLA — the object/function/property-level checks; the #1 real breach | `security-posture.md § Authorization model` (folded checks) | `sec-authz-models` | — |
| `sec-secrets` | Runtime references vs copied long-lived secrets; the floor (HOME node; linked from CI/CD + Ops) | `data-environments.md § Secrets — the floor` + `security-posture.md` | — | — |
| `sec-input-validation` | Parse-don't-validate at trust boundaries only; domain stays framework-free | `fe-be-seam.md § Validation — "parse, don't validate"` | `sec-data-protection-floor` | code |
| `sec-regime-switch` | PCI/HIPAA/GDPR/SOC2 flipping recommended → required | `security-posture.md § The regime master-switch` | `sec-asvs-by-context` | — |
| `sec-trigger-rungs` | The calibration — secret manager / field encryption / mTLS / HSM / ReBAC infra by trigger | `security-posture.md § Trigger-gated rungs above the floor` | `sec-data-protection-floor` | — |

## Track 5 — Frontend
Source skills: `frontend-architecture.md`, `fe-be-seam.md`

| ID | Concept | Source | Prereqs | Visual |
|---|---|---|---|---|
| `fe-floor` | The FE floor — feature folders, typed data port, derive-don't-sync, semantic HTML | `frontend-architecture.md § The FE floor` | — | — |
| `fe-server-vs-client-state` | Server-state vs client-state — the #1 FE mistake | `frontend-architecture.md § State management` | `fe-floor` | code |
| `fe-state-ladder` | Local → context → store → state machine (with over-engineering tells) | `frontend-architecture.md § The FE rungs` | `fe-server-vs-client-state` | diagram |
| `fe-optimistic-updates` | Single vs multi-component optimistic UI; the cancel-in-flight trap | `frontend-architecture.md § State management` (optimistic) | `fe-server-vs-client-state` | code |
| `fe-rendering-strategy` | Static/ISR/SSR/server-components/client; the CSS-hide-vs-unmount a11y decision | `frontend-architecture.md § Rendering strategy` | `fe-floor` | diagram |
| `fe-design-system` | Token layering; headless primitives + your appearance; the insulation pattern | `frontend-architecture.md § Design system & UI primitives` | `fe-floor` | diagram |
| `fe-accessibility` | Semantic-before-ARIA; the unmount/display-none/sr-only/aria-hidden decision | `frontend-architecture.md § Rendering strategy` (a11y) | `fe-floor` | — |
| `fe-driving-adapter` | The FE is already a driving adapter — no hexagon around the SPA | `frontend-architecture.md § The FE is a driving adapter` | `fe-floor`, `arch-hexagonal` | — |

## Track 6 — The FE↔BE seam
Source skill: `fe-be-seam.md`

| ID | Concept | Source | Prereqs | Visual |
|---|---|---|---|---|
| `seam-contract-gate` | One machine-checked contract + the CI regenerate-and-diff gate; the "two type systems, no link" bug | `fe-be-seam.md § The spine — two invariants` | — | — |
| `seam-contract-matrix` | Shared types vs OpenAPI vs gRPC vs codegen; mobile additive evolution | `fe-be-seam.md § The cross-stack contract matrix` | `seam-contract-gate` | — |
| `seam-error-contract` | Stable codes, RFC 9457 envelope, trace id; branch on code not prose | `fe-be-seam.md § The error contract` | `seam-contract-gate` | code |
| `seam-responsibility-split` | Backend authority/SoR, frontend untrusted view | `fe-be-seam.md § The responsibility split` | `seam-contract-gate` | — |
| `seam-cors-csrf` | CORS & CSRF coupled to the auth method; the dangerous misconfigs | `fe-be-seam.md § CORS & CSRF` | `sec-authn` | — |

## Track 7 — CI/CD & delivery
Source skill: `cicd-strategy.md`

| ID | Concept | Source | Prereqs | Visual |
|---|---|---|---|---|
| `cicd-pipeline-tiers` | Pipeline follows test tiers — PR vs merge vs nightly; the <10-min budget | `cicd-strategy.md § Test tiers → pipeline stages` | `test-levels` | diagram |
| `cicd-oidc` | OIDC keyless auth — and the pinned-`sub` trap | `cicd-strategy.md § Auth: OIDC keyless is THE standard` | — | — |
| `cicd-secrets-split` | Deploy creds (OIDC) vs CI-scoped vs app secrets | `cicd-strategy.md § The secrets split` | `cicd-oidc`, `sec-secrets` | — |
| `cicd-deployment-ladder` | Trunk + previews + rollback; when flags/canary; why no staging | `cicd-strategy.md § The deployment ladder` | `cicd-pipeline-tiers` | diagram |
| `cicd-flaky-policy` | Quarantine + differentiated retry, never blanket retry-until-green | `cicd-strategy.md § Flaky tests — the canon` | `test-flaky` | — |
| `cicd-supply-chain` | SHA-pinned actions, lockfile+`ci`, read-only token, secret scanning, branch protection | `cicd-strategy.md § Supply-chain table stakes` | `cicd-oidc` | — |
| `cicd-publishing` | Tag-driven releases, trusted publishing / provenance (when shipping software) | `cicd-strategy.md § Publishing packages` | `cicd-pipeline-tiers` | — |

## Track 8 — Infrastructure & ops
Source skills: `infrastructure-strategy.md`, `data-environments.md`, `application-telemetry.md`

| ID | Concept | Source | Prereqs | Visual |
|---|---|---|---|---|
| `ops-compute-ladder` | static→FaaS→serverless-containers→K8s→VMs; the quantified crossovers + "no K8s under 4 engineers" | `infrastructure-strategy.md § The compute decision ladder` | — | diagram |
| `ops-shipped-software` | When the product is a CLI/library — infra footprint ~zero | `infrastructure-strategy.md § Shipped software, not a service` | `ops-compute-ladder` | — |
| `ops-db-hosting` | Serverless/branching vs dedicated; the premium math; connection pooling | `data-environments.md § Postgres hosting` | — | diagram |
| `ops-db-per-environment` | Database-per-environment + the parity rule | `data-environments.md § Database-per-environment` | `ops-db-hosting` | — |
| `ops-migrations` | Expand-contract / parallel change; destructive steps later; lint migrations | `data-environments.md § Migration discipline` | `ops-db-per-environment` | diagram |
| `ops-db-access-roles` | migrator ≠ app ≠ admin (least privilege) | `data-environments.md § Migration discipline` (roles) | `ops-db-per-environment` | — |
| `ops-nonprod-data` | Synthetic-seed default; masked-prod is still PII (GDPR) | `data-environments.md § Non-prod data` | `ops-db-per-environment` | — |
| `ops-observability-floor` | Wide events, error tracking, uptime, golden-signals, the billing alert | `infrastructure-strategy.md § The observability floor` | — | — |
| `ops-logging-policy` | Logging where + dev/prod policy; backend SoR; never log secrets | `application-telemetry.md § Logging — where, and the dev-vs-prod policy` | `ops-observability-floor` | — |
| `ops-tracing` | One trace_id across FE↔BE (W3C Trace Context); the CORS/source-map gotchas | `application-telemetry.md § Tracing` | `ops-logging-policy` | diagram |
| `ops-analytics` | The tracking plan as a data contract; server-authoritative vs client-journey | `application-telemetry.md § Analytics` | `ops-observability-floor` | — |

## Track 9 — Process & adaptation
Source skills: `product-discovery.md`, `brownfield-adaptation.md`, `exploration-and-adaptability.md`, `common-bug-patterns.md`

| ID | Concept | Source | Prereqs | Visual |
|---|---|---|---|---|
| `proc-product-discovery` | Outcomes over outputs; demand vs interest; the narrowest wedge; the four risks; the must-NOT axis | `product-discovery.md § Core principles` | — | — |
| `proc-brownfield-matrix` | Follow / improve / refactor — the decision matrix | `brownfield-adaptation.md § Follow vs. improve vs. refactor` | — | diagram |
| `proc-safe-change-sequence` | Seam → characterization tests → change; Sprout/Wrap (Feathers) | `brownfield-adaptation.md § The safe-change sequence` | `proc-brownfield-matrix` | — |
| `proc-rewrite-salvage` | Incremental never big-bang; the salvage decision card | `brownfield-adaptation.md § Rewrite & salvage` | `proc-brownfield-matrix` | — |
| `proc-source-fidelity` | Design/legacy/vibe/dependency — each authoritative on its own axis | `exploration-and-adaptability.md § Source precedence` | — | diagram |
| `proc-exploration` | The three explorations (code/design/web); mode detection; runtime tech selection | `exploration-and-adaptability.md § The three explorations` | — | — |
| `proc-common-bugs` | The scan-first bug-pattern checklist (debugging-adjacent) | `common-bug-patterns.md` | — | — |

## Track 10 — Code quality (the spine under every track)
Source skill: `engineering-standards.md`

| ID | Concept | Source | Prereqs | Visual |
|---|---|---|---|---|
| `cq-calibration-spine` | Over- vs under-engineering — both directions as failures (the master meta-lesson) | `engineering-standards.md § The calibration spine` | — | diagram |
| `cq-duplication-vs-abstraction` | DRY-as-knowledge, YAGNI, AHA, the wrong abstraction, cost-of-carry | `engineering-standards.md § The contract` (rule 4) | `cq-calibration-spine` | code |
| `cq-deep-modules` | Deep modules vs shallow layering; the indirection penalty | `engineering-standards.md § The contract` (rule 3) | `cq-calibration-spine` | — |
| `cq-two-hats` | Structural vs behavioral changes never in one commit | `engineering-standards.md § The contract` (rule 5) | — | — |
| `cq-correct-and-complete` | Edge-cases-first as the definition of done | `engineering-standards.md § The contract` (rule 6) | — | — |

---

## Completeness contract (enforced by test)

1. Every node's `Source` file exists under `gsd-core/references/` and contains the cited section.
2. Every `Prereqs` ID resolves to another node in this catalog (no dangling edges); the graph is acyclic.
3. Every node belongs to exactly one track (no cross-track duplication — links by ID only).
4. `cq-calibration-spine` is reachable (directly or via "when to use what" capstones) from every track — it is the spine the application beat of every lesson instantiates.

## Consumes / produces

- **Consumed by** `gsd-core/workflows/learn.md` (selection + sequencing) and `agents/gsd-learning-coach.md` (reads the cited source section to render the five beats). Personalized via `~/.claude/gsd-core/USER-PROFILE.md`; progress tracked in `~/.claude/gsd-core/LEARNING-PROGRESS.md`.
- **Pairs with** `teaching-pattern.md` (the five-beat doctrine — *how* a node is taught) the way `engineering-standards.md` pairs with the build agents.
- **Produces** nothing at runtime — it is the static curriculum graph; the lessons it drives are ephemeral (rendered per session), the progress is the only persisted state.
