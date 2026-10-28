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

// ─── context.md fences honour --ws (pre-ship matrix119-B F1) ──────────────────
//
// `/gsd-context` was only half workstream-aware: (a) the flush commit hard-coded
// `.planning/STATE.md`, so the workstream STATE.md that `state.record-session` had just
// written stayed modified and uncommitted; (b) with `--ws` typed but no active pointer the
// flush's `state.record-session` got no `--ws`, printed `{"error":"STATE.md not found"}` with
// rc 0, and the session position was silently never recorded; (c) seed's verify-at-birth
// fence dropped `--ws` ("no matching CONTEXT file found"). The fences below are extracted
// VERBATIM from the shipped context.md and executed in bash against the real gsd-tools; only
// the runtime's `$ARGUMENTS` substitution and the operator's `<placeholder>` fills are applied.

describe('context.md fences honour --ws (matrix119-B F1)', () => {
  const { runHook } = require('./helpers/process-seam.cjs');
  const { gitOrThrow, throwIfFailed } = require('./helpers/git-fixture.cjs');
  const { scanFencedBlocks } = require(path.resolve(__dirname, '..', 'gsd-core', 'bin', 'lib', 'markdown-sectionizer.cjs'));
  const ROOT = path.resolve(__dirname, '..');
  const wf = fs.readFileSync(path.join(ROOT, 'gsd-core', 'workflows', 'context.md'), 'utf-8');
  const lines = wf.split(/\r?\n/);
  const fences = scanFencedBlocks(lines)
    .filter((b) => /^bash\b/.test(b.infoString))
    .map((b) => lines.slice(b.openLineIdx + 1, b.closeLineIdx).join('\n'));
  const fenceWith = (needle) => {
    const hit = fences.find((f) => f.includes(needle));
    assert.ok(hit, `context.md has no bash fence containing ${needle}`);
    return hit;
  };
  const step1 = fenceWith('_GSD_SHIM_NAME=');
  const flush = fenceWith('docs(context): flush knowledge checkpoint');
  const seedVerify = fenceWith('gsd_run context verify --phase "${N}"');
  const shell = os.platform() === 'win32' ? null : 'bash';
  const CAP = '## Verified Facts\n\n- ok [anchor: ext:x "y"]\n';

  function makeProject({ ws }) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-context-ws-'));
    const put = (rel, body) => {
      const f = path.join(dir, rel);
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, body);
    };
    put('.planning/PROJECT.md', '# Project\n');
    put('.planning/config.json', '{\n  "commit_docs": true\n}\n');
    put('.planning/MASTER-CONTEXT.md', CAP);
    const base = ws ? `.planning/workstreams/${ws}` : '.planning';
    put(`${base}/ROADMAP.md`, '# Roadmap\n\n### Phase 4: Threads\n');
    put(`${base}/REQUIREMENTS.md`, '# Requirements\n');
    put(`${base}/STATE.md`, '---\nmilestone: v1.1\n---\n# State\n\n## Session Continuity\n\nLast session: 2026-01-01\nStopped At: old\nResume File: None\n');
    put(`${base}/phases/04-threads/04-CONTEXT.md`, CAP);
    gitOrThrow(['init', '-q'], { cwd: dir });
    gitOrThrow(['config', 'user.email', 't@example.com'], { cwd: dir });
    gitOrThrow(['config', 'user.name', 't'], { cwd: dir });
    gitOrThrow(['config', 'commit.gpgsign', 'false'], { cwd: dir });
    gitOrThrow(['add', '.'], { cwd: dir });
    gitOrThrow(['commit', '-q', '-m', 'init'], { cwd: dir });
    return dir;
  }

  function run(dir, fence, args, extraEnv = {}) {
    const PATH = [path.join(ROOT, 'gsd-core', 'bin'), process.env.PATH].join(path.delimiter);
    const env = { ...process.env, PATH, RUNTIME_DIR: ROOT, HOME: dir, USERPROFILE: dir, ...extraEnv };
    if (!('GSD_WORKSTREAM' in extraEnv)) delete env.GSD_WORKSTREAM;
    delete env.GSD_SESSION_KEY;
    const marker = '\n$ARGUMENTS\nGSD_ARGS_END';
    const script = fence.includes(marker) ? fence.replace(marker, () => `\n${args}\nGSD_ARGS_END`) : fence;
    const r = runHook('-c', [script], { interpreter: 'bash', cwd: dir, env });
    throwIfFailed(r, 'bash <context.md fence>');
    return r.stdout + r.stderr;
  }

  function runFlush(dir, args, capsuleRel, extraEnv) {
    for (const ph of ['<one line: current position>', '<active capsule path>', '<capsule>']) {
      assert.ok(flush.includes(ph), `flush fence must keep the operator placeholder ${ph}`);
    }
    const filled = flush
      .split('<one line: current position>').join('04-02 executing')
      .split('<active capsule path>').join(capsuleRel)
      .split('<capsule>').join(capsuleRel);
    return run(dir, filled, args, extraEnv);
  }

  const headFiles = (dir) => gitOrThrow(['show', '--name-only', '--format=%s', 'HEAD'], { cwd: dir }).trim().split('\n').slice(1).filter(Boolean).sort();
  const porcelain = (dir) => gitOrThrow(['status', '--porcelain'], { cwd: dir }).trim();
  const wsCapsule = '.planning/workstreams/community/phases/04-threads/04-CONTEXT.md';
  const wsState = '.planning/workstreams/community/STATE.md';

  test('Step 1 resolves the workstream ROADMAP.md under --ws (the seed/scout guard reads it)', { skip: shell ? false : 'bash fences' }, () => {
    const dir = makeProject({ ws: 'community' });
    try {
      assert.match(run(dir, step1, 'seed --milestone --auto --ws community'), /context_paths: .*roadmap=\S*\/\.planning\/workstreams\/community\/ROADMAP\.md/);
    } finally { cleanup(dir); }
  });

  test('(b) flush with --ws and no pointer records the session in the workstream STATE.md and commits it', { skip: shell ? false : 'bash fences' }, () => {
    const dir = makeProject({ ws: 'community' });
    try {
      fs.appendFileSync(path.join(dir, wsCapsule), '\n## Orchestrator curation (2026-10-28)\n\n- learned\n');
      const out = runFlush(dir, 'flush --ws community', wsCapsule);
      assert.doesNotMatch(out, /NOT recorded/);
      assert.match(fs.readFileSync(path.join(dir, wsState), 'utf-8'), /04-02 executing/);
      assert.deepEqual(headFiles(dir), [wsCapsule, wsState].sort());
      assert.equal(porcelain(dir), '', 'nothing left modified');
    } finally { cleanup(dir); }
  });

  test('(a) flush under an active workstream (GSD_WORKSTREAM pointer) commits the workstream STATE.md', { skip: shell ? false : 'bash fences' }, () => {
    const dir = makeProject({ ws: 'community' });
    try {
      runFlush(dir, 'flush', wsCapsule, { GSD_WORKSTREAM: 'community' });
      assert.match(fs.readFileSync(path.join(dir, wsState), 'utf-8'), /04-02 executing/);
      assert.ok(headFiles(dir).includes(wsState), `HEAD must stage ${wsState}: ${headFiles(dir)}`);
      assert.equal(porcelain(dir), '', 'workstream STATE.md must not be left modified');
    } finally { cleanup(dir); }
  });

  test('(b) a record-session that wrote nothing is reported, never silent', { skip: shell ? false : 'bash fences' }, () => {
    const dir = makeProject({ ws: 'community' });
    try {
      // No pointer and no --ws in a workstream-only project: there is no root STATE.md.
      const out = runFlush(dir, 'flush', wsCapsule);
      assert.match(out, /flush_session: NOT recorded/);
    } finally { cleanup(dir); }
  });

  test('flat project: flush still records and commits the root .planning/STATE.md', { skip: shell ? false : 'bash fences' }, () => {
    const dir = makeProject({ ws: null });
    try {
      const cap = '.planning/phases/04-threads/04-CONTEXT.md';
      const out = runFlush(dir, 'flush', cap);
      assert.doesNotMatch(out, /NOT recorded/);
      assert.ok(headFiles(dir).includes('.planning/STATE.md'), `HEAD: ${headFiles(dir)}`);
      assert.equal(porcelain(dir), '');
    } finally { cleanup(dir); }
  });

  test('(c) seed verify-at-birth threads --ws to context verify', { skip: shell ? false : 'bash fences' }, () => {
    const dir = makeProject({ ws: 'community' });
    try {
      const out = run(dir, seedVerify, 'seed --phase 4 --ws community', { N: '4' });
      assert.doesNotMatch(out, /no matching CONTEXT file found/);
      assert.match(out, /workstreams\/community\/phases\/04-threads\/04-CONTEXT\.md/);
    } finally { cleanup(dir); }
  });
});
