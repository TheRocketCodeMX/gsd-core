# Strategy Flow — Archetype → Recommended Path (the selection policy)

The **selection** layer over `strategy-chain.md`'s topology. The chain answers *"what is the full ordered set of strategy steps, and how is each link wired (consumes / warns / next)?"* — invariant, project-independent. **This file answers the project-specific question: for THIS project, which links do we *recommend*, in what order and depth, and which do we skip?** The three entry points (`new-project`, `new-milestone`, `discover-product`) consume this to emit a tailored recommended path and record it as PROJECT.md's `## Strategy Plan` + skip-ledger.

It is **policy, not detection** — it reads the context already captured (`## Mode` from `exploration-and-adaptability.md`, the PRODUCT-BRIEF, REQUIREMENTS), and asks the user only the few archetype axes nothing else has answered. The layering:

> `exploration-and-adaptability.md` (detect Mode) → **`strategy-flow.md` (select the path)** → `strategy-chain.md` (wire each selected step) → PROJECT.md `## Strategy Plan` (the recorded per-project instance).

## Scope: one surface per project

A GSD project models **one surface / one archetype** — `## Mode` and `## Strategy Plan` are single-valued. A **monorepo or multi-surface repo** (e.g. a backend service + a separate frontend app + a CLI, each a genuinely different archetype) is handled by running GSD **per package/surface**, not by averaging the surfaces into one Mode (which would mis-recommend — a backend skips frontend-architecture, a frontend leads with it). When the entry point detects multiple independent surfaces, it **nudges** toward per-package, or asks the user to pick the primary surface for this project. *(Per-area Mode detection in `exploration-and-adaptability.md` is for variation WITHIN one surface — a brownfield repo carrying a new module — not for multiple independent surfaces.)*

## Archetype signals (derive, don't re-interrogate)

`## Mode` (Origin × Design-input × Code-quality) plus a few surface axes — read them from the brief/requirements/project; **ask only what is genuinely unknown** (one screen, recommended defaults):

| Axis | Values | Decides |
|---|---|---|
| **Surface** | full-stack · backend/API · frontend-only · CLI/library · data-ML pipeline · mobile | frontend-architecture, ui-phase, the seam |
| **Domain richness** | real business rules vs thin CRUD/glue | model-domain |
| **Security exposure** | public+sensitive (payments/PII/regulated) · public+low · internal · local-only | security-strategy **depth** (ASVS L1/L2/L3) — *not whether* (the floor is always on) |
| **Deployment** | deployed service · published package · local-only | infrastructure-strategy + cicd-strategy |
| **Criticality** | prototype/throwaway · internal · production-critical | the master rigor dial (testing depth, observability) |

## The recommended-path matrix

Canonical spine (from `strategy-chain.md`): `legacy-inventory → discover-product → model-domain → recommend-architecture → security-strategy → frontend-architecture → testing-strategy → infrastructure-strategy → cicd-strategy → build`. **Every archetype is a subset/reorder of this spine — never a new order.** ✓ recommend · ○ optional · – skip (LI/DP are overlay/optional, shown in the notes):

| Archetype | MD | RA | SS | FA | TS | IS | CC | Notes |
|---|---|---|---|---|---|---|---|---|
| Full-stack SaaS (public, sensitive) | ✓ | ✓ | ✓ L2–3 | ✓ | ✓ | ✓ | ✓ | the full chain |
| Backend service / API | ✓ | ✓ +seam/telemetry | ✓ L2 | – | ✓ | ✓ | ✓ | RA Step 5.5 carries the error-contract + telemetry floor |
| CLI / library | ○ | ✓ light | ✓ L1 (supply-chain) | – | ✓ strong | – | ✓ publish | CC = release pipeline, not deploy |
| Frontend-only (SPA/static) | ○ | ○ client-arch | ✓ client (XSS/CSP/auth-storage) | ✓ primary | ✓ | ✓ static/CDN | ✓ | FA leads |
| Internal tool / admin | ○ | ✓ light | ✓ L1 | ✓ if UI | ✓ | ○ | ○ | security scales down, never off |
| Data / ML pipeline | ✓ data | ✓ | ✓ governance/PII | – | ✓ +AI-eval if ML | ✓ | ✓ | ties into the AI-integration skills |
| Mobile app | ✓ | ✓ | ✓ L2 | ✓ mobile | ✓ | ✓ backend | ✓ | |
| Prototype / throwaway | – | ○ | floor only | ○ | ○ light | – | – | scale-to-zero; say it's a prototype |

The matrix is a **starting recommendation**, not a gate — the user can accept, customize, or skip to build. Skips are recorded (see skip-ledger), never silent.

**Tie-break (when a project matches two rows** — e.g. a deployed internal admin tool reads as both "Internal tool" and "Backend service"): pick the **higher-rigor** row and let the user scale down (decline steps → skip-ledger), rather than silently under-provisioning. Under-engineering is the costlier error here — a missing security/testing step is harder to notice than an offered one the user declines.

## Overlays (compose with the matrix — they change *which extra steps* and *how each runs*)

- **Origin ≠ greenfield** → prepend the right exploration: **rewrite/refactor/vibe-coded → `legacy-inventory`** (coverage matrix + salvage + characterization gates); **brownfield-extend → `map-codebase`**. Every selected strategy skill then runs in **assess-and-evolve** mode (`brownfield-adaptation.md`), not design-from-scratch.
- **Design-input = a provided design / an existing design system** → pull `frontend-architecture` earlier and emphasize `ui-phase`; the design is ingested once per the DESIGN rules in `exploration-and-adaptability.md` and honored as a fidelity contract downstream.
- **Code-quality = vibe-coded-to-harden → the hardening playlist (canonical definition):** `testing-strategy` (characterization tests first) → `recommend-architecture` (seams/structure, assess-evolve) → `security-strategy` (audit current posture → remediation) → telemetry retrofit (`application-telemetry.md`) → `cicd-strategy` (the CI gate); **`infrastructure-strategy` only when the app deploys**. This is the concrete "make my prototype production-ready" path — a bundle, not a linear chain. **This is the single source for the playlist's membership — every other "hardening playlist" reference points here, never restates its members.**
- **`discover-product`** is the front-of-funnel overlay: recommended when product value/scope is still uncertain; skipped when requirements are already evidenced.

## Cold-start vs warm-start (the three entry points)

- **Cold start — `new-project` (authoritative) and `discover-product` (preview).** No artifacts yet. Derive the archetype from `## Mode` + brief/requirements, render the matrix + overlays as the recommended *initial* path, record `## Strategy Plan`. `discover-product` (which has surface/scale but no requirements) shows a *preview* and hands the signals to `new-project`; `new-project` writes the authoritative plan.
- **Warm start — `new-milestone`.** Artifacts exist; the milestone has an *objective*. Map the objective to which strategy steps to **revisit or adopt** (below), not the full cold-start matrix.

### Objective → revisit map (warm-start)

| Milestone objective | (Re)visit |
|---|---|
| **Adopt GSD on an existing project** (upgraded from old gsd-core / first GSD use on real code) | `legacy-inventory`/`map-codebase` → retrofit the relevant chain in assess-evolve to establish ADR/SECURITY/TEST… against the running system |
| Production-readiness | the **hardening playlist** (members defined once in the Overlays above) — characterize → seam → secure → observe → CI gate |
| Security hardening | SS (re-derive deeper) + secure-phase |
| New feature needs first frontend | FA + ui-phase |
| New bounded context / domain shift | MD + RA |
| Refactoring | legacy-inventory + RA (evolve) |
| Testing push | TS + add-tests |
| New design | FA + ui-phase + design ingestion |
| More features, same surface | none — "strategy artifacts still fit" → straight to build |

## Recording: the Strategy Plan + the skip-ledger

The entry point writes two things into PROJECT.md (template `project.md`):
- **`## Strategy Plan`** — the recommended ordered steps for this archetype with a status each (`recommended` / `done` / `skipped`). It is the per-project instance of this policy; `new-milestone` refreshes it as scope evolves.
- **The skip-ledger** — when the user declines a *recommended* step, record `- <skill> — skipped (<reason>, <date>)`. **A ledgered skip is a decision, not an omission:** the strategy chain's missing-input rule and the enforcement agents **note it once and do not re-nag** (distinguishing "deliberately skipped" from "not yet produced"). `new-milestone` re-surfaces a ledgered skip only when the new milestone's scope makes it relevant again (e.g. a skipped `frontend-architecture` resurfaces when the milestone adds a frontend).

## Consumes / produces

- **Consumes:** `## Mode` (`exploration-and-adaptability.md`), PRODUCT-BRIEF, REQUIREMENTS, and — warm-start — the milestone objective + existing artifacts. Pairs with `strategy-chain.md` (the topology each selected step is wired into) and `brownfield-adaptation.md` (how assess-evolve runs).
- **Produces:** nothing at runtime — it is the selection doctrine. Its output is the recorded `## Strategy Plan` + skip-ledger the entry points write.
