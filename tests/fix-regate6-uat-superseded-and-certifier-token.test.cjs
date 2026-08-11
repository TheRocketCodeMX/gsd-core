/**
 * Re-gate 6 N2 + re-gate 5 N3 — the superseded-UAT archive and the certifier token.
 *
 * Restart/re-certify archives a UAT file to `{phase}-UAT-superseded-{date}.md`
 * (archive-never-clobber). The ship sweep and `check_active_session` glob
 * `*-UAT.md` and are immune, but every bin-side scan used the looser
 * `includes('-UAT')`, so the archive was resurrected:
 *
 * 1. `audit-uat` reported the archive's items as phantom outstanding UAT work —
 *    the command whose job is to chase outstanding items chased a file created
 *    specifically to be inert.
 * 2. `parseUatItems`' result token was `\[?(\w+)\]?` — `\w` stops at `-`, so
 *    `result: [pending-certifier]` (the handover contract's "the certifier's to
 *    answer, never presented to the human") parsed as plain `pending` and the
 *    human was chased for the certifier's checkpoints.
 * 3. The `uat-passed` predicate and the init `uat_blockers` scan shared the
 *    same loose filter.
 *
 * Plus re-gate 5 N3: `gates.confirm_milestone_scope` is documented default
 * `true` (docs/CONFIGURATION.md) and consumed by `complete-milestone.md`, but
 * `config-get` answered "Key not found" when it was absent.
 */

'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { runGsdTools, createTempProject, cleanup } = require('./helpers.cjs');

const LIVE_UAT = [
  '---',
  'status: partial',
  'phase: 03-sharing',
  '---',
  '',
  '## Current Test',
  '',
  '[awaiting human testing]',
  '',
  '## Tests',
  '',
  'certification: pending (CERT-2 — brief handed over 2026-08-10)',
  '',
  '### 1. Cold start smoke',
  'expected: server boots and serves',
  'result: [pending-certifier]',
  '',
  '### 2. Judgment checkpoint',
  'expected: error wording is clear',
  'result: [pending]',
  '',
].join('\n');

const SUPERSEDED_UAT = [
  '---',
  'status: partial',
  'phase: 03-sharing',
  '---',
  '',
  '## Tests',
  '',
  '### 1. Old archived checkpoint one',
  'expected: anything',
  'result: [pending]',
  '',
  '### 2. Old archived checkpoint two',
  'expected: anything',
  'result: [pending]',
  '',
].join('\n');

describe('re-gate 6 N2 — superseded archives are inert, pending-certifier is its own state', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '03-sharing');
    fs.mkdirSync(phaseDir, { recursive: true });
    fs.writeFileSync(path.join(phaseDir, '03-UAT.md'), LIVE_UAT);
    fs.writeFileSync(
      path.join(phaseDir, '03-UAT-superseded-2026-08-11.md'),
      SUPERSEDED_UAT
    );
  });

  afterEach(() => cleanup(tmpDir));

  test('audit-uat never surfaces items from a -UAT-superseded- archive', () => {
    const result = runGsdTools(['query', 'audit-uat'], tmpDir);
    assert.ok(result.success, `audit-uat failed: ${result.error}`);
    const payload = JSON.parse(result.output);
    const files = JSON.stringify(payload);
    assert.ok(
      !files.includes('superseded'),
      `audit-uat resurrected the superseded archive: ${files}`
    );
  });

  test('audit-uat does not report [pending-certifier] as plain pending', () => {
    const result = runGsdTools(['query', 'audit-uat'], tmpDir);
    assert.ok(result.success, `audit-uat failed: ${result.error}`);
    const payload = JSON.parse(result.output);
    // The live file has exactly one human-pending item (test 2). Test 1 is the
    // certifier's — reporting it as pending chases the human for it.
    const items = JSON.stringify(payload);
    assert.ok(
      !/certifier/.test(items) || !/"pending"/.test(items) ||
        (items.match(/"pending"/g) || []).length <= 1,
      `pending-certifier flattened to pending: ${items}`
    );
    const flat = JSON.stringify(payload);
    assert.ok(
      !flat.includes('"test":1') || !flat.includes('Cold start'),
      `the certifier's checkpoint surfaced to the human: ${flat}`
    );
  });

  test('uat-passed predicate ignores superseded archives', () => {
    // Make the LIVE file fully passed; the archive still has pendings. The
    // predicate must judge only the live file.
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '03-sharing');
    const passed = LIVE_UAT
      .replace('result: [pending-certifier]', 'result: pass')
      .replace('result: [pending]', 'result: pass')
      .replace('status: partial', 'status: complete')
      .replace(
        'certification: pending (CERT-2 — brief handed over 2026-08-10)',
        'certification: agentic (CERT-2) — 2 checkpoints certified, 0 escalated'
      );
    fs.writeFileSync(path.join(phaseDir, '03-UAT.md'), passed);
    const result = runGsdTools(['phase', 'uat-passed', '3'], tmpDir);
    assert.ok(result.success, `uat-passed failed: ${result.error}`);
    const payload = JSON.parse(result.output);
    assert.equal(
      payload.uat_passed ?? payload.passed,
      true,
      `superseded archive dragged uat-passed to false: ${result.output}`
    );
  });
});

describe('re-gate 5 N3 — gates.confirm_milestone_scope has its documented default', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = createTempProject(); });
  afterEach(() => cleanup(tmpDir));

  test('config-get resolves true when the key is absent', () => {
    const result = runGsdTools(
      ['config-get', 'gates.confirm_milestone_scope', '--raw'],
      tmpDir
    );
    assert.ok(result.success, `config-get failed: ${result.error}`);
    assert.equal(result.output.trim(), 'true');
  });
});
