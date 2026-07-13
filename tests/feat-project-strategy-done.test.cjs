// allow-test-rule: source-text-is-the-product — see TheRocketCodeMX/gsd-core#21
// The workflow-contract block reads gsd-core/workflows/*.md whose deployed text
// IS what the runtime loads; the grep-contract is the product guarantee.

/**
 * GSD Tools Tests — `project strategy-done <step>` (issue #21, P0-1).
 *
 * The Strategy Plan lifecycle was safety-inverting: statuses were only ever
 * written as `recommended`, nothing ever flipped a step to `done`, so
 * `query grounding required` returned [] and the grounding gate vacuously
 * passed. This pins the deterministic WRITE verb that closes the loop, and
 * the workflow contract that every strategy skill actually calls it.
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runGsdTools, createTempProject, cleanup } = require('./helpers.cjs');

const ROOT = path.join(__dirname, '..');
const WORKFLOWS_DIR = path.join(ROOT, 'gsd-core', 'workflows');

function writeProject(tmpDir, body) {
  fs.writeFileSync(path.join(tmpDir, '.planning', 'PROJECT.md'), body);
}

function readProject(tmpDir) {
  return fs.readFileSync(path.join(tmpDir, '.planning', 'PROJECT.md'), 'utf-8');
}

const PLAN = `# Test

## Strategy Plan
**Archetype:** backend service

| Step | Status |
|---|---|
| model-domain | recommended |
| recommend-architecture | recommended |
| security-strategy | done |

### Skip-ledger
- testing-strategy — skipped (prototype, 2026-06-23)

## Requirements
untouched body text
`;

describe('project strategy-done', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = createTempProject(); });
  afterEach(() => { cleanup(tmpDir); });

  test('flips a recommended step to done and reports changed:true', () => {
    writeProject(tmpDir, PLAN);
    const r = runGsdTools('project strategy-done model-domain', tmpDir);
    assert.ok(r.success, `failed: ${r.error}`);
    const o = JSON.parse(r.output);
    assert.strictEqual(o.found, true);
    assert.strictEqual(o.step, 'model-domain');
    assert.strictEqual(o.status, 'done');
    assert.strictEqual(o.changed, true);
    const content = readProject(tmpDir);
    assert.match(content, /\|\s*model-domain\s*\|\s*done\s*\|/);
    // Untouched rows and body survive the write.
    assert.match(content, /\|\s*recommend-architecture\s*\|\s*recommended\s*\|/);
    assert.ok(content.includes('untouched body text'), 'rest of PROJECT.md preserved');
    assert.ok(content.includes('- testing-strategy — skipped'), 'skip-ledger preserved');
  });

  test('is idempotent: flipping an already-done step reports changed:false', () => {
    writeProject(tmpDir, PLAN);
    const r = runGsdTools('project strategy-done security-strategy', tmpDir);
    assert.ok(r.success, `failed: ${r.error}`);
    const o = JSON.parse(r.output);
    assert.strictEqual(o.status, 'done');
    assert.strictEqual(o.changed, false);
    // Double-flip of a freshly flipped step is also a no-op.
    runGsdTools('project strategy-done model-domain', tmpDir);
    const again = JSON.parse(runGsdTools('project strategy-done model-domain', tmpDir).output);
    assert.strictEqual(again.changed, false);
  });

  test('unknown step errors and leaves the file untouched', () => {
    writeProject(tmpDir, PLAN);
    const before = readProject(tmpDir);
    const r = runGsdTools('project strategy-done nonexistent-step', tmpDir);
    assert.strictEqual(r.success, false, 'unknown step must be an error');
    assert.strictEqual(readProject(tmpDir), before, 'file untouched on error');
  });

  test('missing step argument errors', () => {
    writeProject(tmpDir, PLAN);
    const r = runGsdTools('project strategy-done', tmpDir);
    assert.strictEqual(r.success, false, 'missing <step> must be an error');
  });

  test('missing PROJECT.md errors (write verb cannot no-op silently)', () => {
    const r = runGsdTools('project strategy-done model-domain', tmpDir);
    assert.strictEqual(r.success, false);
  });

  test('step match is case-insensitive; a placeholder row never matches', () => {
    writeProject(tmpDir, PLAN.replace('| model-domain |', '| Model-Domain |'));
    const o = JSON.parse(runGsdTools('project strategy-done model-domain', tmpDir).output);
    assert.strictEqual(o.changed, true);
    // Placeholder-only table: the bracketed template row must not be flipped.
    writeProject(tmpDir, '## Strategy Plan\n\n| Step | Status |\n|---|---|\n| [model-domain] | [recommended] |\n');
    const r = runGsdTools('project strategy-done model-domain', tmpDir);
    assert.strictEqual(r.success, false, 'placeholder row is not a real step');
  });

  test('the flip feeds query grounding required (end-to-end loop closure)', () => {
    writeProject(tmpDir, PLAN);
    fs.writeFileSync(path.join(tmpDir, '.planning', 'DOMAIN-MODEL.md'),
      '## Subdomains\n| Subdomain | Type |\n|---|---|\n| pricing | Core |\n');
    const before = JSON.parse(runGsdTools('query grounding required', tmpDir).output);
    assert.ok(!before.required.some((s) => s.artifact === 'DOMAIN-MODEL'), 'not required while recommended');
    runGsdTools('project strategy-done model-domain', tmpDir);
    const after = JSON.parse(runGsdTools('query grounding required', tmpDir).output);
    assert.ok(after.required.some((s) => s.artifact === 'DOMAIN-MODEL'),
      'done + artifact on disk → required set includes it');
  });
});

// ─── Workflow contract: every strategy skill flips its own step ───────────────

describe('CONTRACT: every strategy workflow calls project strategy-done at its commit step', () => {
  // Step ids per references/strategy-flow.md's spine (the Strategy Plan row
  // names) — each strategy skill must flip its own row when it commits its
  // artifact, or the grounding gate stays vacuously green forever (issue #21).
  const STRATEGY_WORKFLOWS = {
    'model-domain.md': 'model-domain',
    'recommend-architecture.md': 'recommend-architecture',
    'testing-strategy.md': 'testing-strategy',
    'security-strategy.md': 'security-strategy',
    'frontend-architecture.md': 'frontend-architecture',
    'infrastructure-strategy.md': 'infrastructure-strategy',
    'cicd-strategy.md': 'cicd-strategy',
    'legacy-inventory.md': 'legacy-inventory',
    'discover-product.md': 'discover-product',
  };

  for (const [file, stepId] of Object.entries(STRATEGY_WORKFLOWS)) {
    test(`${file} flips ${stepId} to done when it commits its artifact`, () => {
      const content = fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf-8');
      const re = new RegExp(`gsd_run project strategy-done ${stepId}\\b`);
      assert.match(
        content,
        re,
        `${file} must run \`gsd_run project strategy-done ${stepId}\` where it commits its artifact — ` +
          'without the flip, PROJECT.md Strategy Plan rows stay `recommended` forever and ' +
          '`query grounding required` returns [] (the gate passes vacuously).'
      );
    });
  }
});
