'use strict';

/**
 * ship-certification-sweep-contract.test.cjs — the milestone certification
 * sweep in gsd-core/workflows/ship.md, pinned against hostile UAT fixtures
 * (e2e-9 F6, e2e-10 F6).
 *
 * The sweep WAS open at three seams:
 *   (b) `grep -m1 '^certification: '` over the WHOLE file — a fenced example
 *       `certification:` line above `## Tests` won, so a DECLINED phase was
 *       mis-reported as certified;
 *   (c) `-m1` silently took the first of duplicate lines, never reporting the
 *       second;
 *   (a) an out-of-grammar tier (CERT-9) or a Unicode look-alike (CERT‑2 with
 *       U+2011) matched no table row, and the likely LLM reading was to
 *       pattern-match the `agentic (CERT-…)` prefix onto "certified".
 * And (e2e-10 F6) the table flagged a UAT-less dir as not-run while the prose
 * scoped not-run to UAT-carrying phases.
 *
 * This test EXTRACTS the real bash sweep from the shipped doctrine and runs it
 * against fixtures, pinning the mechanical half of the fix (anchor to
 * `## Tests`, skip fences, FIRST-in-Tests wins, flag DUPLICATE). It also asserts
 * the doctrine carries the classification rows the LLM half depends on
 * (malformed/needs-human fallthrough, and the not-verified vs not-run split).
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { cleanup } = require('./helpers.cjs');

const SHIP_MD = path.join(__dirname, '..', 'gsd-core', 'workflows', 'ship', 'steps', 'certification-sweep.md'); // extracted from ship.md for the byte budget
const shipDoctrine = fs.readFileSync(SHIP_MD, 'utf8');

/**
 * Extract the first ```bash fenced block that follows the certification-sweep
 * heading, de-indented — i.e. the exact command the doctrine tells the operator
 * to run. Pinning the shipped text means the test tracks the doctrine.
 */
function extractSweepScript() {
  const anchor = shipDoctrine.indexOf('Milestone certification sweep');
  assert.notEqual(anchor, -1, 'ship.md must carry the certification-sweep step');
  const after = shipDoctrine.slice(anchor);
  // The fence sits under a numbered-list item, so both the opening ```bash and
  // the closing ``` are indented 3 spaces; match an optionally-indented close.
  const m = after.match(/```bash\r?\n([\s\S]{0,20000}?)\r?\n[ ]*```/);
  assert.ok(m, 'the sweep step must carry a ```bash block');
  // Strip the 3-space list indentation the fenced block sits under.
  return m[1].replace(/^ {3}/gm, '');
}

const SWEEP = extractSweepScript();

/** Run the shipped sweep in a throwaway project dir and return its stdout lines. */
function runSweep(files) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ship-sweep-'));
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(tmp, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
  const out = execFileSync('bash', ['-c', SWEEP], { cwd: tmp, encoding: 'utf8', timeout: 30000 });
  cleanup(tmp);
  return out.split(/\r?\n/).filter(Boolean);
}

// A UAT whose real outcome sits in `## Tests`, but with a fenced example
// `certification:` line ABOVE it (the shape templates/UAT.md ships).
const DECOY_UAT = [
  '# Phase 11 UAT',
  '',
  'Example of the shape to record (do NOT copy this literally):',
  '',
  '```',
  'certification: agentic (CERT-1) — example only, NOT this phase\'s result',
  '```',
  '',
  '## Tests',
  '',
  'certification: skipped (declined — no driver available)',
  '',
  '- [ ] some check',
  '',
].join('\n');

const CERT9_UAT = [
  '# Phase 02 UAT', '', '## Tests', '',
  'certification: agentic (CERT-9) — a tier that does not exist', '',
].join('\n');

// U+2011 non-breaking hyphen in "CERT‑2".
const UNICODE_UAT = [
  '# Phase 04 UAT', '', '## Tests', '',
  'certification: agentic (CERT‑2) — unicode non-breaking hyphen', '',
].join('\n');

const DOUBLE_UAT = [
  '# Phase 05 UAT', '', '## Tests', '',
  'certification: human (CERT-0)', '',
  'certification: N/A — a second, contradictory line', '',
].join('\n');

const CLEAN_UAT = [
  '# Phase 01 UAT', '', '## Tests', '',
  'certification: agentic (CERT-2) — driver proved 3 flows', '',
].join('\n');

// A certification line that only exists OUTSIDE any `## Tests` section.
const ORPHAN_UAT = [
  '# Phase 09 UAT', '', '## Summary', '',
  'certification: agentic (CERT-1) — recorded in the wrong section', '',
].join('\n');

describe('ship.md sweep: anchored to ## Tests, fence-skipping, FIRST/DUPLICATE', () => {
  test('F6(b): a fenced example above ## Tests never wins over the real outcome', () => {
    const lines = runSweep({ '.planning/phases/11-decoy/11-UAT.md': DECOY_UAT });
    const first = lines.filter((l) => l.includes(':FIRST:'));
    assert.equal(first.length, 1, 'exactly one FIRST line');
    assert.match(first[0], /skipped \(declined/, 'the declined outcome in ## Tests wins');
    assert.ok(!lines.some((l) => l.includes('example only')), 'the fenced example is skipped, not extracted');
  });

  test('F6(c): duplicate lines in ## Tests are surfaced, not silently dropped', () => {
    const lines = runSweep({ '.planning/phases/05-double/05-UAT.md': DOUBLE_UAT });
    const first = lines.filter((l) => l.includes(':FIRST:'));
    const dup = lines.filter((l) => l.includes(':DUPLICATE:'));
    assert.equal(first.length, 1, 'first-in-Tests wins');
    assert.match(first[0], /human \(CERT-0\)/, 'the first line is FIRST');
    assert.equal(dup.length, 1, 'the second line is reported as DUPLICATE');
    assert.match(dup[0], /N\/A — a second/, 'the duplicate content is surfaced');
  });

  test('F6(a): CERT-9 and the U+2011 look-alike are extracted verbatim as FIRST (for the malformed row to catch)', () => {
    const lines = runSweep({
      '.planning/phases/02-madeup/02-UAT.md': CERT9_UAT,
      '.planning/phases/04-unicode/04-UAT.md': UNICODE_UAT,
    });
    const first = lines.filter((l) => l.includes(':FIRST:'));
    assert.equal(first.length, 2);
    assert.ok(first.some((l) => l.includes('CERT-9')), 'CERT-9 line is surfaced');
    assert.ok(first.some((l) => l.includes('CERT‑2')), 'the U+2011 look-alike is surfaced byte-distinct');
  });

  test('a certification line outside ## Tests yields no FIRST (fails closed to not-run)', () => {
    const lines = runSweep({ '.planning/phases/09-orphan/09-UAT.md': ORPHAN_UAT });
    assert.equal(lines.filter((l) => l.includes(':FIRST:')).length, 0);
  });

  test('a clean in-Tests outcome is extracted as the single FIRST', () => {
    const lines = runSweep({ '.planning/phases/01-signup/01-UAT.md': CLEAN_UAT });
    const first = lines.filter((l) => l.includes(':FIRST:'));
    assert.equal(first.length, 1);
    assert.match(first[0], /agentic \(CERT-2\)/);
  });
});

describe('ship.md doctrine: the classification rows the LLM half depends on exist', () => {
  test('the extraction is anchored to ## Tests and skips fences', () => {
    assert.match(SWEEP, /in_tests\s*=\s*\(\$0\s*~\s*\/\^##\[\[:space:\]\]\+Tests/, 'awk anchors to a ## Tests heading');
    assert.match(SWEEP, /fence\s*=\s*!fence/, 'awk toggles a fence flag to skip fenced blocks');
    assert.ok(!/grep -H -m1 '\^certification: '/.test(shipDoctrine), 'the old whole-file grep -m1 sweep is gone');
  });

  test('a malformed / needs-human fallthrough row exists (no silent "certified")', () => {
    assert.match(shipDoctrine, /malformed \/ needs-human/);
    assert.match(shipDoctrine, /CERT-9/);
    assert.match(shipDoctrine, /U\+2011/);
    assert.match(shipDoctrine, /:DUPLICATE:/);
  });

  test('not-verified (no UAT) and not-run (UAT present, no line) are distinct rows', () => {
    assert.match(shipDoctrine, /\bnot-verified\b/);
    assert.match(shipDoctrine, /no `\*-UAT\.md` at all/);
    assert.match(shipDoctrine, /has\*\* a `\*-UAT\.md` but no/);
  });
});
