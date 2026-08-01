/**
 * Feature tests: context-monitor hook revived as a calm knowledge-flush nudge.
 *
 * The upstream context-warning hook was disabled in this fork because its
 * panicked tone ("CONTEXT CRITICAL... STOP") derailed agents. This revives the
 * MECHANISM with a calm curation purpose: at high context usage, gently suggest
 * running `/gsd:context flush` (a knowledge checkpoint). These tests are the
 * behavioral contract for that hook, including the TONE contract (case 8).
 *
 * The hook reads metrics from the statusline bridge file
 *   {os.tmpdir()}/claude-ctx-{session_id}.json  (used_pct, remaining_percentage, timestamp)
 * and debounces via
 *   {os.tmpdir()}/claude-ctx-{session_id}-warned.json
 * Both are cleaned up per test, along with a unique temp project dir.
 */

'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { cleanup } = require('./helpers.cjs');

const HOOK = path.join(__dirname, '..', 'hooks', 'gsd-context-monitor.js');
const FORBIDDEN = ['CRITICAL', 'URGENT', 'immediately', 'STOP'];

let sessionCounter = 0;
function uniqueSession() {
  return `test-ctx-${process.pid}-${Date.now()}-${sessionCounter++}`;
}

function metricsPath(sid) {
  return path.join(os.tmpdir(), `claude-ctx-${sid}.json`);
}
function warnedPath(sid) {
  return path.join(os.tmpdir(), `claude-ctx-${sid}-warned.json`);
}

// Write the statusline bridge metrics file for this session.
function writeMetrics(sid, usedPct, { ageSeconds = 0 } = {}) {
  const nowSec = Math.floor(Date.now() / 1000);
  fs.writeFileSync(
    metricsPath(sid),
    JSON.stringify({
      used_pct: usedPct,
      remaining_percentage: 100 - usedPct,
      timestamp: nowSec - ageSeconds,
    })
  );
}

// Create a temp project dir. gsdActive=true drops a .planning/STATE.md so the
// GSD-active gate opens. Optional config object is written to .planning/config.json.
function makeProject({ gsdActive = true, config = null } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-ctxhook-'));
  if (gsdActive) {
    fs.mkdirSync(path.join(dir, '.planning'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.planning', 'STATE.md'), '# STATE\n');
  }
  if (config) {
    fs.mkdirSync(path.join(dir, '.planning'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.planning', 'config.json'), JSON.stringify(config));
  }
  return dir;
}

// Spawn the hook. Always exits 0; returns the raw stdout string.
function runHook({ sid, cwd, event }) {
  const payload = { session_id: sid, cwd };
  if (event) payload.hook_event_name = event;
  return execFileSync(process.execPath, [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
}

// Parse the hook's stdout into { hookEventName, additionalContext } or null when empty.
function parse(stdout) {
  const trimmed = (stdout || '').trim();
  if (!trimmed) return null;
  const data = JSON.parse(trimmed);
  return data.hookSpecificOutput;
}

function purge(sid, dir) {
  for (const p of [metricsPath(sid), warnedPath(sid)]) {
    // eslint-disable-next-line local/no-raw-rmsync-in-tests -- single bridge file in os.tmpdir(), not a project dir; cleanup() is dir-scoped
    try { fs.rmSync(p, { force: true }); } catch { /* ignore */ }
  }
  if (dir) cleanup(dir);
}

describe('feat: context-monitor calm knowledge-flush hook', () => {
  // Case 1: no metrics file → empty stdout (subagent / fresh session, exit 0).
  test('no metrics file → empty stdout', () => {
    const sid = uniqueSession();
    const dir = makeProject();
    try {
      const out = runHook({ sid, cwd: dir });
      assert.equal(parse(out), null, 'expected no output when metrics file is absent');
    } finally {
      purge(sid, dir);
    }
  });

  // Case 2: used_pct below threshold → empty stdout.
  test('used_pct 50 (below warn threshold) → empty stdout', () => {
    const sid = uniqueSession();
    const dir = makeProject();
    try {
      writeMetrics(sid, 50);
      const out = runHook({ sid, cwd: dir });
      assert.equal(parse(out), null, 'expected no output below threshold');
    } finally {
      purge(sid, dir);
    }
  });

  // Case 3: used_pct 91 + .planning/STATE.md present → flush suggestion.
  test('used_pct 91 with GSD active → suggests /gsd:context flush + MASTER-CONTEXT.md', () => {
    const sid = uniqueSession();
    const dir = makeProject();
    try {
      writeMetrics(sid, 91);
      const out = parse(runHook({ sid, cwd: dir }));
      assert.ok(out, 'expected a warn message at 91%');
      assert.match(out.additionalContext, /\/gsd:context flush/);
      assert.match(out.additionalContext, /MASTER-CONTEXT\.md/);
      assert.equal(out.hookEventName, 'PostToolUse');
    } finally {
      purge(sid, dir);
    }
  });

  // Case 4: used_pct 91 but NO .planning in cwd → empty (non-GSD projects get nothing).
  test('used_pct 91 with no .planning → empty stdout', () => {
    const sid = uniqueSession();
    const dir = makeProject({ gsdActive: false });
    try {
      writeMetrics(sid, 91);
      const out = runHook({ sid, cwd: dir });
      assert.equal(parse(out), null, 'non-GSD projects must get nothing');
    } finally {
      purge(sid, dir);
    }
  });

  // Case 5: debounce (second 91 is silent) + escalation bypass (96 fires despite debounce).
  test('debounce suppresses repeat warn; escalation to urge bypasses debounce', () => {
    const sid = uniqueSession();
    const dir = makeProject();
    try {
      writeMetrics(sid, 91);
      const first = parse(runHook({ sid, cwd: dir }));
      assert.ok(first, 'first 91% call should fire');

      writeMetrics(sid, 91);
      const second = runHook({ sid, cwd: dir });
      assert.equal(parse(second), null, 'second 91% call should be debounced');

      writeMetrics(sid, 96);
      const escalated = parse(runHook({ sid, cwd: dir }));
      assert.ok(escalated, 'escalation to 96% should fire despite debounce');
      assert.match(escalated.additionalContext, /\/gsd:context flush/);
    } finally {
      purge(sid, dir);
    }
  });

  // Case 6: PreCompact fires regardless of thresholds (no metrics needed).
  test('PreCompact with GSD active → re-anchor + context verify message', () => {
    const sid = uniqueSession();
    const dir = makeProject();
    try {
      const out = parse(runHook({ sid, cwd: dir, event: 'PreCompact' }));
      assert.ok(out, 'PreCompact should always emit when GSD-active');
      assert.match(out.additionalContext, /re-anchor/);
      assert.match(out.additionalContext, /context verify/);
      assert.equal(out.hookEventName, 'PreCompact');
    } finally {
      purge(sid, dir);
    }
  });

  // Case 7: hook_enabled=false in config → silent even at 96%.
  test('config context_lifecycle.hook_enabled=false → empty stdout at 96%', () => {
    const sid = uniqueSession();
    const dir = makeProject({ config: { 'context_lifecycle.hook_enabled': false } });
    try {
      writeMetrics(sid, 96);
      const out = runHook({ sid, cwd: dir });
      assert.equal(parse(out), null, 'disabled hook must emit nothing');
      // And PreCompact must also stay silent when disabled.
      const pre = runHook({ sid, cwd: dir, event: 'PreCompact' });
      assert.equal(parse(pre), null, 'disabled hook must stay silent on PreCompact too');
    } finally {
      purge(sid, dir);
    }
  });

  // Case 7b: master switch context_lifecycle.enabled=false → silent even at 96%
  // (master switch overrides hook_enabled's default-on).
  test('config context_lifecycle.enabled=false → empty stdout at 96%', () => {
    const sid = uniqueSession();
    const dir = makeProject({ config: { 'context_lifecycle.enabled': false } });
    try {
      writeMetrics(sid, 96);
      const out = runHook({ sid, cwd: dir });
      assert.equal(parse(out), null, 'master switch off must emit nothing');
      const pre = runHook({ sid, cwd: dir, event: 'PreCompact' });
      assert.equal(parse(pre), null, 'master switch off must stay silent on PreCompact too');
    } finally {
      purge(sid, dir);
    }
  });

  // Case 8: TONE LINT — every emitted message (warn, urge, PreCompact) is calm.
  test('tone contract: no CRITICAL/URGENT/immediately/STOP in any emitted message', () => {
    const messages = [];

    // warn message
    let sid = uniqueSession();
    let dir = makeProject();
    try {
      writeMetrics(sid, 91);
      const warn = parse(runHook({ sid, cwd: dir }));
      assert.ok(warn);
      messages.push(warn.additionalContext);
    } finally { purge(sid, dir); }

    // urge message (escalate within one session)
    sid = uniqueSession();
    dir = makeProject();
    try {
      writeMetrics(sid, 96);
      const urge = parse(runHook({ sid, cwd: dir }));
      assert.ok(urge);
      messages.push(urge.additionalContext);
    } finally { purge(sid, dir); }

    // PreCompact message
    sid = uniqueSession();
    dir = makeProject();
    try {
      const pre = parse(runHook({ sid, cwd: dir, event: 'PreCompact' }));
      assert.ok(pre);
      messages.push(pre.additionalContext);
    } finally { purge(sid, dir); }

    for (const msg of messages) {
      for (const banned of FORBIDDEN) {
        assert.ok(
          !msg.includes(banned),
          `emitted message must not contain "${banned}": ${msg}`
        );
      }
    }
  });
});
