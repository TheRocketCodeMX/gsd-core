'use strict';
// Unit test for the gsd-grounding-index-refresh FileChanged hook: on a strategy
// doc change it injects the current active-source set as additionalContext; on an
// unrelated file it is a silent no-op.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { cleanup } = require('./helpers.cjs');

const HOOK = path.resolve(__dirname, '..', 'hooks', 'gsd-grounding-index-refresh.js');

function runHook(event) {
  const out = execFileSync(process.execPath, [HOOK], { input: JSON.stringify(event), encoding: 'utf8' });
  return out.trim();
}

function mkProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-hook-'));
  fs.mkdirSync(path.join(dir, '.planning', 'adr'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.planning', 'PROJECT.md'),
    '## Strategy Plan\n| Step | Status |\n|---|---|\n| recommend-architecture | done |\n');
  fs.writeFileSync(path.join(dir, '.planning', 'adr', '0001-architecture.md'),
    '### Axis A\n| Subdomain | Type | Rung | Why |\n|---|---|---|---|\n| pricing | Core | Domain Model | x |\n');
  return dir;
}

describe('gsd-grounding-index-refresh FileChanged hook', () => {
  test('the hook script exists and is valid JS', () => {
    assert.ok(fs.existsSync(HOOK));
    execFileSync(process.execPath, ['--check', HOOK], { stdio: 'pipe' });
  });

  test('a strategy-doc change → injects the active sources as additionalContext', () => {
    const dir = mkProject();
    const out = runHook({
      hook_event_name: 'FileChanged', event: 'change', cwd: dir,
      file_path: path.join(dir, '.planning', 'adr', '0001-architecture.md'),
    });
    const j = JSON.parse(out);
    assert.equal(j.hookSpecificOutput.hookEventName, 'FileChanged');
    assert.match(j.hookSpecificOutput.additionalContext, /sources of truth/i);
    assert.match(j.hookSpecificOutput.additionalContext, /ADR/);
    cleanup(dir);
  });

  test('an unrelated file change → silent no-op (no output)', () => {
    const dir = mkProject();
    const out = runHook({
      hook_event_name: 'FileChanged', event: 'change', cwd: dir,
      file_path: path.join(dir, '.planning', 'STATE.md'),
    });
    assert.equal(out, '', 'non-strategy file must produce no output');
    cleanup(dir);
  });

  test('an unlink event → silent no-op', () => {
    const dir = mkProject();
    const out = runHook({
      hook_event_name: 'FileChanged', event: 'unlink', cwd: dir,
      file_path: path.join(dir, '.planning', 'DOMAIN-MODEL.md'),
    });
    assert.equal(out, '');
    cleanup(dir);
  });
});
