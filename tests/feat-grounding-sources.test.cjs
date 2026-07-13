'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { cleanup } = require('./helpers.cjs');
const ROOT = path.resolve(__dirname, '..');
const g = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'grounding.cjs'));
const TOOLS = path.join(ROOT, 'gsd-core', 'bin', 'gsd-tools.cjs');

describe('grounding — ## Sources registry', () => {
  test('resolver reads literal-source locations from ## Sources', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-src-'));
    fs.mkdirSync(path.join(dir, '.planning'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.planning', 'PROJECT.md'),
      '## Sources\n\n- design · design/checkout.export.html — Stitch export\n- legacy · ../old-app/src\n- context-app · ../ref-app — pricing reference\n\n## Strategy Plan\n');
    const r = g.resolveRequiredSources(dir);
    assert.equal(r.sources.length, 3);
    assert.deepEqual(r.sources[0], { kind: 'design', path: 'design/checkout.export.html', note: 'Stitch export' });
    assert.equal(r.sources[1].kind, 'legacy');
    assert.equal(r.sources[2].kind, 'context-app');
    cleanup(dir);
  });
});

describe('grounding — source-direct citation verification', () => {
  function project(planGrounding) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-srcd-'));
    fs.mkdirSync(path.join(dir, '.planning', 'phase'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'design'), { recursive: true });
    // A registered literal source file with a real fact on a real line.
    fs.writeFileSync(path.join(dir, 'design', 'signup.export.html'),
      '<form>\n  <label>Full address</label>\n  <input name="address" placeholder="single free-text address" />\n</form>\n');
    fs.writeFileSync(path.join(dir, '.planning', 'PROJECT.md'),
      '## Sources\n\n- design · design/signup.export.html\n\n## Strategy Plan\n| Step | Status |\n|---|---|\n');
    fs.writeFileSync(path.join(dir, '.planning', 'phase', '01-01-PLAN.md'), `## Grounding\n${planGrounding}\n\n## Tasks\n- x\n`);
    return dir;
  }
  function gate(dir) {
    try { return JSON.parse(execFileSync(process.execPath, [TOOLS, 'query', 'check.grounding-plan', path.join(dir, '.planning', 'phase')], { cwd: dir, encoding: 'utf8' })); }
    catch (e) { return JSON.parse((e.stdout || '{}').trim() || '{}'); }
  }

  test('a SOURCE citation whose fact is really in the file → passes', () => {
    const dir = project('- SOURCE · single free-text address → design/signup.export.html:3');
    assert.equal(gate(dir).passed, true);
    cleanup(dir);
  });

  test('a SOURCE citation whose fact is NOT in the file → blocked', () => {
    const dir = project('- SOURCE · four separate address fields → design/signup.export.html:3');
    const j = gate(dir);
    assert.equal(j.passed, false, 'a fabricated source fact must be blocked');
    cleanup(dir);
  });

  test('a SOURCE citation pointing at a missing file → blocked', () => {
    const dir = project('- SOURCE · anything → design/nope.html:1');
    assert.equal(gate(dir).passed, false);
    cleanup(dir);
  });
});
