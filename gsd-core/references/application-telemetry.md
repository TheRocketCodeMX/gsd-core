# Application Telemetry — Logging, Tracing & Analytics (app-level)

The **application-level** telemetry decision: where logs are written, how a single user action is traced across frontend and backend without duplication, and how product analytics are structured. **Distinct from** the ops-observability *floor* in `infrastructure-strategy.md` (uptime/latency/error-rate/billing alerts — "is the system healthy"); this owns "what happened in a request, and what the user did."

Consumed by `frontend-architecture` (the FE-signal side) and usable by a backend-only project through the chain. Providers named here are **leaves** — runtime-verify per `exploration-and-adaptability.md`. **`application-telemetry` owns trace propagation + the join semantics; the `fe-be-seam` error envelope only surfaces the `trace_id`.**

## The floor — one canonical wide event per request

The highest-leverage primitive, costing only discipline: **emit one wide, structured (JSON) event per request on the backend** — verb, path, status, latency, `trace_id`, `span_id`, user id, error id/message, release SHA, key timings. Derive metrics/traces/log-search from it. The wide-event / canonical-log-line model beats "three separate pillars/tools" for a small senior team. (Don't buy a high-cardinality o11y vendor before query ergonomics actually hurt — the *pattern* is free.)

## Logging — where, and the dev-vs-prod policy

- **Backend = system-of-record** (structured JSON → platform log service): all business/security/request events.
- **Frontend = only what only it can see**: unhandled JS errors, error-boundary catches, web-vitals, network failures.
- **Correlate by `trace_id`** — the single join key; never mint a parallel bespoke correlation id.

| Dimension | DEV | PROD | Why |
|---|---|---|---|
| Min level | TRACE/DEBUG ok | **INFO floor**; WARN/ERROR always | DEBUG in prod leaks + costs + noises (CWE-532) |
| Errors | full stack traces | generic message + correlation id to user; detail only in the sink | user-facing detail leaks internals; the sink keeps the full trace |
| Security/audit events | always | **always, level-independent, never sampled** | under-logging is itself the vuln (A09) |
| Secrets / PII | **forbidden (hard floor)** | forbidden (hard floor) | same prohibition both envs — dev logs don't stay in dev |
| Sampling | none (high fidelity) | sample high-volume INFO; **errors + security at 100%** | INFO is the cost driver; errors/security are rare + high-value |
| Retention | short (days) | compliance-driven; security/audit longer | |

**"Never log secrets, even in dev" is the floor.** Canonical never-log set: passwords/credentials, session/access tokens, API keys, encryption keys, full PANs, sensitive PII, full `Authorization` headers, DB connection strings. Put the redaction at the logging boundary so it fires identically in both envs (redaction depth → `security-posture.md`).

## Tracing — one trace across FE + BE (and the ">3 services" correction)

A user action's FE span and the BE spans it triggers **share one `trace_id`** via **W3C Trace Context**: the FE injects `traceparent` on the outbound request; the BE makes its server span a child; that `trace_id` is stamped into every log line on both sides. Two silent-failure gotchas to encode as checklist items: **CORS must allow the `traceparent` header** (it isn't safelisted → preflight), and **source maps must upload in CI before deploy** (tools won't retroactively de-minify earlier errors).

**The ">3 services" deferral the framework had wrong, split correctly:** **FE↔BE trace correlation is needed at 1 frontend + 1 backend** (one network boundary) → it belongs in the **day-one floor**, via vendor SDKs (a vendor SDK on the FE — raw browser OTel is still experimental, don't hand-roll it). The **heavy self-hosted tracing backend + formal SLO/error-budget machinery** is legitimately deferred — but re-anchor the trigger on **real intra-backend fan-out / the first "which service caused this?" incident**, not a service count.

## Error tracking — without duplication

One logical failure surfacing as both a BE 5xx and an FE fetch error stays **two linked events, joined by `trace_id`, counted once.** De-dup is an alerting discipline, not a tool feature: **5xx → BE owns it (the paging symptom); network/timeout/CORS/offline → FE owns it; 4xx → shared contract error.** Alert on the owning side only; filter predictable collateral FE errors; use the trace link to *navigate* FE↔BE, never to sum.

## Analytics — a tracking plan as a data contract

- **Floor:** a **written, version-controlled tracking plan** — object-action names (one enforced convention), **fixed-string** event/property names (never interpolated), properties-for-variation, immutable-id identity, a named owner. **Don't instrument deeply pre-PMF.**
- **Server-authoritative + client-journey, distinct names, one typed catalog:** authoritative conversions fire **server-side** (ad-blocker-proof: `OrderCompleted`); UI/journey events **client-side**; never the same name from both. Wrap the vendor in a thin typed `track()` facade.
- **Graduate by trigger:** typed event codegen (with CI enforcement) at the 2nd surface / contributor / tens-of-events; a CDP only at 3+ destinations or cross-team governance; server-side tracking for revenue/PII events; consent infra for EU/CA data.
- Keep product analytics and ops observability logically separate; product metrics **never page**.

## Provider abstraction — use the standard, don't wrap everything

"Swappable" does **not** mean wrapping every signal in a custom port. **OpenTelemetry + an OTLP collector is the swap-seam** for backend logs/metrics/traces (change the collector config, not your code); on the FE, OTel-browser is still experimental, so the FE side uses a vendor SDK rather than the standard for now. Error-grouping/replay/product-analytics are vendor-coupled regardless. The one custom port usually worth writing is `track()` (event names are domain vocabulary).

## When there's no web frontend (mobile / BE-only / event-driven)

The **wide-event floor and `trace_id`-as-join-key are unchanged**; the propagation surface and the FE-specific gotchas change: **mobile** replaces source-maps with symbolication (dSYM/ProGuard) and inherits the shipped-binary additive-evolution rule (`fe-be-seam.md`); **BE-only** drops the FE-error-ownership split to BE-internal error classes; **event-driven** propagates W3C trace context **through the broker** (message headers), not CORS — "count once" and "one trace" still hold. CORS/source-maps are web-FE-only checklist items.

## Notifications (adjacent — separate concern)

When a product sends notifications, the `notify()`-service / per-channel provider abstraction / idempotency-dedup / transactional-vs-marketing-separation / preference-center doctrine is a distinct concern (buy a notification platform once you cross multi-channel + preferences + in-app). Not a telemetry concern; noted here only because teams conflate the two.

## Retrofitting telemetry into an existing app (brownfield / vibe-coded)

When the app already runs but emits little or no structured telemetry (the common vibe-coded case), assess-and-retrofit — don't design the ideal from scratch. Priority order, each step independently shippable:
1. **The wide event first** — add the one canonical structured request event at the BE edge (middleware/filter) with `trace_id`; this single move retroactively unlocks metrics/log-search at the highest leverage.
2. **Redaction at the boundary before turning logging up** — install the never-log redaction (secrets/PII) so a retrofit doesn't start leaking (CWE-532); audit existing log statements for already-leaking secrets.
3. **`trace_id` propagation across the one boundary** — wire W3C Trace Context FE→BE (+ the CORS / source-map checklist) so existing FE errors join BE logs.
4. **Error-ownership de-dup** — apply the 5xx-BE / network-FE / 4xx-shared rule to the existing error surface to stop double-counting.
5. **Tracking plan** — only if product analytics are needed; don't retro-instrument deeply pre-PMF.

This is the **"observe" rung of the production-readiness hardening playlist** (`strategy-flow.md`); for a vibe-coded app it pairs with the security retrofit (`security-posture.md`) and characterization tests (`test-strategy.md`). Surface each gap as a decision card (current: no structured logs → target: wide-event floor → gap cost), default Improve.

## Anti-patterns (both directions)

- **Under-engineering:** no correlation id; FE+BE errors counted separately (inflated budget); stringly-typed ad-hoc analytics; logging PII/secrets (even in dev); deferring FE↔BE trace correlation behind a service count.
- **Over-engineering:** a custom port around every signal; a self-hosted Prometheus/Grafana/Loki stack or a CDP + consent platform on a pre-PMF app with no PII; instrumenting analytics deeply pre-PMF; DEBUG logging in prod.

## Consumes / produces

- **Consumes:** `recommend-architecture` (topology → boundaries to correlate), `fe-be-seam.md` (the `trace_id`/`instance` in the error envelope), the detected stack + live ecosystem (runtime-verify providers). Distinct from `infrastructure-strategy.md`'s ops floor; redaction depth in `security-posture.md`.
- **Produces:** the logging-where + dev/prod policy, the FE↔BE trace-correlation wiring (+ CORS & source-map checklist), the error-ownership/alerting rule, the tracking plan + typed event catalog, and the provider/abstraction decisions — honored as a per-phase Definition-of-Done.

*Basis: OpenTelemetry + W3C Trace Context; Google SRE Book/Workbook; Honeycomb/Majors (wide events); Sentry (no-auto-merge; source-maps-before-deploy); OWASP Logging; the dev/prod-logging + redaction research (2026). Full citations in the research corpus.*
