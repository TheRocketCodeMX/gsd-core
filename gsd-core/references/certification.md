# Certification — the top of the pyramid is two different jobs

Reference for `/gsd:testing-strategy` (the gate-vs-certify, capability-detection, and substrate steps) and for `verify-work`'s certification step (`gsd-core/workflows/verify-work/steps/agentic-certification.md`), which consumes the trust gate, probe procedure, and brief format below rather than restating them. Every capability claim below traces to a vendor's own page or a dated live probe — where a vendor is silent, the silence is recorded as the finding, never papered over.

## The doctrine

> **Gate** — deterministic, every commit, CI. **Scripts gate.**
> **Certify** — realistic, per-change, agentic, human-adjacent. **Never a CI gate.**
> A hermetic ephemeral-environment run is a **regression check, not a validation** of the app in the world.

Why an agent cannot be the gate — each point primary-sourced:

- **Vendors disclaim precision.** Anthropic: do not use computer use "for tasks requiring perfect precision" without human oversight; documented coordinate hallucination and tool-selection errors. A gate must fail only when the app is broken — an agent adds a second, independent failure source.
- **The safety model is human confirmation.** Prompt injection is a documented, quantified hazard for browser agents, and the shipped mitigation is asking a human to confirm — explicitly a poor fit for "use cases without a human in the loop." Unattended is the weak case by the vendor's own statement.
- **The capable tools are desktop-session-bound.** The agent browsers developers actually have (Claude Code `--chrome`, Codex desktop, Cursor's pane, onorca's pane) run in a visible desktop session; the tools with documented `--headless`/`--isolated`/`--storage-state` are Playwright wearing an agent hat.
- **Agents author and heal; scripts gate.** Microsoft's Playwright-MCP README steers coding agents to the Playwright CLI+skills; OpenAI's own Codex frontend guidance says to enable the Playwright interactive skill. Two vendors independently converge on "point the agent at Playwright" — that convergence, not a GSD opinion, is what makes the scripted gate an *agent-maintained artifact* rather than a hand-written liability.
- **Builder ≠ certifier.** The certifying agent should not be the implementing agent: fresh eyes, ideally a **different model family**, no shared blind spots (fresh-context same-family is the accepted minimum — see the separation table in the verify-work step). Certification capability is a **project fact, not a machine fact** — the certifier may live on a different machine or tool than the builder, which is why the ladder below is recorded in TEST-STRATEGY.md rather than sniffed per session.
- **The fit itself is vendor-endorsed.** The same Anthropic guidance that disclaims precision names **automated software testing** as a use case to focus on precisely because it sits where "speed isn't critical" — the one primary-source citation *for* agentic certification, and it is framed as a latency concession, which is exactly the non-gating, human-adjacent slot this doctrine gives it.

## The certification ladder

Recorded in TEST-STRATEGY.md `## Certification` — the tier, the probe results behind it, and the chosen mechanism. Rows come from the probe, never from tool marketing.

| Tier | What it is | Examples |
|---|---|---|
| **CERT-2** | A dedicated certifier application, separate from the building runtime; the certification brief is handed over; builder ≠ certifier is enforced naturally by the tool boundary | Codex desktop, Claude Desktop (computer use — research preview; see Tool notes), onorca |
| **CERT-1** | The building runtime drives a browser itself — weaker separation (same session, same model family), still real-conditions validation | Claude Code + Chrome, MCP-Playwright-class tools in the session, orca CLI on a visible display |
| **CERT-1 (limited)** | The probe shows partial capability — **inspection-grade only**: navigate/goto, snapshot, fill, wait, console reads work; click-through submission and screenshots do not. Certifies what can be read, not what must be clicked | environments where the probe records partial capability — e.g. a misconfigured Xvfb session failing the focus-bound ops (one 2026-08 dogfood launch recorded exactly that; a later clean launch on the same box passed all five ops — the row records the launch, not the machine) |
| **CERT-0** | No driver capable in this environment. Human UAT + the scripted smoke gate — stated as the **fallback**, not the strategy; the deferred row records what would promote it | headless CI boxes, locked-down machines |

Never present CERT-0 apologetically: the invariant is "certification happens," not "an agent does it." On CERT-0 the human IS the certifier and the brief below is written for them.

## Surface type — the ladder is general, not browser-only

Certification is real-conditions exercise of **the surface users actually touch**. That surface is not always a browser, and the tier language above ("drives a browser", the goto/click/screenshot probe) is the *browser instance* of a general idea — not the whole of it. Record the surface type first (it comes from ARCHITECTURE / the phase's deliverables, not from a probe):

| Surface | What "real-conditions exercise" is | The probe (the non-browser analog of goto→click→screenshot) | Honest tier |
|---|---|---|---|
| **browser** | a person clicking through the running app | the 5-command live probe below | CERT-2 / 1 / 1-limited / 0 as below |
| **cli** | the tool run from a real shell with real args | run it end to end for real: invoke each subcommand/flag a user would, assert **stdout + exit code + side effects** (files written, records changed) against what the brief says should happen | a fresh agent driving the real binary = **CERT-1** (or CERT-2 when a separate certifier runs it); no way to run it here = CERT-0 |
| **api** | the endpoints hit with real dependencies (real DB, real auth, never the suite's mocks) | issue the real requests a client would — status codes, response shape, auth enforcement, persisted effect — with a **seeded token/service credential** (§ auth substrate's non-login branch), not a browser login | driving the live service = **CERT-1** (CERT-2 when handed to a separate certifier); no runnable instance here = CERT-0 |
| **library** | there is **no user-facing runtime surface** | none — a library ships behavior to *other code*, and its correctness is the automated-test tier's job, not certification's | record `certification: N/A — no user-facing surface` (distinct from `N/A — no user-facing change`, which is for a refactor that shipped nothing new; a phase that ships a public API records the *no-surface* form, honestly, not the *no-change* form) |

**A CLI a shell drives perfectly is CERT-1, not CERT-0.** CERT-0 means "no way to exercise the real surface in this environment" — a locked-down box, a browser app with no driver — **not** "no browser". Reading CERT-0 onto a runnable CLI or API is the same category error as reading it onto a working browser: the mechanism exists, so name the tier the mechanism earns. When the *environment* later earns a browser tier the *app* cannot yet use, record the browser capability as deferred with its trigger (`first browser surface — re-probe then`) rather than letting the tier imply a mechanism that has nothing to drive.

The trust doctrine, the brief, the substrate, and the always-escalate set below apply to every surface. Only the **probe** and the **ladder examples** are browser-specific; everything else generalizes verbatim.

## Third-party certifier trust doctrine (mandatory — read before any launch)

**Sandbox-first.** The first launch of any third-party certifier tool **in this environment** — including the probe below, including a bare `--version` — happens in an **isolated HOME** (a sibling directory under the real `$HOME`, e.g. `$HOME/.gsd-cert-sandbox` — never under `/tmp`: some tools refuse to write helper binaries under a temp dir, which suppresses exactly the writes the audit exists to catch), followed by an **instrumentation audit** — *what did it write? which agent CLIs did it touch?* — before it is granted the real environment. "Installed" is not "launched": a binary that has never run under this HOME gets the same treatment as a fresh download.

The receipts (live dogfood, 2026-08, onorca 1.4.178 on WSL2): the first launch of even a bare `--version` silently instrumented **three agent CLIs** — **8 hook entries** into the installed codex CLI's `hooks.json` (pre/post tool use, permission requests, session and prompt events) with **self-granted `trusted_hash` entries** in codex's `config.toml` so they run without prompting, **11 hook entries plus a statusline override** into Claude Code's `settings.json`, and a `BeforeAgent` hook into Gemini's — plus the tool's own state directory carrying a trust-grant ledger for its contained runtime. **Zero consent UI.** Sandbox-HOME containment held: with `HOME` pointed at a sandbox, every write — the full instrumentation set included — landed inside it and the real environment stayed clean.

**Point, don't prescribe.** onorca is named as the lowest-friction capability acquisition today — a genuinely scriptable agent-browser CLI with per-identity profiles and real (if **undocumented**) headless operation under `orca serve` + Xvfb: full capability, click-through and screenshots included, when Xvfb comes up cleanly; the same ops fail when it does not — which is why capability is probed per launch, never assumed from a past row. Its headless browser semantics are verified empirically, not by the vendor; its docs contain no QA/testing/CI story. Named option with the trust caveat; no install prescriptions until a tool earns default status. Re-evaluate at later releases.

## The probe — capability is measured, never assumed

**A binary on PATH is a lead, not a capability — and so is a recorded row.** `command -v orca` succeeding says nothing about whether a click lands in this environment — the dogfood machine had a working binary, a working `goto`, and a click that returned `ok:true` while no request ever reached the server. And the recorded verdicts describe a launch, not the machine: the same box failed click and screenshot under a broken Xvfb and passed both under a clean one, so **re-probe before certifying** — a row's job is to say what to re-check, never to stand in for the check. Detection therefore has three stages:

1. **Observable checks first — run them, don't ask:** `command -v codex` / `command -v orca`; MCP browser tools present in the runtime (`mcp__playwright__*` responding); `claude` Chrome availability (not under WSL; disabled under API-key auth); WSL/headless/display detection; `playwright.config.*`; installed Playwright agent skills.
2. **The 5-command live probe** — for every driver found (after the trust gate above; a tool's first launch in this environment is never the probe), against a **throwaway page** (never the real app): `goto` → `snapshot` → **`fill`** → **click round-trip** → `screenshot`. The fill comes **before** the click on purpose: click-after-fill is the failure mode that defines CERT-1 (limited), and a probe that never fills structurally cannot measure the tier it assigns. The click is verified by its *effect* (did the state change actually land — a POST received, a navigation observed), never by its return value. Record the **per-operation** verdicts with the date; failures are data: goto/snapshot/fill pass + click/screenshot fail is exactly the CERT-1 (limited) shape.
3. **One question** — only for what nothing observable answers, because desktop certifier apps may live on another machine: *"Do you have Codex desktop, Claude Desktop, or onorca available for certification — on this machine or another?"* That is the whole interview.

**The throwaway substrate is self-served** — mid-loop there is no probe page lying around, and the two obvious shortcuts are both forbidden (the real app, a remote page — the click must land on a server *you* observe). The recipe: **one ~15-line local HTTP server on `127.0.0.1`** that serves a throwaway page (a heading, a text input, a submit button) *and* logs the POST bodies it receives. All five legs run against `http://127.0.0.1:<port>/` — goto/snapshot on the served page, fill → click → effect asserted on the server's own log — then tear it down.

**The page source is driver-dependent; the probe is not.** A `data:` URL is an inviting shortcut for the goto/snapshot legs, and some drivers accept it — but many navigation APIs reject non-`http(s)` schemes outright (verified live: onorca 1.4.178's `goto --url 'data:text/html,…'` returns `invalid_argument: Unsupported browser URL`, while its `tab create --url` accepts the identical string). That is a **fact about the driver's URL handling, not a capability verdict** — a first-time prober reading it as a demotion would record a tier the machine can actually beat. Serve the page over `http://127.0.0.1` and the question never arises; the echo server is already required for the click leg, so this costs nothing. If a driver's own docs prescribe a different page source, use it — the probe's contract is the five legs and the effect-verified click, never the transport.

Map the results to a tier and write tier + probe rows + mechanism into `## Certification`. Re-probe when the environment changes (new display, new machine, new driver) — the recorded rows say exactly what to re-check.

## The certification brief

The brief is the **canonical artifact** of a certification run; any script is derived from it.

- **Source:** the phase's UAT items plus the capsule's `## What Done Looks Like` (observable acceptance signals, already additive-only). **Certifier-agnostic and human-readable** — the same brief drives Codex desktop, an in-session driver, or a human on CERT-0.
- **Shape:** preconditions (seeded accounts, env, catcher running — on a handover, also the receiving machine's sandbox-first trust gate) → numbered flows, each with an *observable* expected outcome → evidence to capture (transcript; screenshots where the probe said the driver can; console/network captures) → escalation points (auth moments and CAPTCHAs always go to the human) → **`## How to report back`**: per-flow verdicts (`pass` / `fail` / `could-not-prove`) each justified by an evidence filename, written to `{phase_dir}/{phase_num}-CERTIFICATION-RESULT.md` beside the brief — the return path a handed-over brief is not complete without.
- **Starter scripts are accelerants, never canonical.** When a *scriptable* driver probed capable, an executable starter script MAY be emitted from the brief — regenerate it from the brief when they drift; never the reverse.
- **Independence.** A certification transcript is agent-authored evidence about agent-authored code — the `ai-test-quality.md` independence requirement applies in full force. Acceptance is anchored to the brief's human-anchored expected outcomes (from `## What Done Looks Like`), never to the driver's own **narration** of what it thinks it did.

## Seed accounts

Certification runs against **seeded test accounts**, never a real user's data and never an account created by hand mid-run. The policy has four parts:

- **An idempotent seed script** owns account creation — re-running it converges to the same state (create-or-update, never duplicate), so a certifier can reset and re-run without drift. It lives with the substrate setup (`templates/user-setup.md`'s `certification_substrate_example`), not inline in a test.
- **Role-tagged accounts, documented in TEST-STRATEGY.md.** Each seeded account is named by the role it certifies (`admin`, `member`, `unverified`, `billing-past-due`), and the roster — role, purpose, which flows it exercises — is recorded in TEST-STRATEGY.md's `## Certification substrate`, so the brief can reference an account by role rather than by a raw credential.
- **Credentials in the env/secret store, never in the repo.** The seed script reads secrets from the environment or secret manager; the accounts' passwords/tokens are agent-usable at run time but never committed, never printed into a transcript, never placed in a URL or query param. A seeded auth token is the credential a CLI/API certifier presents (see `## Auth for certification`).
- **Deterministic identifiers.** Seeded accounts use stable, collision-free identifiers (a dedicated test domain, `seed+{role}@…` plus-addressing routed to the sandbox mail catcher — the transport-level sink defined below) so a certification asserting on "the welcome email" knows exactly which inbox to read.

The seed script is a first-class substrate artifact: if the probe found a scriptable driver, the certification brief names the seeded role it needs, and the setup ran the seed script before the run — a certifier is never asked to invent an account.

## Auth for certification

The three-way fork: a vendor with a real testing story → use it; a vendor that documents the absence → authenticate once, persist the session; an emulator → know its ceiling. Per provider, verified stories only:

| Provider | Verified story for certification |
|---|---|
| **Clerk** | First-class: **Testing Tokens** exist precisely to pass bot detection (`@clerk/testing` Playwright package); `+clerk_test` email subaddresses and `555-01XX` test phones verify with the fixed code **424242** — no real email/SMS sent; dev instances have test mode on by default |
| **Auth0** | **No first-party test-user helper.** Auth0's own guidance: **browser automation** is the only way to test Universal Login, and the login endpoints are not for programmatic access; the password grant is discouraged and breaks on MFA/social. This is the citation that makes auth-once-persist-session the *correct* answer, not a cop-out |
| **Firebase** | Auth **Emulator** covers local/CI flows but issues **unsigned tokens rejected by production services** — useless for certifying a real environment |
| **Supabase** | Seeding via `supabase/seed.sql` (runs on `db reset`); a test OTP map exists for phone auth; the `service_role` key bypasses RLS — **never in a browser**, never in URLs or query params |

**One-time human auth, persisted session** — the formalized field pattern for a **browser** surface where no verified test mode exists: the human authenticates once; the storage state is persisted (e.g. `playwright/.auth/`), **gitignored**, and regenerated on expiry. Playwright's own warning ships with the pattern: the state file "may contain sensitive cookies and headers that could be used to **impersonate** you or your test account." Playwright's auth docs are silent on third-party OAuth/IdP flows — any recipe there is the project's own invention and must be labelled as such. "Ask the user to auth once" is an honest, first-class answer; OAuth moments and CAPTCHAs always escalate to the human.

**Non-browser auth (CLI / API surface): a seeded token, not a login.** An HTTP API or a CLI does not log in through a form — it presents a credential. The certification credential is a **seeded test token / service credential** minted for a seeded test account (§ seed accounts), scoped to the test workspace, held in the env/secret store, **never in the repo, never in a URL or query param**. The certifier presents it (`Authorization: Bearer …`, an API-key header, a service-role key used server-side only) and asserts the real service enforces it — a valid token succeeds, a missing/expired one is rejected. This is the branch `test-strategy.md`'s `auth-in-tests.md` reference covers and the one the certification chain must cite for CLI/API phases; the login/storage-state pattern above is browser-only and does not apply.

## Email safety

"Never a real recipient" has exactly one reliable enforcement point: **the transport.** Default: a sandbox catcher — **Mailpit**-class (SMTP :1025, web UI + REST API :8025; the API makes received mail assertable) — in local and CI. Plus-addressing is a *matching* convention, not delivery safety: the Sieve subaddress extension defines filtering, providers differ, and Exchange admins can disable it tenant-wide — never rely on `+tag` as a safety mechanism.

Provider test modes **differ in kind** — a blanket "use your provider's test mode" is wrong for two of five vendors:

| Vendor | Documented mechanism | Delivers? | Billed / counted? |
|---|---|---|---|
| **SendGrid** | `sandbox_mode` — validates the send request without delivering | No | No credits consumed |
| **Mailgun** | `o:testmode` — accepted but not sent | No | **You are charged for test-mode messages** |
| **Postmark** | Sandbox Servers | No | **Counts toward monthly sending volume** |
| **Resend** | **None — no test mode, no test key.** Magic recipients only (`delivered@resend.dev`, `bounced@resend.dev`, …) | Simulated outcomes | Not stated |
| **AWS SES** | Mailbox simulator (`success@` / `bounce@` … `@simulator.amazonses.com`) | Simulated outcomes | Billed; reputation-neutral |

Real recipients only when **deliverability IS the feature** under test — and then recorded as such in the substrate section, never as a silent default.

## LLM integrations

Certification and smoke use **real calls** when **the integration is the thing under test** — key wiring, prompt assembly, tool schemas, streaming, error handling. Neither major vendor ships a test billing mode, so the cost is bounded structurally:

- a **dedicated test key** in its own workspace/project with a **hard spend cap** (the workspace/project is the blast-radius primitive; archiving revokes);
- a **configurable pinned model** at the cheap-but-representative tier — pin a dated snapshot (some vendor aliases resolve to the latest snapshot; dateless current-generation IDs generally do not) — and note that even a pinned ID doesn't pin serving behavior;
- the **transcript captured as evidence** of the run.

**Assertions on shape, never content.** Anthropic's own disclaimer: even with `temperature` of `0.0`, results "will **not be fully deterministic**." Assert status, schema/structured-output validity, tool-call names, non-emptiness, latency bounds — never expected prose. Content-grading belongs to the non-gating eval tier (`ai-evals.md`), not to a gate.

**Stubs remain correct** in three named cases: rate-limited or paid-per-call loops that run on every PR; assertions that genuinely need determinism (unit/integration tiers); offline/fork-PR runs with no secrets. One trap to flag: the standard record/replay libraries do not document SSE/streaming support, so "just record the API calls" tends to fail on streamed responses (MSW is the documented exception; forcing non-streaming in replay is the other path).

## Tool notes (point, don't prescribe)

Capabilities as documented by each vendor — the strategy names options and records what the probe found; it prescribes none of them:

- **Playwright CLI + skills / Playwright MCP** — the CI-shaped substrate: headless by default, `--isolated`, `--storage-state`, traces/video/screenshots as evidence; what both Microsoft and OpenAI steer coding agents toward. The planner→generator→healer agents (`npx playwright init-agents --loop=claude|codex|vscode|opencode`) are the first-party authoring/maintenance loop for the scripted gate; the **healer skips tests it believes reflect genuinely broken functionality** — the guardrail that keeps self-healing from becoming self-deceiving.
- **Claude Code `--chrome`** — drives real, visible Chrome sharing the user's login state; pauses and hands login/CAPTCHA to the human; not available under WSL, disabled under API-key auth. A certifier, not a gate.
- **Claude Desktop (Cowork / Claude Code in the desktop app)** — **computer use in research preview** (vendor-documented, fetched 2026-08): clicks, types, opens apps, and drives the browser via Claude in Chrome, on macOS and Windows (Pro/Max plans); asks permission per application; the desktop session must be active and the app open — the vendor's own statement of the desktop-session-bound shape. A certifier surface, not a gate.
- **Codex desktop / ChatGPT app browser** — an app surface with a built-in browser; brief-driven certification fits it; no CLI/CI surface documented.
- **onorca** — desktop ADE with the most complete scriptable agent-browser CLI found (snapshot/`@eN` refs, console, network, `--json`); trust caveat and headless limits above.
- **Cursor agent browser** — in-IDE pane; navigate/click/type/screenshot/console/network; nothing documented about unattended execution.

The shape to remember: **the tools developers actually have on the desktop cannot run unattended, and the tools that can run unattended are Playwright.** That is why the gate is scripted and certification is human-adjacent — not a compromise, the only arrangement the primary sources support.

---
*Consumed by `/gsd:testing-strategy` (capability detection, substrate, gate-vs-certify) and by `verify-work`'s pre-UAT certification step (trust gate, re-check, brief). The tier, probe rows, mechanism, and substrate live in `.planning/TEST-STRATEGY.md`.*
