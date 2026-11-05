'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { runNode, runHook, assertSeamExit } = require('./helpers/process-seam.cjs');
const { createTempDir, cleanup } = require('./helpers.cjs');
const { isBuiltin } = require('node:module');
const fs = require('node:fs');
const path = require('node:path');

const VISUAL = path.resolve(__dirname, '..', 'gsd-core', 'visual');
const SERVER = path.join(VISUAL, 'server.cjs');
const FRAME = path.join(VISUAL, 'frame-template.html');
const FILES = ['server.cjs', 'helper.js', 'frame-template.html', 'start-server.sh', 'stop-server.sh'];
const { PROBE_TIMEOUT_MS } = require('./helpers/timeouts.cjs');

describe('learn visual companion (vendored, zero-install)', () => {
  test('server.cjs and helper.js parse as valid JS', () => {
    assertSeamExit(assert, runNode(['--check', SERVER], { timeoutMs: PROBE_TIMEOUT_MS }));
    assertSeamExit(assert, runNode(['--check', path.join(VISUAL, 'helper.js')], { timeoutMs: PROBE_TIMEOUT_MS }));
  });

  test('server.cjs requires ONLY Node built-ins (zero third-party dependencies)', () => {
    const src = fs.readFileSync(SERVER, 'utf8');
    const requires = [...src.matchAll(/require\(\s{0,5}['"]([^'"]{1,300})['"]\s{0,5}\)/g)].map((m) => m[1]);
    assert.ok(requires.length > 0, 'expected some require() calls');
    for (const mod of requires) {
      // Relative requires are vendored siblings; everything else must be a Node built-in.
      if (mod.startsWith('.') || mod.startsWith('/')) continue;
      assert.ok(isBuiltin(mod), `server.cjs requires non-builtin "${mod}" — visual layer must stay zero-install`);
    }
  });

  test('no superpowers/brainstorm coupling remains in any vendored file', () => {
    for (const f of FILES) {
      const src = fs.readFileSync(path.join(VISUAL, f), 'utf8');
      assert.doesNotMatch(src, /\.superpowers\//, `${f}: leftover .superpowers/ path`);
      assert.doesNotMatch(src, /superpowers|brainstorm/i, `${f}: leftover superpowers/brainstorm reference`);
    }
  });

  // align-1.20.1 (upstream #5757): --project-dir session files go under the tool-owned
  // <project>/.gsd, which now has ONE owner (gsd-core/bin/lib/gsd-tool-dir.cjs). The start
  // script must route through it BEFORE it creates the session dir, so a .gsd symlink is
  // refused (the session key never lands outside the project) and .gsd/.gitignore is seeded.
  test('start-server routes --project-dir through the tool-owned .gsd owner before writing', () => {
    const src = fs.readFileSync(path.join(VISUAL, 'start-server.sh'), 'utf8');
    const owner = src.indexOf('ensureToolOwnedGsdDir');
    const sessionDir = src.indexOf('SESSION_DIR="${PROJECT_DIR}/.gsd/learn-visual/');
    assert.ok(owner !== -1, 'start-server.sh must call ensureToolOwnedGsdDir');
    assert.ok(sessionDir !== -1, 'start-server.sh must still place project sessions under .gsd/learn-visual');
    assert.ok(owner < sessionDir, 'the owner call must precede the session-dir assignment');
    assert.match(src, /bin\/lib\/gsd-tool-dir\.cjs/, 'the owner is the shipped gsd-tool-dir module');
    assert.match(src, /"\/learn-visual\/"/, 'the learn-visual rule is registered in .gsd/.gitignore');
  });

  test('start-server refuses a .gsd symlink that leaves the project', (t) => {
    if (process.platform === 'win32') { t.skip('symlink fixture needs POSIX links'); return; }
    if (!fs.existsSync(path.join(VISUAL, '..', 'bin', 'lib', 'gsd-tool-dir.cjs'))) {
      t.skip('gsd-core/bin/lib not built (npm run build:lib)');
      return;
    }
    const root = createTempDir('gsd-learn-visual-owner-');
    try {
      const project = path.join(root, 'project');
      const outside = path.join(root, 'outside');
      fs.mkdirSync(project);
      fs.mkdirSync(outside);
      fs.symlinkSync(outside, path.join(project, '.gsd'));
      const r = runHook(path.join(VISUAL, 'start-server.sh'), ['--project-dir', project], {
        interpreter: 'bash', timeoutMs: PROBE_TIMEOUT_MS,
      });
      assertSeamExit(assert, r, 1);
      assert.match(r.stdout, /"error": "Refusing to store session files under <project>\/\.gsd/);
      assert.deepEqual(fs.readdirSync(outside), [], 'nothing may be written through the link');
    } finally {
      cleanup(root);
    }
  });

  test('frame is self-contained — no external CDN/font/script URLs', () => {
    const html = fs.readFileSync(FRAME, 'utf8');
    assert.doesNotMatch(html, /<link\b/i, 'frame must not <link> external stylesheets/fonts');
    assert.doesNotMatch(html, /src\s*=\s*['"]https?:/i, 'frame must not load external <script src>');
    assert.doesNotMatch(html, /https?:\/\/(fonts|cdn|unpkg|jsdelivr)/i, 'frame must not reference a CDN');
  });
});
