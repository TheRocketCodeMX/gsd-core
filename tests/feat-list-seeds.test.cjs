'use strict';

/**
 * `gsd-tools list-seeds` — read-only browse/audit of .planning/seeds/SEED-*.md
 * (adapted from upstream open-gsd, #441). Lists seeds of every status with the
 * richer fields the list-seeds workflow renders; optional status filter; reuses
 * audit.cts's requireSafePath + sanitizeForDisplay so untrusted seed content
 * can't crash or poison the list.
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runGsdTools, createTempProject, cleanup } = require('./helpers.cjs');

function seed(tmpDir, file, body) {
  const dir = path.join(tmpDir, '.planning', 'seeds');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), body);
}

const SEED_1 = `---
id: SEED-001
status: dormant
planted: 2026-06-01
trigger_when: when websockets land
scope: large
title: Real-time collaboration
---
# Real-time collaboration
`;
const SEED_6 = `---
id: SEED-006
status: triggered
planted: 2026-06-10
trigger_when: MILE-04 planning
scope: medium
title: Remove legacy auth crates
---
`;

describe('list-seeds', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = createTempProject(); });
  afterEach(() => { cleanup(tmpDir); });

  test('no seeds dir → count 0 (not an error)', () => {
    const r = runGsdTools('list-seeds', tmpDir);
    assert.ok(r.success, `failed: ${r.error}`);
    const o = JSON.parse(r.output);
    assert.strictEqual(o.count, 0);
    assert.deepStrictEqual(o.seeds, []);
    assert.deepStrictEqual(o.summary, {});
  });

  test('lists all seeds sorted by id, with rich fields + per-status summary', () => {
    seed(tmpDir, 'SEED-006-legacy-auth.md', SEED_6);
    seed(tmpDir, 'SEED-001-realtime.md', SEED_1);
    const o = JSON.parse(runGsdTools('list-seeds', tmpDir).output);
    assert.strictEqual(o.count, 2);
    assert.deepStrictEqual(o.seeds.map((s) => s.seed_id), ['SEED-001', 'SEED-006'], 'sorted by id');
    assert.strictEqual(o.seeds[0].scope, 'large');
    assert.strictEqual(o.seeds[0].trigger_when, 'when websockets land');
    assert.strictEqual(o.seeds[0].title, 'Real-time collaboration');
    assert.deepStrictEqual(o.summary, { dormant: 1, triggered: 1 });
  });

  test('status filter narrows the set', () => {
    seed(tmpDir, 'SEED-001-realtime.md', SEED_1);
    seed(tmpDir, 'SEED-006-legacy-auth.md', SEED_6);
    const o = JSON.parse(runGsdTools('list-seeds triggered', tmpDir).output);
    assert.strictEqual(o.count, 1);
    assert.strictEqual(o.seeds[0].seed_id, 'SEED-006');
  });

  test('title falls back to the first heading when frontmatter title is absent', () => {
    seed(tmpDir, 'SEED-002-no-title.md', '---\nid: SEED-002\nstatus: active\n---\n# Heading-derived title\n');
    const o = JSON.parse(runGsdTools('list-seeds', tmpDir).output);
    assert.strictEqual(o.seeds[0].title, 'Heading-derived title');
  });

  test('a malformed seed (non-string / missing frontmatter) does not crash the audit', () => {
    seed(tmpDir, 'SEED-003-weird.md', '---\nid: SEED-003\nstatus:\ntitle: [a, b]\n---\nbody\n');
    const r = runGsdTools('list-seeds', tmpDir);
    assert.ok(r.success, `must not crash on malformed seed: ${r.error}`);
    const o = JSON.parse(r.output);
    assert.strictEqual(o.count, 1);
    assert.strictEqual(o.seeds[0].status, 'dormant', 'empty status defaults to dormant');
    // title was a non-scalar array → coerced to empty string, then heading fallback (none) → ''
    assert.strictEqual(typeof o.seeds[0].title, 'string');
  });

  test('non-SEED files in the dir are ignored', () => {
    seed(tmpDir, 'SEED-001-realtime.md', SEED_1);
    seed(tmpDir, 'README.md', '# not a seed');
    const o = JSON.parse(runGsdTools('list-seeds', tmpDir).output);
    assert.strictEqual(o.count, 1);
  });
});
