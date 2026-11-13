'use strict';

/**
 * Fork gsd-tools invocations under upstream's strict argument parsing (align-1.21.0).
 *
 * Upstream v1.21.0 (#6087/#6100) made every verb declared in src/cli-surface.cts reject a
 * stray word or an undeclared flag with a usage error. The fork's own commands and
 * workflows call those verbs, and the fork's capability families (context, grounding,
 * learn, project/strategy) plus the fork-extended `windows` ledger parse their own
 * flags. This file runs every flag shape a fork workflow, command, reference, hook or
 * capability manifest passes, against a real fixture project, and fails when one is
 * refused as a usage error that names a token we passed. A sentinel row proves the
 * detector sees a real rejection.
 *
 * Coverage registration (T-C1 of cli-surface-parity) lives in FORK_UNDECLARED_VERBS.
 */

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { runGsdTools, createTempGitProject, createTempDir, cleanup } = require('./helpers.cjs');
const { FORK_UNDECLARED_VERBS, verbUniverse, isCovered } = require('../gsd-core/bin/lib/cli-surface.cjs');
const { ERROR_REASON } = require('../gsd-core/bin/lib/io.cjs');

const SENTINEL = '--zz-fork-undeclared-flag';

function lastJson(text) {
  const lines = String(text || '').split('\n').filter((l) => l.trim().startsWith('{'));
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      return JSON.parse(lines[i]);
    } catch {
      // keep scanning
    }
  }
  return null;
}

/** The usage rejection naming one of `tokens`, or null when the parser accepted the argv. */
function usageRejection(result, tokens) {
  const body = lastJson(result.error) ?? lastJson(result.output);
  const text = `${result.error || ''}\n${result.output || ''}`;
  const isUsage = (body && body.ok === false && body.reason === ERROR_REASON.USAGE)
    || /unknown flag|unexpected positional|Unknown flag for/i.test(text);
  if (!isUsage) return null;
  const message = body && body.message ? String(body.message) : text;
  const named = tokens.find((t) => message.includes(t));
  return named ? message : null;
}

describe('fork gsd-tools invocations survive strict argument parsing', () => {
  let project;
  let home;
  let env;

  before(() => {
    project = createTempGitProject('gsd-fork-verbs-');
    home = createTempDir('gsd-fork-verbs-home-');
    env = { HOME: home, USERPROFILE: home, GSD_LEARN_PROGRESS_DIR: path.join(home, 'learn') };
    const planning = path.join(project, '.planning');
    fs.mkdirSync(path.join(planning, 'phases', '01-foundation'), { recursive: true });
    fs.writeFileSync(path.join(planning, 'PROJECT.md'), [
      '# Project', '', '## Strategy Plan', '',
      '| Step | Status | Why |', '|---|---|---|',
      '| testing-strategy | pending | default |', '| security-strategy | pending | default |', '',
    ].join('\n'));
    fs.writeFileSync(path.join(planning, 'ROADMAP.md'), [
      '# Roadmap', '', '## v1.0 Milestone', '', '### Phase 1: Foundation', '', '**Goal:** start', '',
    ].join('\n'));
    fs.writeFileSync(path.join(planning, 'phases', '01-foundation', '01-CONTEXT.md'), '# Context\n');
    fs.writeFileSync(path.join(planning, 'phases', '01-foundation', '01-UAT.md'), [
      '---', 'status: testing', 'phase: 01-foundation', '---', '', '# UAT', '',
    ].join('\n'));
  });

  after(() => {
    cleanup(project);
    cleanup(home);
  });

  // Every row is a flag shape a fork-owned file passes (file named in the comment).
  const ROWS = [
    // capabilities/context + workflows/context.md, resume-project.md, execute-phase.md
    ['context', 'verify', '--phase', '1'],
    ['context', 'verify', '--milestone'],
    ['context', 'verify', '--file', '.planning/phases/01-foundation/01-CONTEXT.md'],
    ['context', 'provenance', '--file', '.planning/phases/01-foundation/01-CONTEXT.md'],
    // capabilities/grounding + workflows/plan-phase.md
    ['grounding', 'required'],
    ['query', 'grounding', 'required', '--raw'],
    // capabilities/learn + workflows/learn.md
    ['learn', 'catalog'],
    ['learn', 'next'],
    ['learn', 'progress-read'],
    ['learn', 'node', 'ddd'],
    ['learn', 'progress-update', '--id', 'fork-verbs-node', '--status', 'completed', '--lean', 'balanced'],
    // capabilities/strategy + the strategy-chain workflows, smart-entry.md, roadmap.md, legacy-inventory.md
    ['query', 'project', 'mode', '--raw'],
    ['query', 'project', 'strategy-plan', '--raw'],
    ['query', 'project', 'strategy-plan', '--pick', 'found'],
    ['query', 'project.strategy-plan', '--raw'],
    ['query', 'project', 'strategy-skipped', 'security-strategy'],
    ['query', 'project', 'strategy-done', 'testing-strategy'],
    // workflows/ship.md + capabilities/broken-windows (fork amend / reconcile subcommands)
    ['windows', 'status', '--raw'],
    ['windows', 'reconcile'],
    ['windows', 'amend', 'W-001', '--description', 're-worded entry'],
    // upstream verbs fork workflows call with fork-chosen flags
    ['query', 'uat.complete-session', '.planning/phases/01-foundation/01-UAT.md', '--message', 'test(01): complete UAT'],
    ['query', 'frontmatter', 'get', '.planning/phases/01-foundation/01-UAT.md', '--field', 'status'],
    ['query', 'roadmap.analyze', '--pick', 'next_phase'],
    ['query', 'state', 'record-session', '--stopped-at', 'fork verbs row'],
    ['query', 'config-get', 'context_lifecycle.enabled', '--raw', '--default', 'true'],
    ['query', 'agent-skills', 'gsd-roadmapper'],
    ['query', 'resolve-model', 'gsd-roadmapper', '--raw'],
    ['query', 'init.phase-op', '1'],
    // hooks/gsd-grounding-index-refresh.js spawns this exact argv
    ['query', 'generate-claude-md', '--auto', '--cwd', '.'],
  ];

  for (const argv of ROWS) {
    test(`accepted: gsd-tools ${argv.join(' ')}`, () => {
      const r = runGsdTools(['--json-errors', ...argv], project, env);
      const passed = argv.filter((t) => t !== 'query');
      const rejected = usageRejection(r, passed);
      assert.equal(rejected, null, `strict parsing refused a fork flag shape: ${rejected}`);
    });
  }

  test('workstream-scoped fork verbs accept --ws', () => {
    for (const argv of [
      ['query', 'project', 'strategy-plan', '--raw', '--ws', 'notif'],
      ['query', 'roadmap.analyze', '--ws=notif', '--pick', 'next_phase'],
    ]) {
      const r = runGsdTools(['--json-errors', ...argv], project, env);
      assert.equal(usageRejection(r, ['--ws', '--ws=notif', '--pick', 'strategy-plan']), null, argv.join(' '));
    }
  });

  test('positive control: a declared verb rejects an undeclared flag, naming it', () => {
    const r = runGsdTools(['--json-errors', 'query', 'frontmatter', 'get', '.planning/PROJECT.md', SENTINEL], project, env);
    assert.ok(usageRejection(r, [SENTINEL]), `the detector must see a real rejection: ${r.error || r.output}`);
  });

  test('every fork capability family is covered by the CLI surface registry', () => {
    const universe = new Set(verbUniverse());
    for (const verb of FORK_UNDECLARED_VERBS) {
      assert.ok(universe.has(verb), `${verb} is registered but not dispatchable`);
      assert.ok(isCovered(verb), `${verb} not covered`);
    }
  });
});
