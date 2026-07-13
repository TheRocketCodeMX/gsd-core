'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { cleanup } = require('./helpers.cjs');
const ROOT = path.resolve(__dirname, '..');
const grounding = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'grounding.cjs'));

function mkProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-grounding-'));
  fs.mkdirSync(path.join(dir, '.planning', 'adr'), { recursive: true });
  for (const [rel, body] of Object.entries(files)) {
    const p = path.join(dir, '.planning', rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
  }
  return dir;
}

describe('grounding resolver', () => {
  test('required set = done strategy steps with files on disk; skipped excluded', () => {
    const dir = mkProject({
      'PROJECT.md': `## Strategy Plan\n\n| Step | Status |\n|---|---|\n| model-domain | done |\n| recommend-architecture | done |\n| testing-strategy | done |\n| security-strategy | recommended |\n\n### Skip-ledger\n- infrastructure-strategy — skipped (local-only, 2026-06-26)\n`,
      'DOMAIN-MODEL.md': '## Subdomains\n| Subdomain | Type |\n|---|---|\n| pricing | Core |\n',
      'adr/0001-architecture.md': '### Axis A\n| Subdomain | Type | Rung | Why |\n|---|---|---|---|\n| pricing | Core | Domain Model | rich |\n',
      'TEST-STRATEGY.md': '## Level emphasis per subdomain\n| Subdomain | Architecture rung | Primary level (small/medium/large) | Why |\n|---|---|---|---|\n| pricing | Domain Model | small | logic |\n',
    });
    const r = grounding.resolveRequiredSources(dir);
    const ids = r.required.map((x) => x.artifact).sort();
    assert.deepEqual(ids, ['ADR', 'DOMAIN-MODEL', 'TEST-STRATEGY']);
    assert.ok(r.skipped.includes('infrastructure-strategy'), 'skipped step excluded from required');
    assert.ok(r.pending.includes('security-strategy'), 'recommended-not-done is pending, not required');
    cleanup(dir);
  });

  test('never-run project (no Strategy Plan) → empty required set', () => {
    const dir = mkProject({ 'PROJECT.md': '# Project\n\nno strategy plan here\n' });
    const r = grounding.resolveRequiredSources(dir);
    assert.equal(r.required.length, 0, 'nothing required when nothing was run');
    cleanup(dir);
  });

  test('artifact on disk but status still recommended → unflipped warning (issue #21)', () => {
    // The step ran (DOMAIN-MODEL.md exists) but never flipped its Strategy Plan
    // row to `done` — the gate would under-require. resolveRequiredSources must
    // surface the inconsistency instead of silently returning a smaller set.
    const dir = mkProject({
      'PROJECT.md': '## Strategy Plan\n\n| Step | Status |\n|---|---|\n| model-domain | recommended |\n| testing-strategy | recommended |\n',
      'DOMAIN-MODEL.md': '## Subdomains\n| Subdomain | Type |\n|---|---|\n| pricing | Core |\n',
    });
    const r = grounding.resolveRequiredSources(dir);
    assert.equal(r.required.length, 0, 'recommended is still not required');
    assert.ok(Array.isArray(r.warnings), 'resolver exposes a warnings field');
    assert.ok(
      r.warnings.some((w) => /^unflipped: model-domain\b/.test(w)),
      `expected an "unflipped: model-domain" warning, got: ${JSON.stringify(r.warnings)}`,
    );
    assert.ok(
      !r.warnings.some((w) => /testing-strategy/.test(w)),
      'a recommended step with NO artifact on disk is pending, not unflipped',
    );
    cleanup(dir);
  });

  test('done steps and clean pending steps produce no warnings', () => {
    const dir = mkProject({
      'PROJECT.md': '## Strategy Plan\n\n| Step | Status |\n|---|---|\n| model-domain | done |\n| security-strategy | recommended |\n',
      'DOMAIN-MODEL.md': '## Subdomains\n| Subdomain | Type |\n|---|---|\n| pricing | Core |\n',
    });
    const r = grounding.resolveRequiredSources(dir);
    assert.deepEqual(r.warnings, [], 'consistent plan → no warnings');
    cleanup(dir);
  });
});
