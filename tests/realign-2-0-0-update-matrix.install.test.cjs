// allow-test-rule: integration-test-input #13
// realign-2-0-0-update-matrix.install.test.cjs — Epic #13 (v2.0.0 upstream
// realignment) Phase 5: the update fixture matrix.
//
// THE RISK: a real user sits on fork v1.14.0 (installed by the REAL v1.14.0
// installer, built from the git tag in this repo). They update to this tree's
// installer, which inherits upstream's installer-migrations (000–004) and
// install-surface changes that were never exercised against fork-created
// installs. Feared surfaces:
//   - migration 003 (get-shit-done → gsd-core rename) must no-op for fork users // gsd-allow-legacy-name (matrix tests legacy-path migration)
//     (the fork already used gsd-core/ at 1.14.0),
//   - migration 004 (stale-pristine-snapshot prune) must not misclassify
//     fork-managed files,
//   - legacy hooks JSON rewrites against fork-written settings hooks,
//   - upstream #1367 flat command layout on project-local installs — the old
//     .claude/commands/gsd/<cmd>.md subdir (which v1.14.0 really writes) must be
//     cleaned so no orphan /gsd:<cmd> colon stubs survive,
//   - .planning/ user artifacts and project CLAUDE.md must be byte-identical,
//   - uninstall on the updated install must remove ALL GSD surface (hook files,
//     settings/settings.local.json entries, skills, agents, gsd-core/).
//
// Hermetic by construction: the v1.14.0 package is built from the local git tag
// (git archive → tsc via the repo's node_modules → build-hooks → npm pack) and
// installed with `npm install -g --prefix <tmp> --offline` from the local
// tarball (`--omit=optional` skips the registry-only optionalDependency), so no
// network is touched. The suite skips itself when the v1.14.0 tag is not
// reachable (e.g. shallow CI clones).

'use strict';

process.env.GSD_TEST_MODE = '1';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { cleanup, createTempDir, runNpm, isUsageOutput } = require('./helpers.cjs');
const { HOOKS_TO_COPY } = require('../scripts/build-hooks.js');

const REPO_ROOT = path.resolve(__dirname, '..');
const INSTALL_2 = path.join(REPO_ROOT, 'bin', 'install.js');
const PKG = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8'));

// npm pack / install -g and the tsc build of the 1.14.0 tree can take minutes
// on slow Docker hosts (same ceiling as release-tarball-smoke.install.test.cjs).
const SLOW_HOST_TIMEOUT = 600_000;

const FORK_TAG = 'v1.14.0';
const FORK_PKG_NAME = '@therocketcode/gsd-core';

function tagAvailable() {
  try {
    execFileSync('git', ['rev-parse', '-q', '--verify', `${FORK_TAG}^{commit}`], {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Run an installer entrypoint non-interactively with an isolated HOME.
 * Returns { code, stdout, stderr } — never throws on non-zero exit so tests
 * can assert on the code with the full output in the failure message.
 */
function runInstaller(installPath, args, { cwd, home }) {
  const env = { ...process.env, HOME: home, USERPROFILE: home };
  // The install() main block only runs when GSD_TEST_MODE is unset.
  delete env.GSD_TEST_MODE;
  try {
    const stdout = execFileSync(process.execPath, [installPath, ...args], {
      cwd,
      env,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: SLOW_HOST_TIMEOUT,
    });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return {
      code: err.status ?? 1,
      stdout: err.stdout ? String(err.stdout) : '',
      stderr: err.stderr ? String(err.stderr) : '',
    };
  }
}

/** Recursively hash every file under dir → Map<relPath, sha256>. */
function hashTree(dir) {
  const out = new Map();
  const walk = (d, rel) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, relPath);
      else out.set(relPath, crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex'));
    }
  };
  walk(dir, '');
  return out;
}

function assertTreesIdentical(beforeMap, afterMap, label) {
  assert.deepEqual(
    [...afterMap.keys()].sort(),
    [...beforeMap.keys()].sort(),
    `${label}: file set changed across update`,
  );
  for (const [rel, hash] of beforeMap) {
    assert.equal(afterMap.get(rel), hash, `${label}: ${rel} content changed across update`);
  }
}

/** Seed a realistic .planning/ project the migrations must never touch. */
function seedPlanningProject(projectDir) {
  const planning = path.join(projectDir, '.planning');
  fs.mkdirSync(path.join(planning, 'phases', '01-first'), { recursive: true });
  fs.writeFileSync(
    path.join(planning, 'PROJECT.md'),
    '# Fixture Project\n\nA project created under fork v1.14.0.\n',
  );
  fs.writeFileSync(
    path.join(planning, 'config.json'),
    JSON.stringify({ mode: 'interactive', depth: 'standard', workflow: { grounding_gate: true } }, null, 2) + '\n',
  );
  fs.writeFileSync(
    path.join(planning, 'STATE.md'),
    '# State\n\n## Current Position\n\nPhase: 1 of 1\nStatus: In progress\n',
  );
  fs.writeFileSync(
    path.join(planning, 'ROADMAP.md'),
    '# Roadmap\n\n## Phases\n\n- [ ] Phase 1: First\n',
  );
  fs.writeFileSync(
    path.join(planning, 'phases', '01-first', 'PLAN.md'),
    '# Plan 01\n\n<!-- user artifact — must survive updates byte-identical -->\n',
  );
  // Project CLAUDE.md with GSD-managed sections + user content: the installer
  // must not rewrite it (only `generate-claude-md` may, and only the managed
  // sections).
  fs.writeFileSync(
    path.join(projectDir, 'CLAUDE.md'),
    [
      '<!-- GSD:project-start source:PROJECT.md -->',
      '',
      '## Project',
      '',
      'Fixture Project',
      '<!-- GSD:project-end -->',
      '',
      '# User notes',
      '',
      'Hand-written content that must survive updates.',
      '',
    ].join('\n'),
  );
  return planning;
}

/** Read + parse a JSON file with a labeled assertion on parse failure. */
function readJson(filePath, label) {
  assert.ok(fs.existsSync(filePath), `${label}: ${filePath} must exist`);
  const raw = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    assert.fail(`${label}: ${filePath} is not valid JSON — ${err.message}`);
    return null; // unreachable
  }
}

/** Collect every hook command string registered in a settings object. */
function allHookCommands(settings) {
  const commands = [];
  for (const entries of Object.values(settings.hooks || {})) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (!entry || !Array.isArray(entry.hooks)) continue;
      for (const h of entry.hooks) {
        if (h && typeof h.command === 'string') commands.push(h.command);
      }
    }
  }
  return commands;
}

/** Extract the script path token from a `"runner" "script"` hook command. */
function hookScriptPath(command) {
  const tokens = command.match(/"([^"]+)"|(\S+)/g) || [];
  const last = tokens[tokens.length - 1] || '';
  return last.replace(/^"|"$/g, '');
}

function assertNoBlockedMigrations(result, label) {
  assert.equal(
    result.code,
    0,
    `${label}: installer must exit 0.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  const merged = `${result.stdout}\n${result.stderr}`;
  assert.ok(
    !/blocked/i.test(merged),
    `${label}: migration report must not contain blocked entries on the default path:\n${merged}`,
  );
  assert.ok(
    !/prompt-user/i.test(merged.replace(/auto-resolved[^\n]*/g, '')),
    `${label}: no unresolved prompt-user migration actions allowed on the default path:\n${merged}`,
  );
}

const IS_WINDOWS = process.platform === 'win32';

describe('realign 2.0.0 update matrix — fork v1.14.0 → this tree', () => {
  const runnable = tagAvailable() && !IS_WINDOWS;
  // Windows: the v1.14.0 build step drives the tag tree's POSIX-flavored
  // build scripts and node_modules junctioning; the update surfaces under test
  // (migrations, layouts, hooks JSON) are platform-independent, and the
  // POSIX lanes give full coverage.

  // Fixture state shared by all cells.
  let v1140Dir; // extracted + built v1.14.0 tree
  let npmPrefix; // npm install -g --prefix target for the 1.14.0 tarball
  let install1140; // path to the globally-installed 1.14.0 bin/install.js
  let cellAHome; // Cell A isolated HOME
  let cellAProject; // Cell A seeded project (cwd for the installers)
  let cellAPlanningBefore; // hash map of .planning before the update
  let cellAClaudeMdBefore;
  let cellAUpdateResult;
  let cellBHome;
  let cellBProject;
  let cellBPlanningBefore;
  let cellBClaudeMdBefore;
  let cellBUpdateResult;

  before(async () => {
    if (!runnable) return;

    // ── Build the REAL v1.14.0 package from the git tag ─────────────────────
    v1140Dir = createTempDir('gsd-realign-v1140-');
    const tarPath = path.join(v1140Dir, 'v1140.tar');
    execFileSync('git', ['archive', '--format=tar', '-o', tarPath, FORK_TAG], {
      cwd: REPO_ROOT,
      timeout: SLOW_HOST_TIMEOUT,
    });
    execFileSync('tar', ['-xf', tarPath, '-C', v1140Dir], { timeout: SLOW_HOST_TIMEOUT });
    // eslint-disable-next-line local/no-raw-rmsync-in-tests -- single freshly-written tar file, no dir handle contention
    fs.rmSync(tarPath);

    // The published 1.14.0 artifact was produced by prepublishOnly =
    // build:lib && build:hooks. Reproduce both against the tag tree using this
    // repo's node_modules (junction symlink → no network, works without admin
    // rights on Windows).
    fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(v1140Dir, 'node_modules'), 'junction');
    execFileSync(
      process.execPath,
      [path.join(v1140Dir, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tsconfig.build.json'],
      { cwd: v1140Dir, timeout: SLOW_HOST_TIMEOUT },
    );
    execFileSync(process.execPath, [path.join(v1140Dir, 'scripts', 'build-hooks.js')], {
      cwd: v1140Dir,
      timeout: SLOW_HOST_TIMEOUT,
    });

    // Authentic tarball: npm pack honors the "files" allowlist. --ignore-scripts
    // because prepack (build:lib) already ran above.
    const packDest = path.join(v1140Dir, 'pack');
    fs.mkdirSync(packDest);
    const packOutput = runNpm(
      ['pack', '--ignore-scripts', '--pack-destination', packDest],
      { cwd: v1140Dir, timeout: SLOW_HOST_TIMEOUT },
    );
    const tgzName = packOutput.split(/\r?\n/).filter(Boolean).pop();
    const tarballPath = path.join(packDest, tgzName);
    assert.ok(fs.existsSync(tarballPath), `npm pack must produce ${tarballPath}`);

    // npx-equivalent layout: install the tarball globally into an isolated
    // prefix. --offline + --omit=optional keeps it hermetic (the 1.14.0
    // optionalDependency lives only in the public registry).
    npmPrefix = createTempDir('gsd-realign-prefix-');
    runNpm(
      [
        'install', '-g', '--prefix', npmPrefix,
        '--omit=optional', '--ignore-scripts', '--no-audit', '--no-fund', '--offline',
        tarballPath,
      ],
      { timeout: SLOW_HOST_TIMEOUT },
    );
    install1140 = path.join(npmPrefix, 'lib', 'node_modules', ...FORK_PKG_NAME.split('/'), 'bin', 'install.js');
    assert.ok(fs.existsSync(install1140), `1.14.0 installer must exist at ${install1140}`);

    // ── Cell A: global install → seeded project → 2.0.0 update ──────────────
    cellAHome = createTempDir('gsd-realign-cellA-home-');
    cellAProject = createTempDir('gsd-realign-cellA-proj-');
    const a1140 = runInstaller(install1140, ['--claude', '--global'], {
      cwd: cellAProject,
      home: cellAHome,
    });
    assert.equal(a1140.code, 0, `Cell A precondition: v1.14.0 global install failed.\n${a1140.stdout}\n${a1140.stderr}`);
    assert.equal(
      fs.readFileSync(path.join(cellAHome, '.claude', 'gsd-core', 'VERSION'), 'utf-8').trim(),
      '1.14.0',
      'Cell A precondition: v1.14.0 must be the installed version before the update',
    );

    seedPlanningProject(cellAProject);
    cellAPlanningBefore = hashTree(path.join(cellAProject, '.planning'));
    cellAClaudeMdBefore = fs.readFileSync(path.join(cellAProject, 'CLAUDE.md'), 'utf-8');

    // The update runs with cwd = the user's project so any cwd-scoped
    // migration/cleanup bug would surface against the seeded .planning/.
    cellAUpdateResult = runInstaller(INSTALL_2, ['--claude', '--global'], {
      cwd: cellAProject,
      home: cellAHome,
    });

    // ── Cell B: project-local install → seeded project → 2.0.0 update ───────
    cellBHome = createTempDir('gsd-realign-cellB-home-');
    cellBProject = createTempDir('gsd-realign-cellB-proj-');
    const b1140 = runInstaller(install1140, ['--claude', '--local'], {
      cwd: cellBProject,
      home: cellBHome,
    });
    assert.equal(b1140.code, 0, `Cell B precondition: v1.14.0 local install failed.\n${b1140.stdout}\n${b1140.stderr}`);
    // The whole point of Cell B: v1.14.0 really writes the pre-#1367
    // commands/gsd/<cmd>.md colon-namespace layout.
    const legacyDir = path.join(cellBProject, '.claude', 'commands', 'gsd');
    assert.ok(
      fs.existsSync(legacyDir) && fs.readdirSync(legacyDir).some((f) => f.endsWith('.md')),
      'Cell B precondition: v1.14.0 local install must write the legacy commands/gsd/ subdir',
    );

    seedPlanningProject(cellBProject);
    cellBPlanningBefore = hashTree(path.join(cellBProject, '.planning'));
    cellBClaudeMdBefore = fs.readFileSync(path.join(cellBProject, 'CLAUDE.md'), 'utf-8');

    cellBUpdateResult = runInstaller(INSTALL_2, ['--claude', '--local'], {
      cwd: cellBProject,
      home: cellBHome,
    });
  });

  after(() => {
    cleanup(v1140Dir);
    cleanup(npmPrefix);
    cleanup(cellAHome);
    cleanup(cellAProject);
    cleanup(cellBHome);
    cleanup(cellBProject);
  });

  // ══ Cell A: global install updated in place ═══════════════════════════════

  test('A1: update exits 0 with a sane migration report (no blocked / unresolved prompt-user)', { skip: !runnable }, () => {
    assertNoBlockedMigrations(cellAUpdateResult, 'Cell A');
  });

  test('A2: VERSION marker reflects the updated package version', { skip: !runnable }, () => {
    const version = fs.readFileSync(path.join(cellAHome, '.claude', 'gsd-core', 'VERSION'), 'utf-8').trim();
    assert.equal(version, PKG.version, 'gsd-core/VERSION must be rewritten by the update');
  });

  test('A3: installer-migration ledger records the upstream migrations without failures', { skip: !runnable }, () => {
    const state = readJson(path.join(cellAHome, '.claude', 'gsd-install-state.json'), 'Cell A ledger');
    const ids = (state.appliedMigrations || []).map((m) => m.id);
    // 003 (rename) no-ops for fork users — the fork already used gsd-core/ at
    // 1.14.0 — but must still be recorded as applied.
    assert.ok(
      ids.includes('2026-06-02-rename-get-shit-done-to-gsd-core'),
      `migration 003 must be recorded; got ${JSON.stringify(ids)}`,
    );
    // 004 (stale-pristine prune) is the fork-snapshot misclassification risk:
    // it must complete and be recorded (a misclassification would either block
    // the install — caught in A1 — or delete fork-managed files — caught by A4/A5).
    assert.ok(
      ids.includes('2026-06-09-prune-stale-pristine-get-shit-done'), // gsd-allow-legacy-name (matrix tests legacy-path migration)
      `migration 004 must be recorded; got ${JSON.stringify(ids)}`,
    );
    for (const m of state.appliedMigrations || []) {
      assert.match(m.checksum || '', /^sha256:[0-9a-f]{64}$/, `migration ${m.id} must carry a checksum`);
    }
  });

  test('A4: hooks dir matches the shipped hook set — old fork hooks gone, grounding hook present', { skip: !runnable }, () => {
    const hooksDir = path.join(cellAHome, '.claude', 'hooks');
    const installed = fs.readdirSync(hooksDir).filter((f) => f !== 'lib');
    assert.deepEqual(
      installed.sort(),
      [...HOOKS_TO_COPY].sort(),
      'installed hooks/ must equal HOOKS_TO_COPY exactly (no stale 1.14.0 leftovers, no missing hooks)',
    );
    assert.ok(
      installed.includes('gsd-grounding-index-refresh.js'),
      'the grounding FileChanged hook must ship to classic installs',
    );
  });

  test('A5: settings.json hooks are valid, rewritten to current form, and every command resolves to an installed file', { skip: !runnable }, () => {
    const settings = readJson(path.join(cellAHome, '.claude', 'settings.json'), 'Cell A settings');
    const commands = allHookCommands(settings);
    assert.ok(commands.length >= 8, `expected a full managed hook surface, got ${commands.length} commands`);
    for (const command of commands) {
      if (!command.includes('gsd-')) continue;
      const scriptPath = hookScriptPath(command);
      assert.ok(
        fs.existsSync(scriptPath),
        `settings.json hook command references a missing file: ${command}`,
      );
    }
    // The grounding FileChanged hook must be registered alongside config-reload.
    const fileChanged = settings.hooks && settings.hooks.FileChanged;
    assert.ok(Array.isArray(fileChanged), 'FileChanged hooks must be registered');
    const fcCommands = allHookCommands({ hooks: { FileChanged: fileChanged } });
    assert.ok(
      fcCommands.some((c) => c.includes('gsd-config-reload')),
      'FileChanged must register gsd-config-reload',
    );
    assert.ok(
      fcCommands.some((c) => c.includes('gsd-grounding-index-refresh')),
      'FileChanged must register the grounding index refresh hook',
    );
    // Statusline must survive the update (1.14.0 configured it; update keeps it).
    assert.ok(settings.statusLine && String(settings.statusLine.command || '').includes('gsd-statusline'),
      'statusline configured by 1.14.0 must survive the update');
  });

  test('A6: skills/ exactly matches the 2.0.0 source skill set (stale skills pruned)', { skip: !runnable }, () => {
    const installedSkills = fs.readdirSync(path.join(cellAHome, '.claude', 'skills')).sort();
    const sourceSkills = fs
      .readdirSync(path.join(REPO_ROOT, 'skills'), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    assert.deepEqual(installedSkills, sourceSkills, 'installed skills must mirror the source tree after update');
  });

  test('A7: .planning/ and project CLAUDE.md are byte-identical across the update', { skip: !runnable }, () => {
    assertTreesIdentical(cellAPlanningBefore, hashTree(path.join(cellAProject, '.planning')), 'Cell A .planning');
    assert.equal(
      fs.readFileSync(path.join(cellAProject, 'CLAUDE.md'), 'utf-8'),
      cellAClaudeMdBefore,
      'project CLAUDE.md (managed sections + user notes) must survive the update untouched',
    );
  });

  test('A8: gsd-tools from the updated install renders usage and answers a grounding smoke verb', { skip: !runnable }, () => {
    const tools = path.join(cellAHome, '.claude', 'gsd-core', 'bin', 'gsd-tools.cjs');
    assert.ok(fs.existsSync(tools), 'updated install must ship gsd-core/bin/gsd-tools.cjs');
    // Usage renders (exit 1 by design when no command given).
    let usage = '';
    try {
      execFileSync(process.execPath, [tools], { encoding: 'utf-8', cwd: cellAProject, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      usage = `${err.stdout || ''}${err.stderr || ''}`;
    }
    assert.ok(isUsageOutput(usage), `gsd-tools must render usage; got:\n${usage}`);
    // Smoke verb against the seeded project: grounding resolution (fork pillar).
    const grounding = execFileSync(
      process.execPath,
      [tools, 'query', 'grounding', 'required', '--cwd', cellAProject],
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const parsed = JSON.parse(grounding);
    assert.ok(Array.isArray(parsed.required), 'grounding required must return a required[] source set');
  });

  test('A9: uninstall on the updated install removes the full GSD surface', { skip: !runnable }, () => {
    const result = runInstaller(INSTALL_2, ['--uninstall', '--global', '--claude'], {
      cwd: cellAProject,
      home: cellAHome,
    });
    assert.equal(result.code, 0, `uninstall must exit 0.\n${result.stdout}\n${result.stderr}`);

    const claudeDir = path.join(cellAHome, '.claude');
    // Hook files: nothing GSD-managed may remain (this catches the
    // GSD_UNINSTALL_HOOKS drift that used to leave gsd-check-update-worker.js,
    // gsd-ensure-canonical-path.js, gsd-worktree-path-guard.js and
    // managed-hooks-registry.cjs behind).
    const hooksDir = path.join(claudeDir, 'hooks');
    const leftoverHooks = fs.existsSync(hooksDir) ? fs.readdirSync(hooksDir) : [];
    assert.deepEqual(leftoverHooks, [], `uninstall must remove every installed hook file; left: ${leftoverHooks}`);

    // Settings: zero gsd references (this catches the managed-hook-command set
    // drift that used to leave gsd-worktree-path-guard / gsd-graphify-update
    // registered — the latter pointing at an already-deleted script).
    const settingsRaw = fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf-8');
    assert.ok(!settingsRaw.includes('gsd-'), `settings.json must have no gsd references after uninstall:\n${settingsRaw}`);

    assert.ok(!fs.existsSync(path.join(claudeDir, 'gsd-core')), 'gsd-core/ must be removed');
    assert.ok(!fs.existsSync(path.join(claudeDir, 'gsd-file-manifest.json')), 'file manifest must be removed');
    const leftoverSkills = fs.existsSync(path.join(claudeDir, 'skills'))
      ? fs.readdirSync(path.join(claudeDir, 'skills')).filter((f) => f.startsWith('gsd-'))
      : [];
    assert.deepEqual(leftoverSkills, [], 'no gsd-* skills may survive uninstall');
    const leftoverAgents = fs.existsSync(path.join(claudeDir, 'agents'))
      ? fs.readdirSync(path.join(claudeDir, 'agents')).filter((f) => f.startsWith('gsd-'))
      : [];
    assert.deepEqual(leftoverAgents, [], 'no gsd-* agents may survive uninstall');

    // User project remains untouched by uninstall too.
    assertTreesIdentical(cellAPlanningBefore, hashTree(path.join(cellAProject, '.planning')), 'Cell A .planning post-uninstall');
  });

  // ══ Cell B: project-local install updated in place ════════════════════════

  test('B1: update exits 0 with a sane migration report', { skip: !runnable }, () => {
    assertNoBlockedMigrations(cellBUpdateResult, 'Cell B');
  });

  test('B2: legacy commands/gsd/ subdir is cleaned; flat gsd-<cmd>.md layout installed (#1367)', { skip: !runnable }, () => {
    const commandsDir = path.join(cellBProject, '.claude', 'commands');
    assert.ok(
      !fs.existsSync(path.join(commandsDir, 'gsd')),
      'the pre-#1367 commands/gsd/ subdir must be removed — its presence re-registers /gsd:<cmd> colon stubs',
    );
    const entries = fs.readdirSync(commandsDir, { withFileTypes: true });
    const flat = entries.filter((e) => e.isFile() && e.name.startsWith('gsd-') && e.name.endsWith('.md'));
    assert.ok(flat.length >= 20, `expected >= 20 flat gsd-*.md commands, got ${flat.length}`);
    // No orphan bare-name stubs may survive anywhere under commands/.
    const orphans = entries.filter((e) => !(e.isFile() && e.name.startsWith('gsd-') && e.name.endsWith('.md')));
    assert.deepEqual(
      orphans.map((e) => e.name),
      [],
      'commands/ must contain ONLY flat gsd-*.md files after the update',
    );
  });

  test('B3: VERSION marker and migration ledger updated for the local install', { skip: !runnable }, () => {
    const version = fs.readFileSync(path.join(cellBProject, '.claude', 'gsd-core', 'VERSION'), 'utf-8').trim();
    assert.equal(version, PKG.version);
    const state = readJson(path.join(cellBProject, '.claude', 'gsd-install-state.json'), 'Cell B ledger');
    const ids = (state.appliedMigrations || []).map((m) => m.id);
    assert.ok(ids.includes('2026-06-09-prune-stale-pristine-get-shit-done'), `migration 004 must be recorded; got ${JSON.stringify(ids)}`); // gsd-allow-legacy-name (matrix tests legacy-path migration)
  });

  test('B4: settings.local.json hooks valid, current-form, grounding hook registered', { skip: !runnable }, () => {
    const settings = readJson(path.join(cellBProject, '.claude', 'settings.local.json'), 'Cell B settings');
    const commands = allHookCommands(settings);
    assert.ok(commands.length >= 8, `expected a full managed hook surface, got ${commands.length}`);
    // Local hook commands anchor on "$CLAUDE_PROJECT_DIR" (quoted separately
    // from the path suffix, e.g. `"node" "$CLAUDE_PROJECT_DIR"/.claude/hooks/x.js`).
    // Resolve the hook basename and verify the file exists in the project's
    // .claude/hooks/.
    for (const command of commands) {
      const m = command.match(/hooks[\\/]([A-Za-z0-9._-]+)/);
      if (!m) continue;
      assert.ok(
        fs.existsSync(path.join(cellBProject, '.claude', 'hooks', m[1])),
        `settings.local.json hook references a missing file: ${command}`,
      );
    }
    const fcCommands = allHookCommands({ hooks: { FileChanged: (settings.hooks || {}).FileChanged || [] } });
    assert.ok(
      fcCommands.some((c) => c.includes('gsd-grounding-index-refresh')),
      'FileChanged must register the grounding index refresh hook on local installs',
    );
  });

  test('B5: .planning/ and project CLAUDE.md are byte-identical across the update', { skip: !runnable }, () => {
    assertTreesIdentical(cellBPlanningBefore, hashTree(path.join(cellBProject, '.planning')), 'Cell B .planning');
    assert.equal(
      fs.readFileSync(path.join(cellBProject, 'CLAUDE.md'), 'utf-8'),
      cellBClaudeMdBefore,
      'project CLAUDE.md must survive the local update untouched',
    );
  });

  test('B6: local uninstall removes commands, hooks, and settings.local.json entries', { skip: !runnable }, () => {
    const result = runInstaller(INSTALL_2, ['--uninstall', '--local', '--claude'], {
      cwd: cellBProject,
      home: cellBHome,
    });
    assert.equal(result.code, 0, `local uninstall must exit 0.\n${result.stdout}\n${result.stderr}`);

    const claudeDir = path.join(cellBProject, '.claude');
    const commandsDir = path.join(claudeDir, 'commands');
    const leftoverCommands = fs.existsSync(commandsDir)
      ? fs.readdirSync(commandsDir).filter((f) => f.startsWith('gsd-') || f === 'gsd')
      : [];
    assert.deepEqual(leftoverCommands, [], 'no gsd command files may survive local uninstall');

    const hooksDir = path.join(claudeDir, 'hooks');
    const leftoverHooks = fs.existsSync(hooksDir) ? fs.readdirSync(hooksDir) : [];
    assert.deepEqual(leftoverHooks, [], `local uninstall must remove every hook file; left: ${leftoverHooks}`);

    // settings.local.json is where #338 puts local hooks — it must be cleaned
    // too (uninstall used to scrub only settings.json, leaving every managed
    // hook dangling).
    const localSettingsPath = path.join(claudeDir, 'settings.local.json');
    if (fs.existsSync(localSettingsPath)) {
      const raw = fs.readFileSync(localSettingsPath, 'utf-8');
      assert.ok(!raw.includes('gsd-'), `settings.local.json must have no gsd references after uninstall:\n${raw}`);
    }

    assert.ok(!fs.existsSync(path.join(claudeDir, 'gsd-core')), 'gsd-core/ must be removed');
    assertTreesIdentical(cellBPlanningBefore, hashTree(path.join(cellBProject, '.planning')), 'Cell B .planning post-uninstall');
  });
});
