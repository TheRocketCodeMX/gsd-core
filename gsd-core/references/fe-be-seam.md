# Frontend↔Backend Seam — Contract, Errors & the Responsibility Split

The seam between client and service is **one decision**, not three — the type contract, the error contract, and who-owns-what are entangled, and the recurring production bugs ("the FE didn't map what the BE returns"; "I changed the BE and 100 FE types are silently stale") are the *same* bug: two type systems with no enforced link.

Consumed by `frontend-architecture` (the FE side) **and** `recommend-architecture` (the backend error contract), so a backend-only or polyglot project still gets the contract + error doctrine. Tool choices follow the runtime-verify discipline in `exploration-and-adaptability.md` — **mechanisms and triggers here, never a frozen winner.**

## The spine — two invariants that never rot

1. **The contract is ONE machine-checked source of truth, with a mandatory CI gate on the path from a contract change to a running consumer.** Both sides *derive* from it; a change is a red light (compile error or regenerated client), never a runtime surprise.
2. **Backend = authority & system-of-record; frontend = a thin, untrusted, permissioned view.** Every forgeable decision — authz, money, state transitions, validation *enforcement*, authoritative events — is enforced server-side, every request (OWASP: never rely on client-side access control). The FE may compute for UX but never re-implements business rules, validation rules, or error classification.

**The one-line test:** *"Can a contract change reach a running consumer without first failing a build or a gate I control?"* No → compile-time linkage (shared types/codegen) suffices. Yes → you need a backstop, and the topology picks which. **Corollary: codegen creates the types; CI creates the guarantee** — wherever codegen is used, two gates are non-negotiable: **typecheck** AND **regenerate-and-fail-on-diff**.

## The cross-stack contract matrix (mechanism · trigger · trap)

Pick by stack/topology; runtime-verify the *current* best-maintained tool for the cell.

| Case | Mechanism | Trigger | Trap |
|---|---|---|---|
| You own both sides, typed languages (TS-mono · Python+TS FE · Go/Spring/Rails+TS FE) | one source of truth → shared types (same-lang) or contract/codegen + the **regenerate-and-diff CI gate** | you control + can rebuild both ends | the compiler only sees the *committed* artifact — without the diff gate a rename ships green; `any`/nullable drift still typechecks; annotation→spec (swagger/springdoc) can silently lie |
| Polyglot / public / multi-team | OpenAPI design-first + a **required breaking-change diff gate**, or gRPC/Connect + a **proto breaking-change gate** | unknown/external consumers → OpenAPI; perf-sensitive internal polyglot → gRPC | the format has no built-in gate — a rename ships unless the diff check is *required + blocking*. GraphQL fails this for unobserved consumers (rename = add+remove, only caught if recent traffic used the field) |
| Mobile (iOS/Android/Flutter/RN) | OpenAPI or GraphQL codegen | typed client wanting build-time signal | codegen protects only build N+1; **shipped binaries keep the old field** → evolve additively (add+deprecate+dual-write, remove when the old-client tail is gone) |
| Server-rendered / HTMX / no client types | the contract *is* the response; server-side validation + rendering tests | hypermedia app, generic browser is the client | the seam collapses for the browser — but the moment a script/mobile/partner consumes the *data*, a versioned API + this matrix returns |
| Backend-only / service-to-service / events | proto/gRPC stubs (sync); schema registry w/ compatibility modes (async events) | controlled mesh redeploying together → gRPC; temporally-decoupled producers/consumers → registry | proto keys by field *number* — rename is wire-safe but breaks codegen/JSON; every backstop has an off-switch (mode=NONE) — only as strong as the gate being mandatory |

**Consumer-driven contract tests (Pact-style) are the backstop** where compile-time linkage is impossible — independent deploy cadence, untyped/uncontrolled consumers, async events. Provider verification + a "can-I-deploy" check blocks a deploy that would break a version live in prod (the one thing codegen can't). Overkill for single-repo atomic deploys. See `contract-testing.md`.

## The error contract

**Three transport-invariant invariants (every stack):** (a) a **stable, namespaced machine `code`** the consumer branches on — never human prose; (b) a **correlation/trace id** on every error; (c) **faults masked at the boundary**, business errors carry specific codes. *How* these ride the wire is transport-specific — **HTTP → RFC 9457 `problem+json` (below); gRPC → `google.rpc.Status` + status code + `error_details`; async/events → error payload + dead-letter on the message; GraphQL → `errors[].extensions`.** The RFC 9457 shape below is the **HTTP binding** of these invariants, not the contract itself.

```jsonc
// HTTP binding — Content-Type: application/problem+json (RFC 9457). HTTP status MUST equal "status" when present.
{
  "type":     "https://errors.example.com/billing/card-declined", // human-dereferenceable doc URI (defaults about:blank)
  "title":    "Card declined",            // stable per-type, advisory
  "status":   402,
  "detail":   "Your card was declined.",  // developer-facing; consumers SHOULD NOT parse it
  "instance": "urn:trace:9f1c...e7",      // correlation id — we bind this to the trace_id (a design choice, not RFC-mandated)
  "code":     "CARD_DECLINED",            // EXTENSION: the stable machine code the FE branches on
  "domain":   "billing",                  // EXTENSION: namespace (disambiguates across services)
  "retryable":    false,                  // EXTENSION: error-vs-fault + retry intent
  "retryAfterMs": null,
  "errors": [ { "pointer": "#/email", "reason": "INVALID_FORMAT", "detail": "Must be a valid email." } ] // EXTENSION: field validation
}
```

**The error-code registry:** codes live in **one source-of-truth registry (an enum or schema) the BE owns and the FE imports or mirrors** — the same SSOT discipline as the type contract. Codes are namespaced and stable: adding is non-breaking; rename/remove is breaking; refine via a *more-specific* code, never mutate an existing one.

**Propagation rules:**
1. **FE branches on `code` + `domain` only — never parses `detail`/`title`** — and parses the error at its boundary into a discriminated union (sealed types / exhaustive match; in TS: `Record<ErrorCode, ErrorPolicy>` + `assertNever`) so a new code is a compile error until handled.
2. **A deployed FE MUST also have a default/fallback rendering for an unrecognized `code`** (forward-compat) — the build-break guarantee protects build N+1, but a shipped mobile/SPA binary meets new codes at runtime.
3. **Faults are masked at the transport boundary** → `{code:"INTERNAL", retryable:true}`, no stack traces, `instance` = trace id. Expected business errors get specific codes.
4. **Retry intent in both** the transport signal (`Retry-After`) and the body (`retryable`/`retryAfterMs`); auto-retries on non-idempotent ops require an idempotency key.
5. **Message authorship splits by audience:** BE owns `code` + developer `detail` + dynamic metadata; **FE owns the end-user copy keyed on `code`, localized client-side** (the FE's legitimate logic). Server supplies a localized message only when the FE can't reconstruct the data.
6. **HTTP status MUST equal `status`** (REST). Under **GraphQL**, field errors return 200 with `errors[]`; request errors under `application/graphql-response+json` may use 4xx — so under GraphQL, read the body, not the status.

`instance` carries the W3C `trace_id` that **`application-telemetry.md` owns end-to-end**; the seam only specifies that the error envelope surfaces it.

## Validation — "parse, don't validate", at the edges only

Runtime schema validation belongs at **trust boundaries only** (inbound HTTP, LLM/AI output, webhooks, env/config, third-party responses; FE-side response-parsing for critical flows). Inside the boundary, types suffice. The **domain layer never imports the validation library** (framework-free, per the DDD constraint). The server re-runs the shared schema independently every request *and* enforces domain invariants the schema can't express; client validation is UX-only, never the security boundary.

## CORS & CSRF — coupled to the auth method

CSRF exploits *ambient authority* (credentials the browser auto-attaches — cookies). CORS relaxes same-origin reads; **it is never a server-side access control.** The secure defaults change with the auth choice (auth-method matrix lives in `recommend-architecture`; secrets/allow-list config in `infrastructure-strategy`):

| Auth transport | Secure CORS default | CSRF default |
|---|---|---|
| **Cookie / session** | same-site SPA → no CORS; cross-origin only if required → **exact-origin allow-list** (never `*`, never reflected) + `Allow-Credentials: true` + `Vary: Origin` | `SameSite=Lax/Strict` + `__Host-` prefix + **an anti-CSRF token** (SameSite is necessary-but-not-sufficient) |
| **`Authorization: Bearer`** (token not in a cookie) | the header triggers a preflight → exact-origin allow-list + `Allow-Headers: Authorization` | largely not CSRF-susceptible (browser doesn't auto-attach) — until the token sits in a cookie |

**Dangerous misconfigurations (forbid):** `ACAO: *` with credentials; reflecting the `Origin` header; trusting `null`; substring/prefix origin matching; `SameSite=None` without `Secure` or as a CSRF crutch.

## The responsibility split

| Concern | Backend owns | Frontend owns |
|---|---|---|
| Business logic / authz | all of it (enforced every request) | role-based show/hide as **hints**; optimistic UI |
| Validation | re-runs the shared schema + domain invariants | same schema for instant UX feedback (never the boundary) |
| Errors | the machine `code` + envelope + trace id | maps `code` → its own localized copy + UX; fallback for unknown codes; never renders raw `detail` |
| Success | returns the updated resource | optimistic update + cache invalidation |
| Data access | the API surface | the typed contract hooks — no ad-hoc fetch |

State, logging, and analytics ownership live in `frontend-architecture.md` and `application-telemetry.md`.

## Anti-patterns (both directions)

- **Under-engineering:** hand-typed interfaces shared by copy-paste; codegen without the regenerate-diff gate; FE parsing error prose or re-implementing validation/business rules; status-200-with-error on REST; `ACAO:*`-with-credentials.
- **Over-engineering:** a BFF / use-case endpoint per UI interaction that mutates the resource model to mirror screens (keep a clean resource API; solve coarse-graining in an FE-owned layer); GraphQL for simple single-client CRUD; DTO↔domain↔ORM mapping triplication for thin CRUD.

## Consumes / produces

- **Consumes:** `recommend-architecture`'s ADR (topology + auth method shape the seam — EDA/CQRS change FE cache needs), the detected stack, the live ecosystem (runtime-verify the contract tool). Pairs with `contract-testing.md`, `application-telemetry.md` (trace-id), `frontend-architecture.md`.
- **Produces:** the contract mechanism + CI gates, the error-code registry + envelope, the validation-edge map, the CORS/CSRF defaults, and the responsibility split — recorded for `plan-phase`/`execute-phase`.

*Basis: RFC 9457; OWASP (server-side validation/authz; CSRF, CORS, Session cheat sheets); RFC 9700 / OAuth 2.1; Zalando/Microsoft/Google-AIP/Stripe API guidelines; graphql-over-http; the cross-stack contract + auth research (2026). Full citations in the research corpus.*
