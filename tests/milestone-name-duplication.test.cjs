'use strict';

/**
 * milestone-name-duplication.test.cjs — MILESTONES.md and the requirements
 * archive header must not render the version twice (e2e-10 F7).
 *
 * `milestoneName = options.name || version`, then the human-read headers
 * interpolated `${version} ${milestoneName}`. The documented complete-milestone
 * invocation passes no --name, so the default path rendered:
 *
 *   ## v1.0 v1.0 (Shipped: …)
 *   # Requirements Archive: v1.0 v1.0
 *
 * FIX (src/milestone.cts): only append a name suffix when a distinct --name was
 * supplied. NOTE: this test exercises the COMPILED bin/lib/milestone.cjs via the
 * gsd-tools CLI, so it is RED until `npm run build:lib` recompiles the fix.
 */

process.env.GSD_TEST_MODE = '1';

const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createTempProject, cleanup, runGsdTools } = require('./helpers.cjs');

function seedProject(tmpDir) {
  fs.writeFileSync(
    path.join(tmpDir, '.planning', 'ROADMAP.md'),
    '# Roadmap\n\n### Phase 1: Foundation\n**Goal:** Setup\n',
  );
  fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '01-foundation'), { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, '.planning', 'REQUIREMENTS.md'),
    '# Requirements\n\n- R1: a requirement\n',
  );
}

describe('e2e-10 F7: milestone complete does not duplicate the version', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = createTempProject(); });
  afterEach(() => { cleanup(tmpDir); });

  test('no --name: MILESTONES.md header is "## v1.0", not "## v1.0 v1.0"', () => {
    seedProject(tmpDir);
    const result = runGsdTools(['milestone.complete', 'v1.0'], tmpDir);
    assert.ok(result.success, `milestone.complete failed: ${result.error}`);

    const milestones = fs.readFileSync(path.join(tmpDir, '.planning', 'MILESTONES.md'), 'utf-8');
    assert.ok(!milestones.includes('v1.0 v1.0'), `MILESTONES.md duplicates the version: ${milestones}`);
    assert.match(milestones, /^## v1\.0 \(Shipped: /m, 'header must read "## v1.0 (Shipped: …)"');
  });

  test('no --name: requirements archive header is "# Requirements Archive: v1.0", not doubled', () => {
    seedProject(tmpDir);
    const result = runGsdTools(['milestone.complete', 'v1.0'], tmpDir);
    assert.ok(result.success, `milestone.complete failed: ${result.error}`);

    const archived = fs.readFileSync(
      path.join(tmpDir, '.planning', 'milestones', 'v1.0-REQUIREMENTS.md'),
      'utf-8',
    );
    assert.ok(!archived.includes('v1.0 v1.0'), `archive header duplicates the version: ${archived.split(/\r?\n/)[0]}`);
    assert.match(archived, /^# Requirements Archive: v1\.0\n/, 'header must read "# Requirements Archive: v1.0"');
  });

  test('with a distinct --name: the name IS appended once', () => {
    seedProject(tmpDir);
    const result = runGsdTools(['milestone.complete', 'v1.0', '--name', 'Foundation'], tmpDir);
    assert.ok(result.success, `milestone.complete failed: ${result.error}`);

    const milestones = fs.readFileSync(path.join(tmpDir, '.planning', 'MILESTONES.md'), 'utf-8');
    assert.match(milestones, /^## v1\.0 Foundation \(Shipped: /m, 'a distinct name is appended exactly once');
    assert.ok(!milestones.includes('v1.0 v1.0'));
  });
});
