// allow-test-rule: integration-test-input
/**
 * The /gsd:update workflow's "What's New" preview calls
 *   <configDir>/gsd-core/scripts/changeset/cli.cjs extract ...
 * Upstream referenced that path but never shipped the files, so the preview
 * always silently degraded to "(Could not extract changelog)". The fix ships
 * the changeset tooling into the runtime payload and makes its two cross-tree
 * requires resolve BOTH layouts:
 *   - repo:      scripts/changeset/  (sibling of gsd-core/)
 *   - installed: gsd-core/scripts/changeset/  (inside gsd-core/)
 *
 * These tests run the real cli.cjs in both layouts against a fixture
 * changelog written to a temp dir (test-input reads, not source-grep).
 */

'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const { cleanup } = require('./helpers.cjs');

const FIXTURE_CHANGELOG = [
  '# Changelog',
  '',
  '## [Unreleased]',
  '',
  '## [1.7.3] - 2026-06-10',
  '',
  '### Fixed',
  '',
  '- Prune emptied legacy runtime dir.',
  '',
  '## [1.7.2] - 2026-06-10',
  '',
  '### Removed',
  '',
  '- Agent-facing context warnings.',
  '',
].join('\n');

function runExtract(cliPath, changelogPath) {
  return execFileSync(process.execPath, [
    cliPath, 'extract',
    '--from', '1.7.2',
    '--to', '1.7.3',
    '--changelog', changelogPath,
  ], { encoding: 'utf8', windowsHide: true });
}

describe('update workflow changelog preview tooling (changeset cli)', () => {
  let tmpRoot;
  let changelogPath;

  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-changelog-preview-'));
    changelogPath = path.join(tmpRoot, 'CHANGELOG.md');
    fs.writeFileSync(changelogPath, FIXTURE_CHANGELOG, 'utf8');
  });

  after(() => {
    cleanup(tmpRoot);
  });

  test('repo layout: scripts/changeset/cli.cjs extract works from the repo tree', () => {
    const out = runExtract(path.join(ROOT, 'scripts', 'changeset', 'cli.cjs'), changelogPath);
    assert.match(out, /1\.7\.3/, 'extract output must include the 1.7.3 release');
    assert.match(out, /Prune emptied legacy runtime dir/, 'extract output must include the 1.7.3 entry body');
    assert.ok(!out.includes('1.7.2] -'), 'extract range (from, to] must exclude the FROM version section');
  });

  test('installed layout: cli.cjs works at gsd-core/scripts/changeset/ exactly as the installer ships it', () => {
    // Mirror the installer's changesetPayload copy: the tooling lands INSIDE
    // gsd-core/, where '../../gsd-core/bin/lib/X' does not exist and the
    // dual-layout fallback '../../bin/lib/X' must resolve.
    const fakeConfigDir = path.join(tmpRoot, 'fake-runtime');
    const payload = [
      'scripts/changeset/cli.cjs',
      'scripts/changeset/parse.cjs',
      'scripts/changeset/render.cjs',
      'scripts/changeset/serialize.cjs',
      'scripts/changeset/github-release-notes.cjs',
      'scripts/lib/cli-exit.cjs',
    ];
    for (const rel of payload) {
      const dest = path.join(fakeConfigDir, 'gsd-core', ...rel.split('/'));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(ROOT, ...rel.split('/')), dest);
    }
    // The runtime payload also contains gsd-core/bin/lib (copied wholesale by the
    // installer); the cli needs these two self-contained modules from it.
    for (const lib of ['semver-compare.cjs', 'package-identity.cjs']) {
      const dest = path.join(fakeConfigDir, 'gsd-core', 'bin', 'lib', lib);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(ROOT, 'gsd-core', 'bin', 'lib', lib), dest);
    }

    const installedCli = path.join(fakeConfigDir, 'gsd-core', 'scripts', 'changeset', 'cli.cjs');
    const out = runExtract(installedCli, changelogPath);
    assert.match(out, /1\.7\.3/, 'installed-layout extract must include the 1.7.3 release');
    assert.match(out, /Prune emptied legacy runtime dir/, 'installed-layout extract must include the entry body');
  });

  test("installer payload list covers every parent-dir require of the shipped changeset files", () => {
    // Structural guard: if someone adds a new ../ require to the changeset
    // tooling without extending the installer's changesetPayload, the installed
    // copy would crash with MODULE_NOT_FOUND again. Assert install.js lists
    // every file the tooling needs.
    const installSrc = fs.readFileSync(path.join(ROOT, 'bin', 'install.js'), 'utf8');
    for (const rel of [
      'scripts/changeset/cli.cjs',
      'scripts/changeset/parse.cjs',
      'scripts/changeset/render.cjs',
      'scripts/changeset/serialize.cjs',
      'scripts/changeset/github-release-notes.cjs',
      'scripts/lib/cli-exit.cjs',
    ]) {
      assert.ok(installSrc.includes(`'${rel}'`), `bin/install.js changesetPayload must list '${rel}'`);
    }
  });
});
