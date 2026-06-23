# Security Strategy — [PROJECT_TITLE]

**Decided:** [DATE] · **Status:** Accepted · **ASVS level:** [1|2|3] (written to `security_asvs_level`)

> The app-wide, decide-once posture. Per-feature enforcement stays folded (per-phase threat models → security-auditor → secure-phase; supply-chain in cicd). Scale-to-zero: keep this to ~half a page at L1; grow only with the tier.

## Data classification & regime

- **Most sensitive data:** [public / internal / confidential / regulated — what]
- **Regulatory regime(s):** [GDPR / HIPAA / PCI-DSS / FedRAMP / none] — [the controls it flips from recommended → required]

## ASVS level (derived, not defaulted)

[1/2/3] — because [data sensitivity × blast radius × regulatory exposure]. Written back to `security_asvs_level` so the planner + security-auditor consume it.

## Authn / Authz model

- **Authz:** [RBAC | RBAC+ABAC | +ReBAC] — [why; the relationship/attribute trigger if above RBAC]. Enforced server-side, deny-by-default, one decision point. Per-feature BOLA/BFLA/BOPLA checks stay folded.
- **Auth method:** [opaque-cookie session | short-lived JWT (OAuth/service/stateless only) | OIDC/SSO | API keys (M2M)]; FE token location [BFF | httpOnly cookie]; refresh rotation + reuse-detection [yes/n.a.].
- **Multi-tenancy:** [single | shared-schema + tenant-scoped (+ RLS if regulated)].
- Actors/roles: see `DOMAIN-MODEL.md`. FE-side CORS/CSRF defaults: see `fe-be-seam.md`.

## App-wide threat-model parent

- **Trust boundaries:** [browser↔API, API↔DB, API↔3rd-party, …]
- **Data flows (sensitive):** [where regulated/confidential data enters, is stored, leaves]
- **Top-level STRIDE:** [the handful of app-level threats + disposition]. Per-phase threat models **inherit and refine** this; a phase that changes no boundary inherits-and-attests.

## Secrets / key strategy

[Workload-identity-first; secret-manager rung if triggered; key strategy (envelope/KMS) if encryption-at-rest beyond platform default]. Cloud-specific config → `INFRA-STRATEGY.md`.

## Security DoD (blocking CI gates at this tier)

- **Floor (all):** no-secrets-in-code, SCA/dependency scan, secret scan, lockfile + `ci`, SAST on changed code, read-only CI token, pinned-`sub` OIDC, branch ruleset.
- **L2+ (if applicable):** SAST blocking on critical/high, DAST on staging, authz/crypto unit tests.
- **L3 (if applicable):** mandatory per-change threat-model review, signed provenance.

## Rungs above the floor (each ↔ its trigger)

| Rung | Triggered? | Trigger |
|---|---|---|
| Dedicated secret manager / dynamic secrets | [y/n] | [audit/rotation/ACL/isolation/ASVS L2+] |
| Field-level encryption / tokenization | [y/n] | [app-compromise threat on regulated fields / PCI PAN] |
| mTLS service-to-service | [y/n] | [zero-trust / mesh / regulated east-west] |
| HSM / FIPS L3 / split-knowledge | [y/n] | [PCI key storage / FedRAMP / ASVS L3] |
| ReBAC infra | [y/n] | [relationship-derived permissions] |
| DPIA + erasure pipeline | [y/n] | [GDPR special-category / right-to-erasure] |
