'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { cleanup } = require('./helpers.cjs');
const ctx = require(path.resolve(__dirname, '..', 'gsd-core', 'bin', 'lib', 'context.cjs'));

const CAPSULE = `---
phase: 7
context_provenance:
  author: orchestrator
  date: 2026-07-18
  quality: rich
  note: "seeded at full context"
---

# Phase 7 Context Capsule

## Verified Facts

- The router registers five verbs [anchor: src/app.js:12 "five verbs"]
- External system claim [anchor: ext:orbit/src/x.ts "queue"]
- Gone claim [anchor: src/app.js "hexagonal moon base"]
- Missing file claim [anchor: src/nope.js "anything"]

## Locked Decisions

- Not scanned here [anchor: src/app.js "never checked"]
`;

describe('context core', () => {
  test('parses context_provenance frontmatter', () => {
    const p = ctx.parseContextProvenance(CAPSULE);
    assert.equal(p.quality, 'rich');
    assert.equal(p.author, 'orchestrator');
    assert.equal(p.date, '2026-07-18');
  });
  test('returns null when no provenance (plain discuss-phase CONTEXT)', () => {
    assert.equal(ctx.parseContextProvenance('# Phase 3 Context\n\nplain'), null);
  });
  test('extracts anchors only from Verified Facts sections', () => {
    const a = ctx.extractAnchors(CAPSULE);
    assert.equal(a.length, 4);
    assert.deepEqual(a.map((x) => x.path), ['src/app.js', 'ext:orbit/src/x.ts', 'src/app.js', 'src/nope.js']);
    assert.equal(a[0].line, 12);
    assert.equal(a[2].line, null);
  });
  test('verifyContextFile classifies ok/external/stale/missing and annotates idempotently', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-ctx-'));
    try {
      fs.mkdirSync(path.join(dir, 'src'));
      fs.writeFileSync(path.join(dir, 'src', 'app.js'), '// registers Five Verbs here\n');
      const cap = path.join(dir, '07-CONTEXT.md');
      fs.writeFileSync(cap, CAPSULE);
      const r = ctx.verifyContextFile(dir, cap, '2026-07-18');
      assert.equal(r.ok, 1, 'substring match is case-insensitive');
      assert.equal(r.external, 1);
      assert.equal(r.stale, 1);
      assert.equal(r.missing, 1);
      assert.equal(r.annotated, 2, 'stale + missing lines annotated');
      const text = fs.readFileSync(cap, 'utf8');
      assert.match(text, /hexagonal moon base.*\[STALE — 2026-07-18/);
      const r2 = ctx.verifyContextFile(dir, cap, '2026-07-19');
      assert.equal(r2.annotated, 0, 'already-annotated lines are skipped');
    } finally { cleanup(dir); }
  });
});

test('capsule template parses with core module (provenance + anchor grammar)', () => {
  const tpl = fs.readFileSync(path.resolve(__dirname, '..', 'gsd-core', 'templates', 'context-capsule.md'), 'utf8');
  const p = ctx.parseContextProvenance(tpl);
  assert.ok(p, 'template frontmatter must carry context_provenance');
  assert.ok(ctx.extractAnchors(tpl).length >= 1, 'template must demonstrate the anchor grammar');
  for (const f of ['master-context.md', 'milestone-capsule.md']) {
    assert.ok(fs.existsSync(path.resolve(__dirname, '..', 'gsd-core', 'templates', f)), `${f} missing`);
  }
});
