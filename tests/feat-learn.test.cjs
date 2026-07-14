'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { cleanup } = require('./helpers.cjs');

const TOOLS_PATH = path.resolve(__dirname, '..', 'gsd-core', 'bin', 'gsd-tools.cjs');

function runLearn(args, env = {}) {
  const out = execFileSync(process.execPath, [TOOLS_PATH, 'learn', ...args], {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
  });
  return JSON.parse(out.trim());
}

describe('learn catalog', () => {
  test('catalog parses into the ~84-node, 10-track graph', () => {
    const cat = runLearn(['catalog']);
    assert.ok(cat.count >= 80, `expected ~84 nodes, got ${cat.count}`);
    assert.equal(cat.tracks.length, 10, 'ten tracks');
    const ids = cat.nodes.map((n) => n.id);
    assert.ok(ids.includes('test-doubles'), 'test-doubles node present');
    const td = cat.nodes.find((n) => n.id === 'test-doubles');
    assert.equal(td.track, 'Testing');
    assert.match(td.source, /test-doubles\.md/);
    assert.ok(Array.isArray(td.prereqs));
  });

  test('a node resolves with its transitive prereq chain', () => {
    const node = runLearn(['node', 'test-fake-at-ports']);
    assert.equal(node.id, 'test-fake-at-ports');
    assert.ok(node.prereq_chain.includes('test-doubles'));
    assert.ok(node.prereq_chain.includes('arch-hexagonal'));
  });

  test('an unknown node id returns an error shape', () => {
    const node = runLearn(['node', 'no-such-node']);
    assert.match(node.error, /unknown node/);
  });
});

describe('learn progress', () => {
  test('progress round-trips through update then read, tallying the lean', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-learn-'));
    const env = { GSD_LEARN_PROGRESS_DIR: dir };

    let prog = runLearn(['progress-read'], env);
    assert.equal(prog.concepts.length, 0, 'empty by default');

    runLearn(['progress-update', '--id', 'test-doubles', '--status', 'completed', '--lean', 'on-target'], env);
    prog = runLearn(['progress-read'], env);
    const td = prog.concepts.find((c) => c.id === 'test-doubles');
    assert.equal(td.status, 'completed');
    assert.equal(prog.calibration_lean.on_target, 1);

    runLearn(['progress-update', '--id', 'arch-hexagonal', '--status', 'completed', '--lean', 'over'], env);
    prog = runLearn(['progress-read'], env);
    assert.equal(prog.calibration_lean.over, 1);
    assert.equal(prog.concepts.length, 2);

    // The state file is human-readable markdown with a machine JSON block.
    const fileText = fs.readFileSync(path.join(dir, 'LEARNING-PROGRESS.md'), 'utf8');
    assert.match(fileText, /# Learning Progress/);
    assert.match(fileText, /```json/);

    cleanup(dir);
  });

  test('progress-update without --id returns an error shape', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-learn-'));
    const r = runLearn(['progress-update', '--status', 'completed'], { GSD_LEARN_PROGRESS_DIR: dir });
    assert.match(r.error, /--id required/);
    cleanup(dir);
  });
});

describe('learn next', () => {
  test('next suggests a prereq-satisfied, not-completed entry node when nothing is done', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-learn-'));
    const n = runLearn(['next'], { GSD_LEARN_PROGRESS_DIR: dir });
    assert.ok(n.id, 'returns a node id');
    assert.equal(n.prereq_chain.filter(Boolean).length, 0, 'an entry node (no prereqs) comes first');
    cleanup(dir);
  });

  test('next skips completed nodes and respects prereqs', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-learn-'));
    const env = { GSD_LEARN_PROGRESS_DIR: dir };
    const first = runLearn(['next'], env);
    runLearn(['progress-update', '--id', first.id, '--status', 'completed', '--lean', 'on-target'], env);
    const second = runLearn(['next'], env);
    assert.notEqual(second.id, first.id, 'a completed node is not re-suggested');
    cleanup(dir);
  });
});

describe('learn capability dispatch (Rocket capability pack, issue #25)', () => {
  // The `learn` family is registered by capabilities/rocket-learn/capability.json
  // and dispatched via the ADR-959 capability path (default →
  // dispatchCapabilityCommand → learn-command-router.cjs) — no hardcoded
  // `case 'learn'` remains in gsd-tools.cjs. These pin the error-path
  // equivalence with the old inline case arm.

  function runLearnErr(args, env = {}) {
    try {
      execFileSync(process.execPath, [TOOLS_PATH, 'learn', ...args], {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...env },
      });
      assert.fail(`expected non-zero exit for: learn ${args.join(' ')}`);
    } catch (err) {
      if (err.code === 'ERR_ASSERTION') throw err;
      return { status: err.status, stderr: err.stderr ? err.stderr.toString() : '' };
    }
  }

  test('the learn family is owned by rocket-learn in the capability registry', () => {
    const registry = require(path.resolve(__dirname, '..', 'gsd-core', 'bin', 'lib', 'capability-registry.cjs'));
    assert.equal(registry.commandFamilies.learn.capId, 'rocket-learn');
    assert.equal(registry.commandFamilies.learn.module, 'learn-command-router.cjs');
    assert.equal(registry.commandFamilies.learn.router, 'routeLearnCommand');
  });

  test('an unknown learn verb exits 1 with the exact legacy message and sdk_unknown_command reason', () => {
    const r = runLearnErr(['bogus-verb'], { GSD_JSON_ERRORS: '1' });
    assert.equal(r.status, 1);
    const parsed = JSON.parse(r.stderr);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.reason, 'sdk_unknown_command');
    assert.equal(parsed.message, 'Unknown learn subcommand. Available: catalog, node, progress-read, progress-update, next');
  });

  test('learn node without an id exits 1 with the legacy usage message and reason', () => {
    const r = runLearnErr(['node'], { GSD_JSON_ERRORS: '1' });
    assert.equal(r.status, 1);
    const parsed = JSON.parse(r.stderr);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.reason, 'usage');
    assert.equal(parsed.message, 'learn node requires a node id');
  });
});
