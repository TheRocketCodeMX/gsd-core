'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { cleanup } = require('./helpers.cjs');
const { routeContextCommand } = require(path.resolve(__dirname, '..', 'gsd-core', 'bin', 'lib', 'context-command-router.cjs'));

function run(args, cwd) {
  const out = []; const errs = [];
  routeContextCommand({ args, cwd, raw: true, error: (m) => errs.push(m), _core: { output: (v) => out.push(v) } });
  return { out, errs };
}

describe('context command router', () => {
  test('provenance returns parsed frontmatter, null for plain files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-cr-'));
    try {
      const f = path.join(dir, 'C.md');
      fs.writeFileSync(f, '---\nphase: 2\ncontext_provenance:\n  author: orchestrator\n  date: 2026-07-18\n  quality: thin\n  note: "x"\n---\n# C\n');
      const { out } = run(['context', 'provenance', '--file', f], dir);
      assert.equal(out[0].quality, 'thin');
      fs.writeFileSync(f, '# plain\n');
      assert.equal(run(['context', 'provenance', '--file', f], dir).out[0], null);
    } finally { cleanup(dir); }
  });
  test('verify --file reports and annotates; unknown subcommand errors', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-cr2-'));
    try {
      const f = path.join(dir, 'C.md');
      fs.writeFileSync(f, '## Verified Facts\n\n- claim [anchor: gone.js "x"]\n');
      const { out } = run(['context', 'verify', '--file', f], dir);
      assert.equal(out[0].missing, 1);
      assert.match(fs.readFileSync(f, 'utf8'), /\[STALE — /);
      const { errs } = run(['context', 'frobnicate'], dir);
      assert.match(errs.join(' '), /Unknown context subcommand/);
    } finally { cleanup(dir); }
  });
  test('verify --phase resolves the phase capsule under .planning/phases', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-cr3-'));
    try {
      const pdir = path.join(dir, '.planning', 'phases', '07-build');
      fs.mkdirSync(pdir, { recursive: true });
      fs.writeFileSync(path.join(pdir, '07-CONTEXT.md'), '## Verified Facts\n\n- ok [anchor: ext:x "y"]\n');
      const { out } = run(['context', 'verify', '--phase', '7'], dir);
      assert.equal(out[0].external, 1);
    } finally { cleanup(dir); }
  });
});
