#!/usr/bin/env node
// gsd-hook-version: {{GSD_VERSION}}
// Context Monitor — calm knowledge-flush nudge (@therocketcode/gsd-core).
//
// TONE CONTRACT (CI-linted by tests/feat-context-hook.test.cjs case 8):
// messages emitted by this hook must NEVER contain the words
// "CRITICAL", "URGENT", "immediately", or "STOP". This hook deliberately
// REPLACES the disabled upstream context-warning hook, whose panicked tone
// ("CONTEXT CRITICAL... STOP") derailed agents. The mechanism was never the
// problem — the tone was. Here the same mechanism carries a calm curation
// purpose: at high context usage, gently suggest a knowledge checkpoint via
// `/gsd:context flush`.
// See: docs/superpowers/specs/2026-07-18-context-lifecycle-design.md
//
// How it works:
// 1. The statusline hook writes metrics to {os.tmpdir()}/claude-ctx-{session_id}.json
// 2. This hook (PostToolUse) reads those metrics and, when used_pct crosses a
//    threshold, injects a calm flush suggestion as additionalContext.
// 3. On PreCompact it always emits a final flush + re-anchor reminder.
// 4. Stop / SubagentStop are silent. A subagent (an input carrying agent_id,
//    #6360) is silent on every event and touches no session file.
//
// Gates: only fires when GSD is active (a STATE.md at the .planning root, in the
// active scope, or in any named project or workstream) and the context-lifecycle
// hook is enabled in the active scope's config (resolveScope below).
//
// Debounce: DEBOUNCE_CALLS tool uses between warn messages to avoid spam;
// severity escalation (warn -> urge) bypasses the debounce and fires once.
//
// Safety: this hook must NEVER crash the session. Every fs op is guarded; any
// error results in a silent exit 0. It never spawns child processes (it never
// compiles an unbuilt runtime library: that case keeps the root-only read).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { HOOK_ON_CRASH, allow, crash } = require('./lib/hook-exit.js');
// Upstream #5759 (ported align-1.21.0): the one bounded config.json reader every hook uses,
// so a FIFO/device/oversize .planning/config.json cannot block the tool call this rides in on.
const { readConfigFileBounded } = require('./lib/config-read.js');

// ADR-3889 / #3911: declared crash policy. This hook is advisory-only and must
// NEVER block a session — a crash is a silent PASS (exit 0), exactly the
// pre-#3911 behaviour, now declared instead of implied by a bare exit.
const ON_CRASH = HOOK_ON_CRASH.ALLOW;

const STALE_SECONDS = 60;    // ignore metrics older than 60s
const DEBOUNCE_CALLS = 5;    // min tool uses between warn messages

// Config defaults (overridable via .planning/config.json context_lifecycle.*).
const DEFAULTS = { enabled: true, warnPct: 90, urgePct: 95 };

// matrix1230-A K1: the active planning scope, resolved by upstream's own owners
// (planning-workspace: GSD_PROJECT, then GSD_WORKSTREAM or the session/shared
// workstream pointer, read with the non-mutating peek) — the scope config-get
// answers for. A flat project (no GSD_PROJECT, no GSD_WORKSTREAM, no
// .planning/workstreams/) never loads the library. An unbuilt library (raw
// plugin or git checkout) is never compiled from here; any failure → the root.
function resolveScope(cwd) {
  const root = { dir: path.join(cwd, '.planning'), ws: null, pw: null };
  const project = (process.env.GSD_PROJECT || '').trim();
  const wsEnv = (process.env.GSD_WORKSTREAM || '').trim();
  if (!project && !wsEnv && !fs.existsSync(path.join(cwd, '.planning', 'workstreams'))) return root;
  try {
    const seam = require('../gsd-core/bin/ensure-runtime-build.cjs');
    if (!seam.isBuilt(path.join(__dirname, '..', 'gsd-core', 'bin', 'lib'))) return root;
    seam.ensureRuntimeBuild();   // the build seam's fast path: the library is built (checked above)
    const pw = require('../gsd-core/bin/lib/planning-workspace.cjs');
    const ws = wsEnv || pw.peekActiveWorkstream(cwd) || null;
    return { dir: pw.planningDir(cwd, ws), ws, pw };
  } catch {
    return root;
  }
}

// matrix1230-A K7: a repo whose projects are all named (.planning/<name>/) or
// all workstreams has no root STATE.md; it is still a GSD project.
function gsdActive(cwd, scope) {
  const planning = path.join(cwd, '.planning');
  if (fs.existsSync(path.join(planning, 'STATE.md')) || fs.existsSync(path.join(scope.dir, 'STATE.md'))) return true;
  let entries;
  try { entries = fs.readdirSync(planning, { withFileTypes: true }).slice(0, 256); } catch { return false; }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const sub = path.join(planning, e.name);
    if (e.name !== 'workstreams') { if (fs.existsSync(path.join(sub, 'STATE.md'))) return true; continue; }
    try {
      if (fs.readdirSync(sub, { withFileTypes: true }).slice(0, 256)
        .some((w) => w.isDirectory() && fs.existsSync(path.join(sub, w.name, 'STATE.md')))) return true;
    } catch { /* unreadable → not this one */ }
  }
  return false;
}

// Read context-lifecycle hook config. Keys may be flat
// ("context_lifecycle.hook_enabled") or nested (context_lifecycle: {...}); read
// both defensively. Outside a named project or workstream: {cwd}/.planning/config.json,
// flat over nested. In one: upstream's scoped ladder (readScopedConfigValue,
// the value config-get reports: the scope's own key, else the root's under a
// workstream only), nested over flat. Any error (absent file, bad JSON) → defaults.
function readConfig(cwd, scope) {
  try {
    let get;
    if (scope && scope.pw) {
      const read = (keyPath) => {
        const r = scope.pw.readScopedConfigValue(cwd, keyPath, scope.ws);
        return r.present ? r.value : undefined;
      };
      get = (flatKey, nestedKey) => {
        const nestedValue = read(['context_lifecycle', nestedKey]);
        return nestedValue !== undefined ? nestedValue : read([flatKey]);
      };
    } else {
      const configPath = path.join(cwd, '.planning', 'config.json');
      const raw = JSON.parse(readConfigFileBounded(configPath, { required: true }));
      const nested = (raw && typeof raw.context_lifecycle === 'object') ? raw.context_lifecycle : {};
      get = (flatKey, nestedKey) => {
        if (raw && raw[flatKey] !== undefined) return raw[flatKey];
        if (nested[nestedKey] !== undefined) return nested[nestedKey];
        return undefined;
      };
    }
    // Master switch: context_lifecycle.enabled silences EVERYTHING when false.
    // The hook fires only when master AND hook_enabled are both on (both default true).
    const master = get('context_lifecycle.enabled', 'enabled');
    const hookEnabled = get('context_lifecycle.hook_enabled', 'hook_enabled');
    const masterOn = (master === undefined) ? DEFAULTS.enabled : Boolean(master);
    const hookOn = (hookEnabled === undefined) ? DEFAULTS.enabled : Boolean(hookEnabled);
    const warn = get('context_lifecycle.hook_warn_pct', 'hook_warn_pct');
    const urge = get('context_lifecycle.hook_urge_pct', 'hook_urge_pct');
    return {
      enabled: masterOn && hookOn,
      warnPct: (typeof warn === 'number') ? warn : DEFAULTS.warnPct,
      urgePct: (typeof urge === 'number') ? urge : DEFAULTS.urgePct,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function warnMessage(usedPct) {
  return `Context is ${usedPct}% used. Good moment for a knowledge checkpoint: ` +
    `run /gsd:context flush — update MASTER-CONTEXT.md (supersede stale entries), ` +
    `enrich the current phase capsule, and record position in STATE.md. Then carry on.`;
}

function urgeMessage(usedPct) {
  return `${warnMessage(usedPct)} If you haven't flushed yet this session, do it now — ` +
    `knowledge not written down will not survive compaction.`;
}

const PRECOMPACT_MESSAGE =
  'Compaction is coming. Final knowledge flush: append unsaved decisions and ' +
  'discoveries to the current phase capsule and MASTER-CONTEXT.md (run /gsd:context flush). ' +
  'After compaction, the first act is re-anchoring: read MASTER-CONTEXT.md + the phase ' +
  'capsule + the last SUMMARY, then run gsd-tools context verify.';

let input = '';
// Timeout guard: if stdin never closes (pipe issues on Windows/Git Bash), exit
// silently rather than hang until Claude Code kills the process. See #775.
const stdinTimeout = setTimeout(() => allow(undefined), 3000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('error', () => {
  clearTimeout(stdinTimeout);
  allow(undefined);
});
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);
    const event = data.hook_event_name;
    const cwd = data.cwd || process.cwd();

    // Upstream #6360 (ported align-1.23.0): a subagent's hook input carries the
    // PARENT's session_id plus a non-empty agent_id. Every path below is keyed on
    // session_id (bridge metrics, debounce file) or speaks to the main session
    // (the PreCompact flush reminder), so a subagent exits here, on every event,
    // before any of them is read or written. A top-level `claude --agent`
    // session (agent_type only, no agent_id) is monitored as before.
    if (typeof data.agent_id === 'string' && data.agent_id !== '') return;

    // Stop / SubagentStart / SubagentStop → nothing to say.
    if (event === 'Stop' || event === 'SubagentStart' || event === 'SubagentStop') return;

    // GSD-active gate: no STATE.md in any planning scope under cwd → stay silent (all events).
    const scope = resolveScope(cwd);
    if (!gsdActive(cwd, scope)) return;

    const cfg = readConfig(cwd, scope);
    if (!cfg.enabled) return;

    // PreCompact always emits (regardless of metrics/thresholds).
    if (event === 'PreCompact') {
      emit(PRECOMPACT_MESSAGE, event);
      return;
    }

    // #2289-adapted (upstream 1.9.0): the hookSpecificOutput.additionalContext
    // envelope is only a valid output shape for the context-injection events.
    // Metrics-driven nudges emit only for PostToolUse / AfterTool; a missing
    // event name keeps the fork's test-pinned PostToolUse fallback. Any other
    // named lifecycle event (however this hook gets wired on a given host)
    // exits 0 silently. PreCompact keeps its dedicated always-emit branch
    // above — the fork's flush contract pins it.
    if (event && event !== 'PostToolUse' && event !== 'AfterTool') return;

    // Metrics-driven path (PostToolUse / AfterTool) needs a session id.
    const sessionId = data.session_id;
    if (!sessionId) return;

    const tmpDir = os.tmpdir();
    const metricsPath = path.join(tmpDir, `claude-ctx-${sessionId}.json`);

    // No metrics file → fresh session or no statusline bridge; stay silent.
    if (!fs.existsSync(metricsPath)) return;

    const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    const now = Math.floor(Date.now() / 1000);

    // Ignore stale metrics.
    if (metrics.timestamp && (now - metrics.timestamp) > STALE_SECONDS) return;

    const usedPct = metrics.used_pct;
    if (typeof usedPct !== 'number') return;

    // Below the warn threshold → nothing to suggest.
    if (usedPct < cfg.warnPct) return;

    const currentLevel = (usedPct >= cfg.urgePct) ? 'urge' : 'warn';

    // Debounce state.
    const warnPath = path.join(tmpDir, `claude-ctx-${sessionId}-warned.json`);
    let warnData = { callsSinceWarn: 0, lastLevel: null };
    let firstWarn = true;
    if (fs.existsSync(warnPath)) {
      try {
        warnData = JSON.parse(fs.readFileSync(warnPath, 'utf8'));
        firstWarn = false;
      } catch {
        // Corrupted state → treat as fresh.
      }
    }
    warnData.callsSinceWarn = (warnData.callsSinceWarn || 0) + 1;

    // Escalation (warn -> urge) bypasses the debounce and fires once.
    const escalated = currentLevel === 'urge' && warnData.lastLevel === 'warn';

    if (!firstWarn && warnData.callsSinceWarn < DEBOUNCE_CALLS && !escalated) {
      // Still debouncing — persist the counter, emit nothing.
      try { fs.writeFileSync(warnPath, JSON.stringify(warnData)); } catch { /* ignore */ }
      return;
    }

    // Fire: reset debounce counter and record the level.
    warnData.callsSinceWarn = 0;
    warnData.lastLevel = currentLevel;
    try { fs.writeFileSync(warnPath, JSON.stringify(warnData)); } catch { /* ignore */ }

    const message = currentLevel === 'urge' ? urgeMessage(usedPct) : warnMessage(usedPct);
    emit(message, event);
  } catch {
    // Silent fail — a hook must never block or crash the session. Declared
    // policy (ADR-3889 / #3911): ALLOW → exit 0 with no payload.
    crash(ON_CRASH, undefined);
  }
});

// Write the single permitted stdout payload. Nothing else is ever printed.
// Natural process exit flushes stdout; we never call process.exit after writing.
function emit(message, event) {
  const output = {
    hookSpecificOutput: {
      hookEventName: event || 'PostToolUse',
      additionalContext: message,
    },
  };
  process.stdout.write(JSON.stringify(output));
}
