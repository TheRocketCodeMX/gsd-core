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
// 4. Stop / SubagentStop are silent. Subagents (no metrics file) are silent.
//
// Gates: only fires when GSD is active (.planning/STATE.md under cwd) and the
// context-lifecycle hook is enabled in .planning/config.json.
//
// Debounce: DEBOUNCE_CALLS tool uses between warn messages to avoid spam;
// severity escalation (warn -> urge) bypasses the debounce and fires once.
//
// Safety: this hook must NEVER crash the session. Every fs op is guarded; any
// error results in a silent exit 0. It never spawns child processes.

const fs = require('fs');
const os = require('os');
const path = require('path');

const STALE_SECONDS = 60;    // ignore metrics older than 60s
const DEBOUNCE_CALLS = 5;    // min tool uses between warn messages

// Config defaults (overridable via .planning/config.json context_lifecycle.*).
const DEFAULTS = { enabled: true, warnPct: 90, urgePct: 95 };

// Read context-lifecycle hook config from {cwd}/.planning/config.json. Keys may
// be flat ("context_lifecycle.hook_enabled") or nested (context_lifecycle: {...});
// read both defensively. Any error (absent file, bad JSON) → defaults.
function readConfig(cwd) {
  try {
    const configPath = path.join(cwd, '.planning', 'config.json');
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const nested = (raw && typeof raw.context_lifecycle === 'object') ? raw.context_lifecycle : {};
    const get = (flatKey, nestedKey) => {
      if (raw && raw[flatKey] !== undefined) return raw[flatKey];
      if (nested[nestedKey] !== undefined) return nested[nestedKey];
      return undefined;
    };
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
const stdinTimeout = setTimeout(() => process.exit(0), 3000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('error', () => {
  clearTimeout(stdinTimeout);
  process.exit(0);
});
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);
    const event = data.hook_event_name;
    const cwd = data.cwd || process.cwd();

    // Stop / SubagentStop → nothing to say.
    if (event === 'Stop' || event === 'SubagentStop') return;

    // GSD-active gate: no .planning/STATE.md under cwd → stay silent (all events).
    if (!fs.existsSync(path.join(cwd, '.planning', 'STATE.md'))) return;

    const cfg = readConfig(cwd);
    if (!cfg.enabled) return;

    // PreCompact always emits (regardless of metrics/thresholds).
    if (event === 'PreCompact') {
      emit(PRECOMPACT_MESSAGE, event);
      return;
    }

    // Metrics-driven path (PostToolUse and friends) needs a session id.
    const sessionId = data.session_id;
    if (!sessionId) return;

    const tmpDir = os.tmpdir();
    const metricsPath = path.join(tmpDir, `claude-ctx-${sessionId}.json`);

    // No metrics file → subagent or fresh session; stay silent.
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
    // Silent fail — a hook must never block or crash the session.
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
