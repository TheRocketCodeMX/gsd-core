# Security Posture — ASVS-by-Context, the Floor, Authz & the Regime Switch

The **app-wide, decide-once** security decisions, and how they flow into folded enforcement. Reference for the `security-strategy` skill (the thin posture step) and consumed by `model-domain` (actor/authz), `recommend-architecture` (trust boundaries), `infrastructure-strategy` (secrets/encryption), and the enforcement agents (`gsd-security-auditor`, `gsd-code-reviewer`).

Tool/vendor choices are **leaves** (runtime-verify per `exploration-and-adaptability.md`); cite versions. Detail that other refs own is pointed to, not restated: CORS/CSRF + the error contract → `fe-be-seam.md`; logging redaction + dev/prod policy → `application-telemetry.md`; the ops-secrets floor → `infrastructure-strategy.md`.

## The hybrid spine — decide the posture once, enforce it folded

Security is **distributed across the SDLC** (no single binder). But a subset is **app-wide, decided once, and a prerequisite gate** for everything downstream — and AI-agent execution needs it **externalized** because no human carries it between phases. So: a thin posture artifact (`SECURITY-STRATEGY.md`) holds the decide-once decisions; per-feature enforcement stays folded (planner threat models → `gsd-security-auditor` → `secure-phase`; supply-chain in `cicd-strategy`).

**Decide once (in `SECURITY-STRATEGY.md`):** data classification · derived ASVS level · app-wide trust-boundary/data-flow + top-level STRIDE (the *parent* per-phase models inherit) · authn/authz model · secrets/key strategy · the security DoD. **Stays folded (per feature/phase):** object/function/property-level authz checks (BOLA/BFLA/BOPLA), the policy content for each new resource, and the per-feature threat model + tests.

## ASVS level by context (the master input — derive it, don't default it)

Pick the level from risk (data sensitivity × blast radius × regulatory exposure), not by fiat. **L1** = every app (public-facing, low-sensitivity). **L2** = sensitive personal/financial data, authenticated multi-tenant data, or a regulated domain. **L3** = safety/mission-critical or systemic blast radius (health, financial infra, an identity service others depend on). Levels are cumulative. The framework's `security_asvs_level` config is a static default of 1 — **`security-strategy` derives the level from context and writes it back**, so a payments app stops silently shipping at L1.

## The data-protection floor (every app, no trigger)

1. **No secrets in code or build artifacts** — pre-commit + repo scanning.
2. **Authorization enforced server-side, deny-by-default**, through one reusable decision point (OWASP Top 10 A01 = #1 risk).
3. **Input validation (shape) + output encoding** (A03 Injection).
4. **TLS everywhere** (≥1.2, default 1.3).
5. **At-rest encryption on** (platform default, AES-256).
6. **Passwords with Argon2id** (≥19 MiB/t=2/p=1); **CSPRNG** for credential/key generation; **no hand-rolled crypto**.
7. **Don't log secrets/PII** (even in dev); dependency + secret scanning in CI; security headers; **workload identity over static keys** wherever the platform offers it.

## Trigger-gated rungs above the floor

| Rung | Trigger | Over-engineering trap |
|---|---|---|
| Dedicated secret manager / dynamic secrets | audit need · live rotation · fine-grained ACL · prod/dev isolation · ASVS L2+ | Vault for a 3-service app with no regulatory driver |
| Field-level / app-layer encryption · tokenization | threat model includes app/credential compromise on regulated fields; PAN → tokenize for PCI scope reduction | encrypting whole tables (breaks search/index) |
| mTLS service-to-service | zero-trust · existing mesh · regulated east-west | hand-rolled mTLS without a mesh |
| HSM / FIPS 140-3 L3 · split-knowledge + dual control | PCI key storage · FedRAMP/gov · ASVS L3 | dedicated HSM when cloud KMS is already FIPS-backed |
| ReBAC infra (Zanzibar/OpenFGA-style) | permissions follow relationships (sharing/nesting/multi-tenant hierarchy) | a tuple store for 3 static roles |
| DPIA + Art. 9 default-deny + erasure pipeline | GDPR special-category data / right-to-erasure | full erasure infra for non-PII |

## The regime master-switch (what flips *recommended* → *required*)

- **PCI-DSS** — most prescriptive: PAN unreadable (hash/truncate/tokenize), no SAD storage, split-knowledge+dual-control keys, MFA, 12-char, quarterly ASV scans.
- **FedRAMP / NIST 800-53 Mod-High** — FIPS-validated crypto required (SC-8(1)/SC-28(1)).
- **HIPAA & GDPR** — risk-based/addressable in text, but encryption-at-rest is **near-mandatory via breach safe harbor** (properly-encrypted data turns a mass-notification event into a non-event). GDPR Art. 9 special categories invert to default-deny.
- **SOC 2** — least prescriptive (criteria-based). State precisely: "encryption is risk-based for *compliance* but near-essential for the *safe harbor*"; "GDPR/HIPAA mandates encryption" is a misstatement.

## Authorization model

Backend enforces, frontend hints (never client-side access control). **Permission checks `can(action, resource)` over role checks `hasRole`**, bound to the specific object instance. The ladder: **RBAC** (few stable roles, no per-resource sharing) → add **ABAC** when decisions depend on context/attributes (time/device/ownership/state) or roles explode → add **ReBAC** when authorization derives from relationships. Most B2B SaaS lands on a hybrid (RBAC coarse + ReBAC resource-level + ABAC conditions). **Per-feature (folded):** BOLA (object-level check every endpoint — API risk #1), BFLA (function-level, deny-by-default), BOPLA (property-level whitelist). **Multi-tenancy:** tenant-scope every query centrally (from verified identity, never a client header); RLS as fail-closed defense-in-depth when regulated/sensitive. `model-domain` models the actors/roles; this records the model + the authz architecture.

## Auth method & session (the decide-once choice)

Decision matrix (recorded here; the FE-side CORS/CSRF defaults live in `fe-be-seam.md`):
- **Opaque server-side session in an httpOnly+Secure+SameSite cookie** — the default for first-party web apps (real logout/revocation).
- **Stateless JWT** — for short-lived OAuth/OIDC access tokens, service-to-service, stateless APIs; **NOT as a long-lived first-party web session** (no revocation, logout-is-a-hack, storage forces XSS-vs-CSRF). The "avoid JWT entirely" claim is overbroad — it's right only in that narrow form.
- **OAuth 2.1 / OIDC (delegate to an IdP)** — federation/social/enterprise SSO/MFA, delegated API authz. **API keys/PATs** — machine-to-machine only.
FE token storage: prefer **BFF** (tokens never reach the browser) for sensitive apps; never long-lived tokens in localStorage. Refresh tokens for public clients **MUST rotate with reuse-detection** (RFC 9700).

## Threat modeling (parent + children) & secure-SDLC DoD

Do **both, hierarchically**: an **app-wide design-time model** (trust boundaries, data flows, top-level STRIDE — the *parent*, decided here) that **per-phase threat models inherit and refine** (the framework's existing planner→`gsd-security-auditor`→`secure-phase` flow — but only re-model a phase that *changes* a boundary/data-flow/data-structure; a pure refactor inherits-and-attests). **Secure-SDLC as DoD:** the floor's CI gates (SCA + secret-scan + lockfile + SAST-on-changed) are the security DoD for L1; L2 adds SAST-blocking + DAST-on-staging + authz/crypto unit tests; L3 adds mandatory per-change threat-model review + signed provenance. Supply-chain "free six" (SHA-pinned actions, lockfile+`ci`, read-only token, pinned-`sub` OIDC, secret scanning, branch ruleset) is table-stakes; SLSA/SBOM are deferred-with-triggers (`cicd-strategy.md`).

## Scale-to-zero (the anti-ceremony guard)

For an L1 app the posture resolves in one screen → a half-page `SECURITY-STRATEGY.md` ("public, low-sensitivity → L1, default RBAC authz, opaque-cookie sessions, free-six DoD, boundary = browser↔API"). Ceremony grows only with the tier. This honors "simple = smart, not simplistic" and avoids the security-binder the fold-camp rightly fears.

## Anti-patterns (both directions)

- **Under-engineering:** ASVS left at the static default for a real app; no data classification; per-phase threat models with no parent; client-side access control; long-lived JWT sessions; secrets in env/code; missing per-endpoint BOLA checks (the #1 real breach).
- **Over-engineering:** a heavyweight security *phase* / PDP service / Vault / HSM / ReBAC store / dual-control key ceremony for a low-sensitivity internal tool; SLSA/SBOM program for a solo app; a 6-tier classification nobody applies.

## Consumes / produces

- **Consumes:** PROJECT.md (`## Mode` + data sensitivity), the ADR (topology/trust boundaries), DOMAIN-MODEL (actors/roles), the live ecosystem (runtime-verify auth/secret/KMS tools). Pairs with `fe-be-seam.md` (CORS/CSRF + error contract), `application-telemetry.md` (logging redaction), `infrastructure-strategy.md` (ops-secrets floor), `architecture-decision.md`.
- **Produces:** `SECURITY-STRATEGY.md` — data classification, derived ASVS level (+ config write-back), app-wide trust-boundary/threat-model parent, authn/authz model, secrets/key strategy, the security DoD — registered as a canonical reference and enforced folded.

*Basis: OWASP (ASVS v5, Top 10:2021/2025, API Top 10:2023, Proactive Controls, SAMM, cheat sheets); NIST (SSDF 800-218, 800-53B/FIPS-199, 800-63B, 800-57); RFC 9700 / OAuth 2.1; PCI-DSS v4.0.1; GDPR; Google Zanzibar/BeyondCorp; ThoughtWorks Tech Radar (threat-modeling Adopt, SLSA Trial). Full citations in the research corpus.*
