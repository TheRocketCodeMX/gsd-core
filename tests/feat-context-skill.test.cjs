'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

describe('gsd-context skill registration + workflow contract', () => {
  test('workflow exists with the four modes and the seed-quality contract', () => {
    const wf = read('gsd-core/workflows/context.md');
    for (const mode of ['seed', 'scout', 'flush', 'master']) assert.ok(wf.includes(`## Mode: ${mode}`), `mode ${mode} missing`);
    assert.match(wf, /quality:\s*rich \| artifact-distilled \| thin/, 'quality stamping contract');
    assert.match(wf, /never delegate capsule writing to fresh-context agents/i, 'orchestrator-writes-itself rule');
    assert.match(wf, /context verify/, 'seed must verify its own output');
    assert.match(wf, /## Seed refresh/, 'idempotent re-seed appends a layer, never clobbers');
  });
  test('command file + registration surfaces', () => {
    assert.ok(fs.existsSync(path.resolve(__dirname, '..', 'commands/gsd/context.md')));
    assert.match(read('commands/gsd/ns-project.md'), /gsd-context/);
    assert.match(read('gsd-core/workflows/help/modes/full.md'), /context/);
  });
});
