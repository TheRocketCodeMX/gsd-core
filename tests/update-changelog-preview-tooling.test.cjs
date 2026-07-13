// allow-test-rule: integration-test-input — see #935
/**
 * The /gsd:update workflow's "What's New" preview calls
 *   <configDir>/scripts/changeset/cli.cjs extract ...
 * The fork originally shipped this tooling itself (at gsd-core/scripts/changeset/,
 * with a dual-layout require fallback) because upstream referenced the path but
 * never shipped the files. Upstream has since absorbed the fix (#935/#938):
 * bin/install.js copies scripts/changeset/ and scripts/lib/ into
 * <configDir>/scripts/ — a SIBLING of gsd-core/ — so the tooling's repo-relative
 * requires ('../../gsd-core/bin/lib/X', '../lib/cli-exit.cjs') resolve
 * identically in both layouts. These tests pin that property: they run the real
 * cli.cjs from the repo tree AND from a faithful copy of the installed layout
 * against a fixture changelog (test-input reads, not source-grep).
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

  test('installed layout: cli.cjs works at <configDir>/scripts/changeset/ exactly as the installer ships it', () => {
    // Mirror bin/install.js: scripts/changeset/ and scripts/lib/ are copied into
    // <configDir>/scripts/ as a SIBLING of gsd-core/, so cli.cjs's
    // '../../gsd-core/bin/lib/X' and '../lib/cli-exit.cjs' requires resolve
    // exactly as they do in the repo tree.
    const fakeConfigDir = path.join(tmpRoot, 'fake-runtime');
    // scripts/changeset/ — the installer copies every file in the directory.
    const changesetSrc = path.join(ROOT, 'scripts', 'changeset');
    for (const entry of fs.readdirSync(changesetSrc)) {
      const srcFile = path.join(changesetSrc, entry);
      if (!fs.statSync(srcFile).isFile()) continue;
      const dest = path.join(fakeConfigDir, 'scripts', 'changeset', entry);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(srcFile, dest);
    }
    // scripts/lib/ — cli-exit.cjs is required by cli.cjs via '../lib/cli-exit.cjs'.
    const scriptsLibSrc = path.join(ROOT, 'scripts', 'lib');
    for (const entry of fs.readdirSync(scriptsLibSrc)) {
      const srcFile = path.join(scriptsLibSrc, entry);
      if (!fs.statSync(srcFile).isFile()) continue;
      const dest = path.join(fakeConfigDir, 'scripts', 'lib', entry);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(srcFile, dest);
    }
    // The runtime payload also contains gsd-core/bin/lib (copied wholesale by the
    // installer); the cli needs these two self-contained modules from it.
    for (const lib of ['semver-compare.cjs', 'package-identity.cjs']) {
      const dest = path.join(fakeConfigDir, 'gsd-core', 'bin', 'lib', lib);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(ROOT, 'gsd-core', 'bin', 'lib', lib), dest);
    }

    const installedCli = path.join(fakeConfigDir, 'scripts', 'changeset', 'cli.cjs');
    const out = runExtract(installedCli, changelogPath);
    assert.match(out, /1\.7\.3/, 'installed-layout extract must include the 1.7.3 release');
    assert.match(out, /Prune emptied legacy runtime dir/, 'installed-layout extract must include the entry body');
  });

  test('installer still ships the changeset tooling and its scripts/lib dependency', () => {
    // Structural guard: if the install.js changeset-payload block is dropped in
    // an upstream merge, the installed copy would regress to the original
    // silent "(Could not extract changelog)" failure (#935). Assert the copy
    // block and its hard-failure verification are still present.
    const installSrc = fs.readFileSync(path.join(ROOT, 'bin', 'install.js'), 'utf8');
    assert.ok(
      /path\.join\(src, 'scripts', 'changeset'\)/.test(installSrc),
      'bin/install.js must copy scripts/changeset/ into the runtime config dir'
    );
    assert.ok(
      /path\.join\(src, 'scripts', 'lib'\)/.test(installSrc),
      "bin/install.js must copy scripts/lib/ (cli.cjs requires '../lib/cli-exit.cjs')"
    );
    assert.ok(
      installSrc.includes("'scripts/changeset/cli.cjs'"),
      'bin/install.js must verify scripts/changeset/cli.cjs landed (hard failure, not silent degrade)'
    );
    assert.ok(
      installSrc.includes("'scripts/lib/cli-exit.cjs'"),
      'bin/install.js must verify scripts/lib/cli-exit.cjs landed (hard failure, not silent degrade)'
    );
  });
});
