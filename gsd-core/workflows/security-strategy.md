<purpose>
Decide the app-wide, decide-once security posture — the prerequisite gate per-feature enforcement inherits — thin and scale-to-zero. Runs after recommend-architecture, before infrastructure/cicd/plan. Produces `.planning/SECURITY-STRATEGY.md`, registered as a canonical reference. Enforcement stays folded (the planner's per-phase threat models, gsd-security-auditor, secure-phase, cicd supply-chain). Recommends; the user decides.
</purpose>

<required_reading>
@~/.claude/gsd-core/references/security-posture.md
@~/.claude/gsd-core/templates/security-strategy.md
</required_reading>

<process>

## Step 1: Initialize

```bash
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; if [ -f "$GSD_TOOLS" ]; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif command -v gsd-tools >/dev/null 2>&1; then GSD_TOOLS="$(command -v gsd-tools)"; gsd_run() { "$GSD_TOOLS" "$@"; }; elif [ -f "$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and gsd-tools is not on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi
COMMIT_DOCS=$(gsd_run query config-get commit_docs 2>/dev/null || echo "true")
RESPONSE_LANG=$(gsd_run query config-get response_language 2>/dev/null || true)
ls .planning/PROJECT.md >/dev/null 2>&1 && echo "PROJECT_FOUND" || echo "NO_PROJECT"
ls .planning/adr/*.md >/dev/null 2>&1 && echo "HAS_ADR" || echo "NO_ADR"
ls .planning/SECURITY-STRATEGY.md >/dev/null 2>&1 && echo "EXISTS" || echo "NEW"
gsd_run query config-get workflow.security_asvs_level 2>/dev/null || echo "1"
```

**If `NO_PROJECT`:** Stop — "No project found. Run /gsd:new-project first." Exit.
**If `NO_ADR`:** unless recommend-architecture is a ledgered skip (`gsd_run query project strategy-skipped recommend-architecture --raw` = `true` → note once, don't re-offer), tell the user "No architecture decision found — I'll derive the posture from PROJECT.md/REQUIREMENTS directly. (Consider `/gsd:recommend-architecture` first for trust-boundary grounding.)" Then proceed with the docs at hand (the ADR sharpens topology/trust boundaries; it is not required).
**If `RESPONSE_LANG` non-empty:** user-facing text in that language; keep ASVS/STRIDE/regime names (PCI/HIPAA/GDPR) and technical terms in English.
**Text mode** (`--text` OR `workflow.text_mode: true`): replace every `AskUserQuestion` with a plain-text numbered list.
**If `EXISTS` and not `--auto`:** ask Update / View / Skip (header "Security"). On Skip: exit. On View: show then Update/Skip.

## Step 2: Load context

```bash
gsd_run query project mode 2>/dev/null   # the recorded mode (Origin/Design/Code-quality) — robust + placeholder-aware
cat .planning/adr/*.md 2>/dev/null | tail -150                       # topology + trust boundaries
cat .planning/DOMAIN-MODEL.md 2>/dev/null || true                    # actors/roles for the authz model
```

**Read `@~/.claude/gsd-core/references/security-posture.md` now** — the hybrid spine, ASVS-by-context, the floor + trigger-rungs, the regime master-switch, the authz ladder, the auth-method matrix, the threat-model parent, and the secure-SDLC DoD. **Grounding maturity governs depth** — draft from the ADR / DOMAIN-MODEL / PROJECT.md and confirm; reserve `AskUserQuestion` for genuine decision points. **Scale-to-zero:** for a low-sensitivity app, resolve the whole posture in one screen.

**Brownfield mode (existing code — assess-then-evolve).** When `## Mode` records Origin = brownfield-extend / rewrite-refactor, or — when `## Mode` is absent — `.planning/codebase/*.md` / real source is present, do NOT only forward-decide the target posture: also **audit the current posture and produce a remediation plan**. Read `@~/.claude/gsd-core/references/brownfield-adaptation.md` and scan the existing code/maps for the posture-relevant facts — current auth method + session handling, secrets handling (hardcoded? env? a manager?), input validation/output encoding at the edges, authz enforcement points, transport/at-rest encryption, dependency/supply-chain hygiene. Record each gap as a **decision card** (current → target (the floor/ASVS rung) → gap cost: data-exposure blast radius · exploitability · reversibility → Follow / Improve / Refactor) and **default-select Improve**; sequence remediation (don't block the milestone on a full rewrite). **For Code-quality = vibe-coded-to-harden this is the heart of the skill** — assume auth/secrets/validation are thin-or-absent and produce the hardening remediation roadmap, not a greenfield posture. Greenfield (no existing code) keeps the forward derivation below as the default.

## Step 3: Data classification + regime

`AskUserQuestion` (header "Security") only if the docs don't answer: "What's the most sensitive data this handles, and does any regulatory regime apply (GDPR / HIPAA / PCI / FedRAMP / none)?" Classify: public / internal / confidential / regulated. The regime is the **master switch** (Step 4 + the floor↑rungs).

## Step 4: Derive the ASVS level — and write it back

Derive from context (data sensitivity × blast radius × regulatory exposure): L1 = public/low-sensitivity; L2 = sensitive personal/financial / authenticated multi-tenant / regulated domain; L3 = safety/mission-critical / systemic blast radius. **Do not leave the static default for a real app.** Write it back so the planner + auditor consume it:

```bash
gsd_run query config-set workflow.security_asvs_level <1|2|3>
```

## Step 5: Authz model + auth method

From DOMAIN-MODEL's actors/roles (or ask): record the authz model — **RBAC** (few stable roles) → **+ABAC** (context/attribute decisions, role explosion) → **+ReBAC** (relationship-derived: sharing/nesting/multi-tenant hierarchy) — and the **auth method** (opaque-cookie session default for first-party web; short-lived JWT for OAuth/service/stateless APIs — never as a long-lived web session; OIDC for SSO; API keys for M2M). When the choice hinges on a current best-maintained IdP/authz library, runtime-verify it (WebSearch) and record dated. The FE-side CORS/CSRF defaults belong in the seam (`fe-be-seam.md`) — point, don't restate.

## Step 6: Threat-model parent + secrets + DoD

- **App-wide trust boundaries + data-flow + top-level STRIDE** — the *parent* per-phase threat models inherit (the framework's planner→security-auditor→secure-phase flow refines it per phase; a pure refactor inherits-and-attests).
- **Secrets/key strategy** — workload-identity-first; the secret-manager rung. Pointer to `infrastructure-strategy` for the cloud-specific config.
- **Security DoD** — which CI gates block at this tier (floor: SCA + secret-scan + lockfile + SAST-on-changed; L2+: SAST-blocking + DAST-on-staging + authz/crypto tests; consumed by `cicd-strategy`).

## Step 7: Present & write

**Recommend, don't dictate.** Present via `AskUserQuestion` (header "Security"): the derived posture in one paragraph (classification + ASVS level + authz/auth + the DoD), and any rung above the floor with its trigger. Once approved, render `@~/.claude/gsd-core/templates/security-strategy.md` and write to `.planning/SECURITY-STRATEGY.md`. Keep it half-a-page for L1; grow only with the tier.

## Step 8: Commit

```bash
if [ "$COMMIT_DOCS" = "true" ]; then
  gsd_run query commit "docs: record security posture" --files .planning/SECURITY-STRATEGY.md .planning/config.json
else
  echo "SECURITY-STRATEGY.md written but not committed (commit_docs is false)."
fi
```

## Step 9: Wrap up

Display:
```
SECURITY-STRATEGY.md written — security posture decided.

  Data: [classification]; Regime: [PCI/HIPAA/GDPR/none]; ASVS level: [N] (written to config)
  Authz: [RBAC/ABAC/ReBAC]; Auth: [cookie-session/JWT/OIDC]
  Threat-model parent recorded; Security DoD: [floor / L2 / L3 gates]

Next: /gsd:frontend-architecture (if the project has a frontend) → /gsd:testing-strategy → plan-phase
```

**Auto-advance (chain):** after this skill, follow `@~/.claude/gsd-core/workflows/strategy-chain/modes/advance.md` with `CURRENT=security-strategy` — in `--auto` it dispatches the next `## Strategy Plan` step (honoring skips) onward to the build loop; interactive runs use the `Next:` pointer above.

**Roadmap reconciliation:** scan ROADMAP.md — if a phase assumes a security control this posture mandates (or now requires an authz/secrets phase), SAY SO and offer `/gsd:phase --edit`. Never leave a known contradiction unspoken.

</process>

<critical_rules>
- **Scale-to-zero.** Don't impose ceremony on a low-sensitivity app (the security-binder trap); don't leave the ASVS default for a real app (the under-engineering trap).
- **Decide-once posture only.** Enforcement stays folded (planner threat models / security-auditor / secure-phase / cicd). Don't duplicate per-feature checks here.
- **Write the ASVS level back to config** so the planner + auditor consume it unchanged.
- **Recommend, don't dictate.** Respect `commit_docs` / `response_language`.
</critical_rules>

<success_criteria>
- Data classified + regime(s) identified
- ASVS level derived from context and written back to `workflow.security_asvs_level` config
- Authz model + auth method recorded (consuming model-domain actors)
- App-wide trust-boundary/threat-model parent + secrets strategy + security DoD recorded
- Scale-to-zero respected; SECURITY-STRATEGY.md written + committed (when commit_docs is true); user directed onward
</success_criteria>
