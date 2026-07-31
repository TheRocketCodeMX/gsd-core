'use strict';

/**
 * #2289 — gsd-context-monitor lifecycle-event output allowlist.
 *
 * The context monitor emits a `hookSpecificOutput.additionalContext` envelope
 * to inject context warnings. That shape is only valid for the context-injection
 * events (PostToolUse, and AfterTool for the Gemini dialect). Codex also wires
 * this hook to Stop / SubagentStart / SubagentStop / PreCompact (#772), and
 * Codex's Stop schema REJECTS the envelope ("hook returned invalid stop hook
 * JSON output"). The fix uses a positive allowlist: emit only for
 * injection-capable events; every other event — and a missing/unknown name —
 * exits 0 with NO stdout, while side effects (debounce, critical-session
 * recording) still run.
 *
 * These tests drive the real hook script end-to-end (spawn + stdin + a fresh
 * metrics bridge file), asserting behavior, not source text.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const HOOK_PATH = path.join(__dirname, '..', 'hooks', 'gsd-context-monitor.js');

// Run the monitor with a synthetic, fresh metrics bridge file.
// Returns { stdout, warnData } and cleans up the bridge + sentinel files.
// opts: { event, remaining, used = 80, gemini = false, gsdActive = false,
//         sessionId (FORK: share one bridge across runs), keep (FORK: skip cleanup) }
function runMonitor(opts) {
  const {
    event,
    remaining,
    used = 80,
    gemini = false,
    gsdActive = false,
    // FORK: the calm-hook debounce is per-session state, so the adapted
    // side-effect tests below need two spawns against ONE session.
    sessionId = `fix-2289-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    keep = false,
  } = opts;
  const tmpDir = os.tmpdir();
  const metricsPath = path.join(tmpDir, `claude-ctx-${sessionId}.json`);
  const warnPath = path.join(tmpDir, `claude-ctx-${sessionId}-warned.json`);

  // Fresh (non-stale) metrics: timestamp is "now" in seconds.
  fs.writeFileSync(metricsPath, JSON.stringify({
    timestamp: Math.floor(Date.now() / 1000),
    remaining_percentage: remaining,
    used_pct: used,
  }));

  // Optional GSD-active project dir (STATE.md present) so the critical-session
  // recording side effect is reachable.
  let cwd = tmpDir;
  let projDir = null;
  if (gsdActive) {
    projDir = fs.mkdtempSync(path.join(tmpDir, 'fix-2289-proj-'));
    fs.mkdirSync(path.join(projDir, '.planning'), { recursive: true });
    fs.writeFileSync(path.join(projDir, '.planning', 'STATE.md'), '# State\n');
    cwd = projDir;
  }

  const payload = { session_id: sessionId, cwd };
  if (event !== undefined) payload.hook_event_name = event;

  const env = { ...process.env };
  if (gemini) env.GEMINI_API_KEY = 'test-key';
  else delete env.GEMINI_API_KEY;

  let stdout = '';
  try {
    stdout = execFileSync(process.execPath, [HOOK_PATH], {
      input: JSON.stringify(payload),
      env,
      encoding: 'utf8',
      timeout: 8000,
    });
  } catch (e) {
    stdout = e.stdout || '';
  }

  let warnData = null;
  try {
    warnData = JSON.parse(fs.readFileSync(warnPath, 'utf8'));
  } catch { /* sentinel may not exist */ }

  // Cleanup (FORK: skipped when `keep` — a follow-up run reuses the bridge)
  if (!keep) {
    for (const p of [metricsPath, warnPath]) {
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    }
  }
  if (projDir) {
    // Retry-tolerant teardown: the critical path fires a detached, unref()'d
    // `state record-session` grandchild against projDir, and execFileSync does
    // not wait for it. maxRetries/retryDelay absorbs the transient
    // EBUSY/ENOTEMPTY window while that process exits, so cleanup can neither
    // flake nor leak the temp dir (mirrors tests/helpers.cjs cleanup(); see the
    // #2289 review and the prior fix in perf-317-context-monitor-fs.test.cjs).
    // eslint-disable-next-line local/no-raw-rmsync-in-tests -- test fixture teardown of a unique mkdtemp dir
    try { fs.rmSync(projDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }); } catch { /* ignore */ }
  }

  return { stdout, warnData };
}

describe('#2289 context-monitor: non-injection events exit silently', () => {
  // Boundary coverage around WARNING (35) and CRITICAL (25) — Stop must stay
  // silent at limit-1 / limit / limit+1 for BOTH thresholds.
  for (const remaining of [40, 36, 35, 34, 26, 25, 24, 20]) {
    test(`Stop event at remaining=${remaining}% → exit 0, empty stdout`, () => {
      const { stdout } = runMonitor({ event: 'Stop', remaining });
      assert.strictEqual(stdout, '', `Stop must emit nothing at remaining=${remaining}% (Codex rejects the envelope)`);
    });
  }

  test('missing hook_event_name (no Gemini) at 30% → empty stdout', () => {
    const { stdout } = runMonitor({ event: undefined, remaining: 30 });
    assert.strictEqual(stdout, '', 'a missing event name must not fall through to the injection envelope');
  });

  test('empty-string hook_event_name (no Gemini) at 30% → empty stdout', () => {
    const { stdout } = runMonitor({ event: '   ', remaining: 30 });
    assert.strictEqual(stdout, '', 'a blank event name must be treated as missing → silent');
  });

  for (const event of ['SubagentStart', 'SubagentStop', 'PreCompact', 'SessionStart', 'BeforeTool']) {
    test(`unknown/non-injection event "${event}" at 30% → empty stdout`, () => {
      const { stdout } = runMonitor({ event, remaining: 30 });
      assert.strictEqual(stdout, '', `${event} is not injection-capable and must emit nothing`);
    });
  }
});

// FORK: the two describe blocks below are ADAPTED to this fork's hook (see
// docs/FORK-DELTA.md, context-monitor). Upstream's context monitor warns on
// remaining_percentage (WARNING ≤35 / CRITICAL ≤25) with a "CONTEXT CRITICAL"
// tone and runs Stop-time bookkeeping (debounce level + critical-session
// recording). This fork REPLACED that hook wholesale with the calm
// knowledge-flush nudge (fork policy: tone contract bans CRITICAL/URGENT;
// thresholds are used_pct ≥ warnPct 90 / urgePct 95; emission is gated on a
// GSD-active project; Stop is silent AND side-effect-free because the hook is
// spawn-free and keeps no state outside the metrics path). The #2289 contract
// itself — the envelope only ever leaves on injection-capable events — is
// adopted and pinned unchanged in the first describe block above. What follows
// pins the SAME two upstream intents ("injection events still warn",
// "no output ≠ no side effect") against the fork's mechanism.
describe('#2289 context-monitor: injection events still warn (fork calm-hook semantics)', () => {
  test('PostToolUse at used 92% (GSD active) → calm envelope with hookEventName PostToolUse', () => {
    const { stdout } = runMonitor({ event: 'PostToolUse', remaining: 10, used: 92, gsdActive: true });
    assert.notStrictEqual(stdout, '', 'PostToolUse must still emit a warning envelope');
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.hookSpecificOutput.hookEventName, 'PostToolUse');
    assert.match(parsed.hookSpecificOutput.additionalContext, /knowledge checkpoint/);
    assert.doesNotMatch(parsed.hookSpecificOutput.additionalContext, /CRITICAL|URGENT/, 'fork tone contract');
  });

  test('PostToolUse at used 96% (GSD active) → urge envelope (escalated, still calm)', () => {
    const { stdout } = runMonitor({ event: 'PostToolUse', remaining: 4, used: 96, gsdActive: true });
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.hookSpecificOutput.hookEventName, 'PostToolUse');
    assert.match(parsed.hookSpecificOutput.additionalContext, /do it now/);
    assert.doesNotMatch(parsed.hookSpecificOutput.additionalContext, /CRITICAL|URGENT/, 'fork tone contract');
  });

  test('AfterTool at used 92% (GSD active) → envelope with hookEventName AfterTool', () => {
    const { stdout } = runMonitor({ event: 'AfterTool', remaining: 10, used: 92, gsdActive: true });
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.hookSpecificOutput.hookEventName, 'AfterTool');
    assert.match(parsed.hookSpecificOutput.additionalContext, /knowledge checkpoint/);
  });

  test('missing event name (GSD active) at used 92% → PostToolUse fallback envelope (fork Case 3)', () => {
    // FORK: the fork keeps the missing-name → PostToolUse fallback pinned by
    // tests/feat-context-hook.test.cjs Cases 3–5; upstream's silent-unless-Gemini
    // variant was not adopted.
    const { stdout } = runMonitor({ event: undefined, remaining: 10, used: 92, gsdActive: true });
    assert.notStrictEqual(stdout, '', 'missing-name fallback must still emit in a GSD-active project');
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.hookSpecificOutput.hookEventName, 'PostToolUse');
  });

  test('missing event name WITH Gemini env → still the PostToolUse fallback (no Gemini dialect in the fork)', () => {
    const { stdout } = runMonitor({ event: undefined, remaining: 10, used: 92, gsdActive: true, gemini: true });
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.hookSpecificOutput.hookEventName, 'PostToolUse');
  });

  test('explicit PostToolUse WITH Gemini env → explicit name wins', () => {
    const { stdout } = runMonitor({ event: 'PostToolUse', remaining: 10, used: 92, gsdActive: true, gemini: true });
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.hookSpecificOutput.hookEventName, 'PostToolUse');
  });

  // Threshold boundaries on the fork's emit path: used 89 = silent, 90 = warn, 95 = urge.
  test('PostToolUse at used 89% (below warnPct) → empty stdout', () => {
    const { stdout } = runMonitor({ event: 'PostToolUse', remaining: 11, used: 89, gsdActive: true });
    assert.strictEqual(stdout, '', 'no nudge below the used_pct 90 threshold');
  });

  test('PostToolUse at used 90% (warnPct boundary) → warn envelope', () => {
    const { stdout } = runMonitor({ event: 'PostToolUse', remaining: 10, used: 90, gsdActive: true });
    assert.match(JSON.parse(stdout).hookSpecificOutput.additionalContext, /knowledge checkpoint/);
  });

  test('PostToolUse at used 95% (urgePct boundary) → urge envelope', () => {
    const { stdout } = runMonitor({ event: 'PostToolUse', remaining: 5, used: 95, gsdActive: true });
    assert.match(JSON.parse(stdout).hookSpecificOutput.additionalContext, /do it now/);
  });

  test('PostToolUse at used 92% WITHOUT a GSD project → empty stdout (GSD-active gate)', () => {
    const { stdout } = runMonitor({ event: 'PostToolUse', remaining: 10, used: 92 });
    assert.strictEqual(stdout, '', 'the fork hook only nudges inside a GSD-active project');
  });
});

describe('#2289 context-monitor: side effects still fire on silent events (no output ≠ no side effect)', () => {
  test('debounced (silent) PostToolUse still persists the debounce counter', () => {
    // FORK: the calm hook's only cross-call state is the per-session debounce
    // sentinel on the metrics path. The upstream intent — a silenced invocation
    // must still run its bookkeeping — is pinned here on the fork's mechanism:
    // the second call within DEBOUNCE_CALLS emits NOTHING but persists the
    // incremented counter.
    const sessionId = `fix-2289-shared-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const first = runMonitor({ event: 'PostToolUse', remaining: 10, used: 92, gsdActive: true, sessionId, keep: true });
    assert.notStrictEqual(first.stdout, '', 'first crossing fires');
    assert.ok(first.warnData, 'the debounce sentinel is written when the nudge fires');
    assert.strictEqual(first.warnData.lastLevel, 'warn');
    const second = runMonitor({ event: 'PostToolUse', remaining: 10, used: 92, gsdActive: true, sessionId });
    assert.strictEqual(second.stdout, '', 'second call inside the debounce window is silent');
    assert.ok(second.warnData, 'the debounce sentinel must still be updated on the silent call');
    assert.strictEqual(second.warnData.callsSinceWarn, 1, 'counter bookkeeping runs regardless of output');
  });

  test('Stop stays silent and writes NO sentinel (fork: spawn-free calm hook has no Stop-time state)', () => {
    // FORK: inverted from upstream on purpose. Upstream's monitor ran Stop-time
    // debounce/critical-session recording; the fork's hook returns before any
    // state is touched — it is spawn-free (tests/windows-robustness.test.cjs
    // #685 block) and keeps no bookkeeping outside the metrics path.
    const { stdout, warnData } = runMonitor({ event: 'Stop', remaining: 4, used: 96, gsdActive: true });
    assert.strictEqual(stdout, '', 'Stop emits nothing even at high context usage');
    assert.strictEqual(warnData, null, 'no sentinel is written on Stop in the fork hook');
  });
});
