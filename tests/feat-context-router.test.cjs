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

// #93: `context verify --phase N` must resolve the phase directory through
// upstream's convention-aware phase locator (the seam `find-phase` /
// gate-phase-context use) and the workstream planning root, not a hard-coded
// `.planning/phases/<NN>-*` glob; `--milestone` must read the active
// workstream's phases too.
describe('#93 context verify resolves phases across layouts', () => {
  const { runGsdTools } = require('./helpers.cjs');
  const CAPSULE = '## Verified Facts\n\n- ok [anchor: ext:x "y"]\n';
  function mk(prefix) { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }
  function put(dir, rel, body) {
    const f = path.join(dir, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, body);
    return f;
  }
  const real = (p) => fs.realpathSync(p);

  test('legacy layout: --phase 1 finds 01-*/01-CONTEXT.md', () => {
    const dir = mk('gsd-cr93a-');
    try {
      const f = put(dir, '.planning/phases/01-foundation/01-CONTEXT.md', CAPSULE);
      put(dir, '.planning/phases/02-api/02-01-PLAN.md', '# p\n');
      const { out, errs } = run(['context', 'verify', '--phase', '1'], dir);
      assert.deepEqual(errs, []);
      assert.equal(real(out[0].file), real(f));
    } finally { cleanup(dir); }
  });

  test('bracket-migrated layout: --phase 1 / 01 / CA.01-01 find CA.01-01-*/01-CONTEXT.md', () => {
    const dir = mk('gsd-cr93b-');
    try {
      put(dir, '.planning/config.json', JSON.stringify({ project_code: 'CA', phase_id_convention: 'bracket' }));
      put(dir, '.planning/MASTER-CONTEXT.md', CAPSULE);
      const f = put(dir, '.planning/phases/CA.01-01-foundation/01-CONTEXT.md', CAPSULE);
      put(dir, '.planning/phases/CA.01-02-chat-interface/02-01-PLAN.md', '# p\n');
      for (const phase of ['1', '01', 'CA.01-01']) {
        const { out, errs } = run(['context', 'verify', '--phase', phase], dir);
        assert.deepEqual(errs, [], `--phase ${phase}`);
        assert.equal(out.length, 1, `--phase ${phase}`);
        assert.equal(real(out[0].file), real(f), `--phase ${phase}`);
      }
      // A resolved phase with no capsule is still "no matching CONTEXT file".
      const r2 = runGsdTools(['context', 'verify', '--phase', '2'], dir);
      assert.equal(r2.success, false);
      assert.match(r2.error + r2.output, /no matching CONTEXT file found/);
      // --milestone keeps finding MASTER + the bracket capsule.
      const m = run(['context', 'verify', '--milestone'], dir).out[0];
      assert.equal(m.length, 2);
    } finally { cleanup(dir); }
  });

  test('workstream layout: --phase 1 --ws and --milestone --ws read workstreams/<ws>/phases', () => {
    const dir = mk('gsd-cr93c-');
    try {
      const master = put(dir, '.planning/MASTER-CONTEXT.md', CAPSULE);
      put(dir, '.planning/PROJECT.md', '# P\n');
      put(dir, '.planning/workstreams/default/ROADMAP.md', '# Roadmap\n');
      put(dir, '.planning/workstreams/default/STATE.md', '# State\n');
      const f = put(dir, '.planning/workstreams/default/phases/01-foundation/01-CONTEXT.md', CAPSULE);
      put(dir, '.planning/workstreams/notif/phases/01-other/01-CONTEXT.md', CAPSULE);

      const r = runGsdTools(['context', 'verify', '--phase', '1', '--ws', 'default'], dir);
      assert.ok(r.success, `failed: ${r.error}`);
      assert.equal(real(JSON.parse(r.output).file), real(f));

      const env = runGsdTools(['context', 'verify', '--phase', '1'], dir, { GSD_WORKSTREAM: 'default' });
      assert.ok(env.success, `failed: ${env.error}`);
      assert.equal(real(JSON.parse(env.output).file), real(f));

      const m = runGsdTools(['context', 'verify', '--milestone', '--ws', 'default'], dir);
      assert.ok(m.success, `failed: ${m.error}`);
      const files = JSON.parse(m.output).map((x) => real(x.file)).sort();
      assert.deepEqual(files, [real(master), real(f)].sort(), 'root MASTER + only the active workstream capsule');
    } finally { cleanup(dir); }
  });
});
