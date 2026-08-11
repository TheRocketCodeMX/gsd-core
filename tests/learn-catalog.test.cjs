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

// ─── e2e-7 F7 — the catalog's own build-failure claim was not enforced ────────
// learn-catalog.md:5 states: "A node whose `source` doesn't resolve to a real
// reference section is a build failure (tests/learn-catalog-*.test.cjs), not a
// silent gap." Only the FILE half was checked; the `§ Section` half was not, and a
// mechanical sweep found 3 of 89 nodes pointing at headings that do not exist
// (`tdd.md § When to Use TDD`, `architecture-decision.md § The meta-tell` — bold
// inline text, not a heading — and `ai-test-quality.md § A–F`, a range shorthand).
//
// Source-cell grammar (parsed here, not guessed): each backticked span is either
// `file.md § Section` or a continuation `§ Section` inheriting the previous file, or
// a bare `file.md` with no anchor. A trailing parenthetical qualifier lives OUTSIDE
// the backticks — `` `test-strategy.md § Core principles` (#3) `` points at the
// heading plus an in-section pointer, so the heading is what must resolve.
describe('learn-catalog anchors resolve to real headings', () => {
  const CATALOG = path.join(REFS, 'learn-catalog.md');

  function headingsOf(file) {
    const p = path.join(REFS, file);
    if (!fs.existsSync(p)) return null;
    return [...fs.readFileSync(p, 'utf8').matchAll(/^#{1,6}\s+(.+?)\s*$/gm)]
      .map((m) => m[1].trim().toLowerCase());
  }

  test('every `§ Section` in the catalog resolves to a heading in its source file', () => {
    const md = fs.readFileSync(CATALOG, 'utf8');
    const rows = md.split(/\r?\n/).filter((l) => /^\|\s*`[a-z0-9-]+`\s*\|/.test(l));
    assert.ok(rows.length >= 80, `catalog table parsed only ${rows.length} rows — format drifted?`);

    const headCache = new Map();
    const unresolved = [];
    let anchorsChecked = 0;

    for (const row of rows) {
      const cells = row.split('|').map((c) => c.trim());
      const id = cells[1].replace(/`/g, '');
      const spans = [...cells[3].matchAll(/`([^`]+)`/g)].map((m) => m[1]);
      let currentFile = null;

      for (const span of spans) {
        const sectionIdx = span.indexOf('§');
        if (sectionIdx === -1) {
          if (/\.md$/.test(span.trim())) currentFile = span.trim();
          continue;
        }
        const filePart = span.slice(0, sectionIdx).trim();
        if (filePart) currentFile = filePart;
        if (!currentFile) {
          unresolved.push(`${id}: "${span}" has no source file`);
          continue;
        }
        if (!headCache.has(currentFile)) headCache.set(currentFile, headingsOf(currentFile));
        const headings = headCache.get(currentFile);
        if (headings === null) {
          unresolved.push(`${id}: source file ${currentFile} does not exist`);
          continue;
        }
        for (const section of span.slice(sectionIdx).split('§').map((x) => x.trim()).filter(Boolean)) {
          anchorsChecked++;
          const needle = section.toLowerCase();
          // Exact heading, or a heading that STARTS with the cited text (headings
          // routinely carry an em-dash subtitle: `## Axis A — domain logic`).
          if (!headings.some((h) => h === needle || h.startsWith(needle))) {
            unresolved.push(`${id}: ${currentFile} § ${section}`);
          }
        }
      }
    }

    assert.ok(anchorsChecked >= 80, `only ${anchorsChecked} anchors checked — the parser is broken, not the catalog`);
    assert.deepStrictEqual(
      unresolved,
      [],
      'learn-catalog.md claims an unresolvable source is a BUILD FAILURE. These do not resolve — ' +
        'fix the citation, or add the heading to the reference:\n' + unresolved.join('\n'),
    );
  });
});
