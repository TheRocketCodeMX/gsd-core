'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { isBuiltin } = require('node:module');
const fs = require('node:fs');
const path = require('node:path');

const VISUAL = path.resolve(__dirname, '..', 'gsd-core', 'visual');
const SERVER = path.join(VISUAL, 'server.cjs');
const FRAME = path.join(VISUAL, 'frame-template.html');
const FILES = ['server.cjs', 'helper.js', 'frame-template.html', 'start-server.sh', 'stop-server.sh'];

describe('learn visual companion (vendored, zero-install)', () => {
  test('server.cjs and helper.js parse as valid JS', () => {
    execFileSync(process.execPath, ['--check', SERVER], { stdio: 'pipe' });
    execFileSync(process.execPath, ['--check', path.join(VISUAL, 'helper.js')], { stdio: 'pipe' });
  });

  test('server.cjs requires ONLY Node built-ins (zero third-party dependencies)', () => {
    const src = fs.readFileSync(SERVER, 'utf8');
    const requires = [...src.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
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

  test('frame is self-contained — no external CDN/font/script URLs', () => {
    const html = fs.readFileSync(FRAME, 'utf8');
    assert.doesNotMatch(html, /<link\b/i, 'frame must not <link> external stylesheets/fonts');
    assert.doesNotMatch(html, /src\s*=\s*['"]https?:/i, 'frame must not load external <script src>');
    assert.doesNotMatch(html, /https?:\/\/(fonts|cdn|unpkg|jsdelivr)/i, 'frame must not reference a CDN');
  });
});
