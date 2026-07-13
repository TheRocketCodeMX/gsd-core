// allow-test-rule: source-text-is-the-product — see TheRocketCodeMX/gsd-core#1
// Reads .md product files whose deployed text IS what the runtime loads.

/**
 * GSD Tools Tests — project.* query verbs (PROJECT.md Mode / Strategy Plan / skip-ledger).
 *
 * These pin the structured reads that replaced the fragile inline `sed`/`grep` in the
 * strategy workflows. The headline regression grep COULD NOT express:
 *   a FILLED Mode value vs the unfilled template enum placeholder
 *   (`[greenfield | brownfield-extend | rewrite/refactor]`). `is_placeholder` does.
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runGsdTools, createTempProject, cleanup } = require('./helpers.cjs');

function writeProject(tmpDir, body) {
  fs.writeFileSync(path.join(tmpDir, '.planning', 'PROJECT.md'), body);
}

const FILLED = `# Test

## Mode
- **Origin:** brownfield-extend
- **Design input:** a provided design to ingest, at \`/designs/app.fig\`
- **Code-quality baseline:** vibe-coded-to-harden
- **Combination:** brownfield-extend + new-design + vibe-coded

## Strategy Plan
**Archetype:** backend service · real domain · public+PII

**Recommended path:** model-domain → recommend-architecture → security-strategy

| Step | Status |
|---|---|
| model-domain | done |
| recommend-architecture | recommended |
| security-strategy | recommended |

### Skip-ledger
- testing-strategy — skipped (prototype, will add later, 2026-06-23)

## Requirements
`;

// The unfilled template Mode/Strategy Plan (the source of the grep false-positive).
const PLACEHOLDER = `# Test

## Mode
- **Origin:** [greenfield | brownfield-extend | rewrite/refactor]
- **Design input:** [none | a provided design to ingest, at \`<path-or-link>\` | an existing design system to honor]
- **Code-quality baseline:** [clean | legacy-debt | vibe-coded-to-harden]
- **Combination:** [the named combination]

## Strategy Plan
**Archetype:** [e.g. backend service]

| Step | Status |
|---|---|
| [model-domain] | [recommended] |

### Skip-ledger
- (none yet)

## Requirements
`;

describe('project mode', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = createTempProject(); });
  afterEach(() => { cleanup(tmpDir); });

  test('parses a filled Mode block', () => {
    writeProject(tmpDir, FILLED);
    const r = runGsdTools('project mode', tmpDir);
    assert.ok(r.success, `failed: ${r.error}`);
    const o = JSON.parse(r.output);
    assert.strictEqual(o.found, true);
    assert.strictEqual(o.origin, 'brownfield-extend');
    assert.strictEqual(o.code_quality, 'vibe-coded-to-harden');
    assert.strictEqual(o.is_placeholder, false, 'filled value is not a placeholder');
    assert.strictEqual(o.has_provided_design, true, 'a provided design is detected');
  });

  test('THE REGRESSION: the unfilled placeholder is reported as a placeholder, not a real value', () => {
    writeProject(tmpDir, PLACEHOLDER);
    const r = runGsdTools('project mode', tmpDir);
    assert.ok(r.success, `failed: ${r.error}`);
    const o = JSON.parse(r.output);
    assert.strictEqual(o.is_placeholder, true, 'bracket enum placeholder must be detected');
    assert.strictEqual(o.has_provided_design, false,
      'an unfilled placeholder must NOT be read as a provided design (the grep false-positive)');
  });

  test('design input "none" is not a provided design', () => {
    writeProject(tmpDir, FILLED.replace(/- \*\*Design input:\*\* .*/, '- **Design input:** none'));
    const r = runGsdTools('project mode', tmpDir);
    const o = JSON.parse(r.output);
    assert.strictEqual(o.has_provided_design, false);
    assert.strictEqual(o.is_placeholder, false);
  });

  test('missing PROJECT.md returns found:false, not an error', () => {
    const r = runGsdTools('project mode', tmpDir);
    assert.ok(r.success, `failed: ${r.error}`);
    const o = JSON.parse(r.output);
    assert.strictEqual(o.found, false);
    assert.strictEqual(o.has_provided_design, false);
  });

  test('a field-like line under a nested ### subheading does not leak into Mode', () => {
    writeProject(tmpDir, `# T\n\n## Mode\n- **Origin:** greenfield\n\n### Notes\n- **Design input:** /should/not/leak.fig\n\n## Requirements\n`);
    const o = JSON.parse(runGsdTools('project mode', tmpDir).output);
    assert.strictEqual(o.origin, 'greenfield');
    assert.strictEqual(o.design_input, null, 'a Design-input under a ### subsection must not be read as the Mode field');
    assert.strictEqual(o.has_provided_design, false);
  });
});

describe('project strategy-plan', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = createTempProject(); });
  afterEach(() => { cleanup(tmpDir); });

  test('parses steps + next_recommended, skipping the done step', () => {
    writeProject(tmpDir, FILLED);
    const r = runGsdTools('project strategy-plan', tmpDir);
    assert.ok(r.success, `failed: ${r.error}`);
    const o = JSON.parse(r.output);
    assert.strictEqual(o.found, true);
    assert.strictEqual(o.steps.length, 3);
    assert.strictEqual(o.next_recommended, 'recommend-architecture',
      'first recommended step (model-domain is done) is the on-ramp');
  });

  test('an off-spec 3-column table row still parses status from the 2nd cell', () => {
    writeProject(tmpDir, `# T\n\n## Strategy Plan\n\n| Step | Status | Note |\n|---|---|---|\n| model-domain | recommended | extra col |\n\n## Requirements\n`);
    const o = JSON.parse(runGsdTools('project strategy-plan', tmpDir).output);
    assert.strictEqual(o.steps[0].status, 'recommended', 'status must be the 2nd cell, not "recommended | extra col"');
    assert.strictEqual(o.next_recommended, 'model-domain');
  });

  test('placeholder table rows are filtered out', () => {
    writeProject(tmpDir, PLACEHOLDER);
    const r = runGsdTools('project strategy-plan', tmpDir);
    const o = JSON.parse(r.output);
    assert.strictEqual(o.steps.length, 0, 'bracketed placeholder rows are not real steps');
    assert.strictEqual(o.next_recommended, null);
  });
});

describe('--raw contracts (the exact strings workflows compare against in shell)', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = createTempProject(); });
  afterEach(() => { cleanup(tmpDir); });

  test('strategy-plan --raw emits the first recommended step name (new-project/new-milestone on-ramp)', () => {
    writeProject(tmpDir, FILLED); // model-domain done, recommend-architecture recommended
    const r = runGsdTools('project strategy-plan --raw', tmpDir);
    assert.ok(r.success, `failed: ${r.error}`);
    assert.strictEqual(r.output.trim(), 'recommend-architecture');
  });

  test('strategy-plan --raw is empty when no step is recommended (→ build loop)', () => {
    writeProject(tmpDir, FILLED.replace('| recommend-architecture | recommended |', '| recommend-architecture | done |')
                               .replace('| security-strategy | recommended |', '| security-strategy | done |'));
    const r = runGsdTools('project strategy-plan --raw', tmpDir);
    assert.strictEqual(r.output.trim(), '');
  });

  test('strategy-skipped --raw emits exactly "true" / "false" (cicd skip-gate)', () => {
    writeProject(tmpDir, FILLED);
    assert.strictEqual(runGsdTools('project strategy-skipped testing-strategy --raw', tmpDir).output.trim(), 'true');
    assert.strictEqual(runGsdTools('project strategy-skipped security-strategy --raw', tmpDir).output.trim(), 'false');
  });

  test('strategy-skipped uses EXACT skill match, not substring', () => {
    writeProject(tmpDir, FILLED.replace('testing-strategy — skipped', 'testing-strategy-advanced — skipped'));
    // querying the base name must NOT match the longer ledgered name
    assert.strictEqual(runGsdTools('project strategy-skipped testing-strategy --raw', tmpDir).output.trim(), 'false');
    assert.strictEqual(runGsdTools('project strategy-skipped testing-strategy-advanced --raw', tmpDir).output.trim(), 'true');
  });
});

describe('project strategy-skipped', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = createTempProject(); });
  afterEach(() => { cleanup(tmpDir); });

  test('a ledgered skip is reported with reason + date', () => {
    writeProject(tmpDir, FILLED);
    const r = runGsdTools('project strategy-skipped testing-strategy', tmpDir);
    assert.ok(r.success, `failed: ${r.error}`);
    const o = JSON.parse(r.output);
    assert.strictEqual(o.skipped, true);
    assert.strictEqual(o.reason, 'prototype, will add later');
    assert.strictEqual(o.date, '2026-06-23');
  });

  test('a non-skipped skill reports skipped:false', () => {
    writeProject(tmpDir, FILLED);
    const r = runGsdTools('project strategy-skipped security-strategy', tmpDir);
    const o = JSON.parse(r.output);
    assert.strictEqual(o.skipped, false);
  });

  test('"(none yet)" ledger reports skipped:false', () => {
    writeProject(tmpDir, PLACEHOLDER);
    const r = runGsdTools('project strategy-skipped testing-strategy', tmpDir);
    const o = JSON.parse(r.output);
    assert.strictEqual(o.skipped, false);
  });
});
