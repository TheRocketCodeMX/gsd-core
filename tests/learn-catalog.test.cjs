'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const REFS = path.join(ROOT, 'gsd-core', 'references');
const learn = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'learn.cjs'));

describe('learn-catalog integrity', () => {
  const { nodes } = learn.parseCatalog();
  const ids = new Set(nodes.map((n) => n.id));

  test('no duplicate node ids', () => {
    assert.equal(ids.size, nodes.length, 'duplicate id in catalog');
  });

  test('every Source reference file exists', () => {
    for (const n of nodes) {
      const file = n.source.split('§')[0].trim();
      assert.ok(
        fs.existsSync(path.join(REFS, file)),
        `node ${n.id}: source file ${file} missing`,
      );
    }
  });

  test('every Prereq id resolves to a node', () => {
    for (const n of nodes) {
      for (const p of n.prereqs) {
        assert.ok(ids.has(p), `node ${n.id}: prereq "${p}" is not a catalog node`);
      }
    }
  });

  test('prereq graph is acyclic', () => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;
    const color = new Map(nodes.map((n) => [n.id, WHITE]));
    const visit = (id, stack) => {
      color.set(id, GRAY);
      for (const p of byId.get(id)?.prereqs || []) {
        if (color.get(p) === GRAY) {
          assert.fail(`cycle: ${[...stack, id, p].join(' -> ')}`);
        }
        if (color.get(p) === WHITE) visit(p, [...stack, id]);
      }
      color.set(id, BLACK);
    };
    for (const n of nodes) if (color.get(n.id) === WHITE) visit(n.id, []);
  });
});
