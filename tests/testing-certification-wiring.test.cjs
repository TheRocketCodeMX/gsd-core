/**
 * Wiring-level pins for the certification loop — re-gate round 2.
 *
 * Re-gate 6 proved a structural blind spot in the original contract suite:
 * all 244 pins asserted prose PRESENCE inside the step file, and every one
 * passed while the feature was unreachable — `verify-work.md` dispatched
 * `agentic-certification.md` on the new-session path only, so §1.5's whole
 * re-entry table (pending-result consumption, re-run idempotency, the
 * off→required re-offer) was correct prose nothing executed.
 *
 * These pins assert the CALLERS, and the seams the re-gates broke:
 *  - resume consults §1.5 BEFORE the pending scan (ordering, not presence);
 *  - the start-new reply has an exists-check and routes through the full
 *    extraction chain, never straight to `create_uat_file`;
 *  - `create_uat_file` never overwrites;
 *  - the RESULT file is in the commit pathspecs (4 prescriptions had 0);
 *  - the closed outcome grammar is consistent across step, template, sweep;
 *  - the absent-substrate fallback exists (upgrade→verify-work ordering);
 *  - the sandbox-HOME receipts are attributed to the right CLIs;
 *  - both add-section paths state where a created section lands;
 *  - Step 8 commits TESTING-STANDARDS.md when the run created it;
 *  - the cicd consumer restates the C1-b certification carve-out on all
 *    three of its surfaces, and names the wall-clock unit + legacy rule.
 */

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const VERIFY = 'gsd-core/workflows/verify-work.md';
const STEP = 'gsd-core/workflows/verify-work/steps/agentic-certification.md';
const UAT_TPL = 'gsd-core/templates/UAT.md';
const STRATEGY = 'gsd-core/workflows/testing-strategy.md';
const CICD_WF = 'gsd-core/workflows/cicd-strategy.md';
const CICD_REF = 'gsd-core/references/cicd-strategy.md';
const CICD_TPL = 'gsd-core/templates/cicd-strategy.md';

function stepBody(content, marker) {
  const start = content.indexOf(marker);
  assert.ok(start !== -1, `step marker not found: ${marker}`);
  const end = content.indexOf('</step>', start);
  return content.slice(start, end === -1 ? undefined : end);
}

describe('re-entry wiring — the callers read §1.5, not just the step file containing it', () => {
  test('resume_from_file consults the certification re-entry BEFORE the pending scan', () => {
    const body = stepBody(read(VERIFY), '<step name="resume_from_file">');
    const reentry = body.indexOf('agentic-certification.md');
    const scan = body.indexOf('Find first test with `result: [pending]`');
    assert.ok(reentry !== -1, 'resume never reads the certification step — §1.5 is unreachable prose (re-gate 6 F3/F7/F9)');
    assert.ok(scan !== -1, 'pending scan missing from resume');
    assert.ok(reentry < scan, 'the re-entry consult must run BEFORE the pending scan — after it, a consumed result cannot revert checkpoints');
    assert.match(body, /§1\.5|1\.5/, 'the consult names the re-entry table');
    assert.match(body, /CERTIFICATION-RESULT\.md/, 'the consult triggers on a returned result file, not only on an outcome line');
  });

  test('the start-new reply exists-checks and routes through the extraction chain', () => {
    const body = stepBody(read(VERIFY), '<step name="check_active_session">');
    assert.doesNotMatch(body, /phase number → Treat as new session, go to `create_uat_file`/,
      'the start-new reply must not jump straight to create_uat_file (re-gate 6 N1: silent clobber, no checkpoint set, no certification)');
    assert.match(body, /exists-check/i, 'the start-new reply checks for an existing UAT file first');
    assert.match(body, /`find_summaries` → `extract_tests` → the certification dispatch → `create_uat_file`/,
      'a genuinely new session runs the full chain, certification dispatch included');
  });

  test('create_uat_file never overwrites an existing UAT file', () => {
    const body = stepBody(read(VERIFY), '<step name="create_uat_file">');
    assert.match(body, /never overwrites/i, 'the last-line-of-defense exists-check (re-gate 6 N1)');
    assert.match(body, /already exists.*resume_from_file|resume_from_file.*already exists/s,
      'an existing file routes to resume, not to a rewrite');
  });

  test('the RESULT file is committed where the brief and evidence are', () => {
    const v = read(VERIFY);
    assert.match(v, /--files[^\n]*CERTIFICATION-RESULT\.md/,
      're-gate 4 N1: 4 prescriptions, 0 commit pathspecs — the certifier’s return artifact was never committed');
  });
});

describe('closed outcome grammar — one spelling across step, template, sweep', () => {
  test('the template’s CERT-0 form matches the step’s closed set (bare)', () => {
    const tpl = read(UAT_TPL);
    assert.doesNotMatch(tpl, /certification: human \(CERT-0\) —/,
      're-gate 6 N3: the template documented and demonstrated a suffix the closed set does not sanction');
    assert.match(tpl, /`certification: human \(CERT-0\)`/, 'the bare form is in the documented closed set');
  });
});

describe('legacy orderings — verify-work before any strategy re-run', () => {
  test('the absent-substrate fallback exists beside the absent-Certification one', () => {
    const s = read(STEP);
    assert.match(s, /No `## Certification substrate` section/,
      're-gate 5 F4: only ## Certification had a missing-section rule; the substrate forced invention');
    assert.match(s, /N\/A — revisit when a surface appears/, 'the four policies degrade to recorded N/A');
    assert.match(s, /labelled as inferred|labelled as such|never invented silently/i,
      'inferred preconditions are labelled, never silent');
  });

  test('the sandbox-HOME receipts name their CLIs truthfully', () => {
    const s = read(STEP);
    assert.doesNotMatch(s, /the same CLI wrote 0 files/,
      're-gate 4 N2: the 0-files receipt is codex-cli’s, not the tool discussed two paragraphs above');
    assert.match(s, /codex-cli/, 'the refusing CLI is named');
    assert.match(s, /332/, 'the opposite receipt (onorca writing everything under /tmp) is kept — both argue the sibling-sandbox rule');
  });

  test('both add-section paths state where a created section lands', () => {
    for (const f of [STRATEGY, VERIFY]) {
      assert.match(read(f), /before[\s*]*\n?[\s*]*any trailing footer/,
        `${f}: a literal append landed sections after the file footer (re-gate 5 N2)`);
    }
  });

  test('Step 8 commits TESTING-STANDARDS.md when the run created it', () => {
    const s = read(STRATEGY);
    assert.match(s, /TSTD=\$\(\[ -f \.planning\/TESTING-STANDARDS\.md \]/,
      're-gate 5 N1: the F2b fix created the file and the commit left it untracked');
    assert.match(s, /--files \.planning\/TEST-STRATEGY\.md \.planning\/PROJECT\.md \$DLOG \$TSTD/,
      'the pathspec list carries it');
  });
});

describe('cicd consumer-side carve-out and units', () => {
  test('all three cicd surfaces restate the certification carve-out', () => {
    assert.match(read(CICD_REF), /Not a pipeline tier[^|]*never[^|]*C1-b|never[^|]*C1-b[^|]*Not a pipeline tier/s,
      'reference C1 row: the trigger cell must carry the carve-out (re-gate 7 N1)');
    assert.match(read(CICD_TPL), /Not a pipeline\s*\n?\s*tier[^>]*never a row here/s,
      'template comment: certification is never a row');
    const meta = read(CICD_WF);
    assert.match(meta, /second pipeline stage[^\n]*never (TEST-STRATEGY's )?a? ?"Not a pipeline tier"/,
      'Step 8 meta-tell row carries the carve-out');
  });

  test('the MEASURE bullet names the unit and the legacy ×1000 rule', () => {
    const w = read(CICD_WF);
    assert.match(w, /integer (milliseconds|ms)/, 're-gate 7 N2: the column unit is named');
    assert.match(w, /(multiply by 1000|×1000|x1000)/, 'the legacy seconds rule is named where the number is read');
  });
});
