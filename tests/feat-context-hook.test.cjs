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
const { runNode, assertSeamExit } = require('./helpers/process-seam.cjs');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { cleanup } = require('./helpers.cjs');
const { PROBE_TIMEOUT_MS } = require('./helpers/timeouts.cjs');

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

// Spawn the hook. Always exits 0; returns the raw stdout string. `env` sets scope variables
// (GSD_PROJECT / GSD_WORKSTREAM); without it both are cleared so the caller's shell cannot leak in.
function runHook({ sid, cwd, event, extra, env }) {
  const payload = { session_id: sid, cwd, ...(extra || {}) };
  if (event) payload.hook_event_name = event;
  const childEnv = { ...process.env };
  delete childEnv.GSD_PROJECT; delete childEnv.GSD_WORKSTREAM;
  const r = runNode([HOOK], { input: JSON.stringify(payload), timeoutMs: PROBE_TIMEOUT_MS, env: { ...childEnv, ...(env || {}) } });
  assertSeamExit(assert, r);
  return r.stdout;
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

  // Case 9 (upstream #6360, ported align-1.23.0): a subagent's hook input carries the
  // PARENT's session_id plus agent_id. The calm nudge is main-session-only, so a
  // subagent input is silent on every event and never reads or spends the parent's
  // debounce file; agent_type alone (a top-level `claude --agent` session) and a
  // non-string or empty agent_id are still monitored.
  test('#6360: subagent input (agent_id) is silent on every event and leaves the parent debounce alone', () => {
    const sid = uniqueSession();
    const dir = makeProject();
    try {
      writeMetrics(sid, 96);
      for (const event of [undefined, 'PostToolUse', 'AfterTool', 'PreCompact', 'Stop', 'SubagentStop']) {
        const out = runHook({ sid, cwd: dir, event, extra: { agent_id: 'agent-abc123', agent_type: 'gsd-executor' } });
        assert.equal(parse(out), null, `subagent input must stay silent on ${event || 'no event'}`);
      }
      assert.equal(fs.existsSync(warnedPath(sid)), false, 'a subagent must not write the parent session debounce file');
      // Each control below runs on its own fresh session so its first nudge is never debounced.
      for (const extra of [...['', null, 0, 123, true, [], {}].map((agent_id) => ({ agent_id })), { agent_type: 'gsd-executor' }]) {
        const csid = uniqueSession();
        try {
          writeMetrics(csid, 96);
          const out = parse(runHook({ sid: csid, cwd: dir, extra }));
          assert.ok(out, `${JSON.stringify(extra)} is not a subagent input: the nudge still fires`);
        } finally {
          purge(csid);
        }
      }
      const pre = parse(runHook({ sid, cwd: dir, event: 'PreCompact', extra: { agent_type: 'gsd-executor' } }));
      assert.ok(pre, 'a top-level --agent session still gets the PreCompact reminder');
    } finally {
      purge(sid, dir);
    }
  });

  // Case 10 (matrix1230-A K1): the thresholds come from the active scope's config, as config-get
  // reports them — a workstream (GSD_WORKSTREAM or the pointer) or a named project (GSD_PROJECT)
  // overrides the root. Root warns at 85, ws1 and beta at 70; usage 75 %.
  test('K1: a workstream or named project hook_warn_pct overrides the root one', () => {
    const dir = makeProject({ config: { context_lifecycle: { hook_warn_pct: 85 } } });
    try {
      for (const scope of [path.join('workstreams', 'ws1'), 'beta']) {
        fs.mkdirSync(path.join(dir, '.planning', scope), { recursive: true });
        fs.writeFileSync(path.join(dir, '.planning', scope, 'STATE.md'), '# STATE\n');
        fs.writeFileSync(path.join(dir, '.planning', scope, 'config.json'), JSON.stringify({ context_lifecycle: { hook_warn_pct: 70 } }));
      }
      const at75 = (env) => {
        const sid = uniqueSession();
        try { writeMetrics(sid, 75); return parse(runHook({ sid, cwd: dir, env })); } finally { purge(sid); }
      };
      assert.equal(at75(), null, 'root: 75 % is under its 85 %');
      assert.ok(at75({ GSD_WORKSTREAM: 'ws1' }), 'GSD_WORKSTREAM=ws1: 75 % is over its 70 %');
      assert.ok(at75({ GSD_PROJECT: 'beta' }), 'GSD_PROJECT=beta: 75 % is over its 70 %');
      fs.writeFileSync(path.join(dir, '.planning', 'active-workstream'), 'ws1\n');
      assert.ok(at75(), 'the workstream pointer selects ws1 too');
      // A workstream config without the key inherits the root's (config-get's ladder).
      fs.writeFileSync(path.join(dir, '.planning', 'workstreams', 'ws1', 'config.json'), '{}');
      assert.equal(at75({ GSD_WORKSTREAM: 'ws1' }), null, 'ws1 without the key inherits the root 85 %');
    } finally {
      cleanup(dir);
    }
  });

  // Case 11 (matrix1230-A K7): a repo whose only projects are named (or workstreams) has no root
  // STATE.md; it is still a GSD project, so the PreCompact reminder and the nudges fire.
  test('K7: a repo with only named projects or only workstreams is GSD-active', () => {
    for (const scope of ['beta', path.join('workstreams', 'ws1')]) {
      const sid = uniqueSession();
      const dir = makeProject({ gsdActive: false });
      try {
        fs.mkdirSync(path.join(dir, '.planning', scope), { recursive: true });
        fs.writeFileSync(path.join(dir, '.planning', scope, 'STATE.md'), '# STATE\n');
        assert.ok(parse(runHook({ sid, cwd: dir, event: 'PreCompact' })), `${scope}: PreCompact reminder`);
        writeMetrics(sid, 96);
        assert.ok(parse(runHook({ sid, cwd: dir })), `${scope}: the 96 % nudge`);
      } finally {
        purge(sid, dir);
      }
    }
    const sid = uniqueSession();
    const dir = makeProject({ gsdActive: false });
    try {
      fs.mkdirSync(path.join(dir, '.planning', 'codebase'), { recursive: true });
      assert.equal(parse(runHook({ sid, cwd: dir, event: 'PreCompact' })), null, 'no STATE.md anywhere: still silent');
    } finally {
      purge(sid, dir);
    }
  });
});
