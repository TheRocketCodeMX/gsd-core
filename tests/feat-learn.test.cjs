'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

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

    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('progress-update without --id returns an error shape', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-learn-'));
    const r = runLearn(['progress-update', '--status', 'completed'], { GSD_LEARN_PROGRESS_DIR: dir });
    assert.match(r.error, /--id required/);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('learn next', () => {
  test('next suggests a prereq-satisfied, not-completed entry node when nothing is done', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-learn-'));
    const n = runLearn(['next'], { GSD_LEARN_PROGRESS_DIR: dir });
    assert.ok(n.id, 'returns a node id');
    assert.equal(n.prereq_chain.filter(Boolean).length, 0, 'an entry node (no prereqs) comes first');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('next skips completed nodes and respects prereqs', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-learn-'));
    const env = { GSD_LEARN_PROGRESS_DIR: dir };
    const first = runLearn(['next'], env);
    runLearn(['progress-update', '--id', first.id, '--status', 'completed', '--lean', 'on-target'], env);
    const second = runLearn(['next'], env);
    assert.notEqual(second.id, first.id, 'a completed node is not re-suggested');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
