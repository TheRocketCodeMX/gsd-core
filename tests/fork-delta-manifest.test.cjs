'use strict';

/**
 * Fork-delta manifest guard (v2.0.0 Upstream Realignment, Epic #13).
 *
 * The fork's delta over upstream v1.4.0 (base 7eb4d286) is pinned three ways:
 *
 *   1. docs/FORK-DELTA.md        — human-readable manifest (additive files,
 *      modified-with-fork-content files, whole-file replacements).
 *   2. docs/FORK-PATCHES.json    — machine-readable: one entry per
 *      (path, feature) with mode markers|anchors-only|whole-file, the exact
 *      count of inline FORK:<feature> BEGIN/END pairs, and anchor regexes
 *      matching load-bearing fork literals upstream would never contain.
 *   3. Inline FORK:<feature> markers in the files themselves.
 *
 * This test makes any upstream merge that clobbers a fork feature fail CI
 * loudly: a lost marker pair, a lost anchor literal, a deleted fork-owned
 * file, or manifest drift between the .md and .json all fail here.
 *
 * STATIC assertions only — reads the working tree, runs no git commands.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PATCHES_PATH = path.join(ROOT, 'docs', 'FORK-PATCHES.json');
const DELTA_PATH = path.join(ROOT, 'docs', 'FORK-DELTA.md');

const VALID_MODES = new Set(['markers', 'anchors-only', 'whole-file']);
const FEATURE_RE = /^[a-z][a-z0-9-]*$/;

// ─── Load both manifests once ─────────────────────────────────────────────────

const patchesRaw = fs.readFileSync(PATCHES_PATH, 'utf8');
/** @type {{version: number, base: string, patches: Array<{path: string, feature: string, mode: string, markers?: number, anchors: string[]}>}} */
const manifest = JSON.parse(patchesRaw);
const deltaMd = fs.readFileSync(DELTA_PATH, 'utf8');

/** Extract a `## Heading` section's body from FORK-DELTA.md. */
function mdSection(heading) {
  const start = deltaMd.indexOf(`\n## ${heading}`);
  assert.notEqual(start, -1, `FORK-DELTA.md must have a "## ${heading}" section`);
  const rest = deltaMd.slice(start + 1 + `## ${heading}`.length + 3);
  const next = rest.search(/\n## /);
  return next === -1 ? rest : rest.slice(0, next);
}

/** Backticked paths in "- `path`" bullets (subsection-aware, additive list format). */
function bulletPaths(sectionBody) {
  return [...sectionBody.matchAll(/^- `([^`]+)`/gm)].map((m) => m[1]);
}

/** Backticked paths in the first column of table rows: "| `path` | ...". */
function tablePaths(sectionBody) {
  return [...sectionBody.matchAll(/^\| `([^`]+)` \|/gm)].map((m) => m[1]);
}

// ─── (a) FORK-PATCHES.json shape ──────────────────────────────────────────────

describe('FORK-PATCHES.json: parses and every entry is well-formed', () => {
  test('version is 1 and base is the fork-base commit', () => {
    assert.equal(manifest.version, 1);
    assert.equal(manifest.base, '7eb4d286');
    assert.ok(Array.isArray(manifest.patches) && manifest.patches.length > 0);
  });

  test('every patch entry has a valid mode, feature tag, and ≥1 anchor', () => {
    for (const p of manifest.patches) {
      assert.ok(VALID_MODES.has(p.mode), `${p.path} (${p.feature}): invalid mode ${p.mode}`);
      assert.match(p.feature, FEATURE_RE, `${p.path}: invalid feature tag ${p.feature}`);
      assert.ok(
        Array.isArray(p.anchors) && p.anchors.length >= 1,
        `${p.path} (${p.feature}): every entry needs at least one anchor regex`
      );
      if (p.mode === 'markers') {
        assert.ok(
          Number.isInteger(p.markers) && p.markers >= 1,
          `${p.path} (${p.feature}): mode=markers requires an integer markers count ≥ 1`
        );
      } else {
        assert.equal(p.markers, undefined, `${p.path} (${p.feature}): markers count only valid with mode=markers`);
      }
    }
  });

  test('no duplicate (path, feature) entries', () => {
    const seen = new Set();
    for (const p of manifest.patches) {
      const key = `${p.path} ${p.feature}`;
      assert.ok(!seen.has(key), `duplicate entry for ${p.path} × ${p.feature}`);
      seen.add(key);
    }
  });

  test('every listed path exists in the tree', () => {
    for (const p of manifest.patches) {
      assert.ok(
        fs.existsSync(path.join(ROOT, p.path)),
        `FORK-PATCHES.json lists ${p.path} but it does not exist — ` +
          `an upstream merge deleted a fork-modified file, or the manifest is stale`
      );
    }
  });
});

// ─── (b) marker pairs: balanced and exactly the declared count ───────────────

describe('FORK markers: every mode=markers file carries exactly the declared balanced pairs', () => {
  // Both comment styles: <!-- FORK:feat BEGIN --> (markdown) and // FORK:feat BEGIN (code).
  function countPairs(content, feature, filePath) {
    const begin = new RegExp(`(?:<!-- |// )FORK:${feature} BEGIN(?: -->)?\\s*$`, 'gm');
    const end = new RegExp(`(?:<!-- |// )FORK:${feature} END(?: -->)?\\s*$`, 'gm');
    const begins = [...content.matchAll(begin)].map((m) => m.index);
    const ends = [...content.matchAll(end)].map((m) => m.index);
    assert.equal(
      begins.length,
      ends.length,
      `${filePath}: unbalanced FORK:${feature} markers (${begins.length} BEGIN vs ${ends.length} END)`
    );
    // Balanced AND properly interleaved: BEGIN < END < BEGIN < END …
    for (let i = 0; i < begins.length; i++) {
      assert.ok(begins[i] < ends[i], `${filePath}: FORK:${feature} pair ${i + 1} has END before BEGIN`);
      if (i > 0) {
        assert.ok(ends[i - 1] < begins[i], `${filePath}: FORK:${feature} pair ${i + 1} overlaps pair ${i}`);
      }
    }
    return begins.length;
  }

  for (const p of manifest.patches.filter((e) => e.mode === 'markers')) {
    test(`${p.path} has exactly ${p.markers} FORK:${p.feature} pair(s)`, () => {
      const content = fs.readFileSync(path.join(ROOT, p.path), 'utf8');
      const pairs = countPairs(content, p.feature, p.path);
      assert.equal(
        pairs,
        p.markers,
        `${p.path}: expected ${p.markers} FORK:${p.feature} BEGIN/END pair(s), found ${pairs}. ` +
          `An upstream merge dropped a fork block (or a new fork block wasn't registered in docs/FORK-PATCHES.json).`
      );
    });
  }

  test('no stray FORK markers in files/features the manifest does not declare', () => {
    // Every (path, feature) that has markers on disk must be declared with the
    // markers mode — otherwise the manifest under-counts the fork surface.
    const declared = new Set(
      manifest.patches.filter((e) => e.mode === 'markers').map((e) => `${e.path} ${e.feature}`)
    );
    for (const p of manifest.patches) {
      const content = fs.readFileSync(path.join(ROOT, p.path), 'utf8');
      for (const m of content.matchAll(/FORK:([a-z][a-z0-9-]*) BEGIN/g)) {
        const key = `${p.path} ${m[1]}`;
        assert.ok(
          declared.has(key),
          `${p.path} contains FORK:${m[1]} markers but FORK-PATCHES.json has no mode=markers entry for that feature`
        );
      }
    }
  });
});

// ─── (c) anchors: every regex matches its file ───────────────────────────────

describe('FORK anchors: every anchor regex matches its file content', () => {
  for (const p of manifest.patches) {
    test(`${p.path} (${p.feature}) anchors survive`, () => {
      const content = fs.readFileSync(path.join(ROOT, p.path), 'utf8');
      for (const anchor of p.anchors) {
        const re = new RegExp(anchor, 'm');
        assert.ok(
          re.test(content),
          `${p.path}: anchor /${anchor}/ no longer matches — ` +
            `the ${p.feature} fork content was lost (likely clobbered by an upstream merge). ` +
            `Restore it per docs/FORK-DELTA.md.`
        );
      }
    });
  }
});

// ─── (d) additive files all exist ────────────────────────────────────────────

describe('FORK-DELTA.md: every additive (fork-owned) file exists', () => {
  const additive = bulletPaths(mdSection('Additive files'));

  test('the additive list parsed non-trivially', () => {
    assert.ok(additive.length >= 90, `expected ~98 additive files, parsed ${additive.length} — list format drifted?`);
  });

  test('every additive file exists', () => {
    const missing = additive.filter((f) => !fs.existsSync(path.join(ROOT, f)));
    assert.deepEqual(
      missing,
      [],
      `fork-owned additive files are missing from the tree (deleted by an upstream merge?): ${missing.join(', ')}`
    );
  });

  test('no duplicates in the additive list', () => {
    const dupes = additive.filter((f, i) => additive.indexOf(f) !== i);
    assert.deepEqual(dupes, [], `duplicate additive entries: ${dupes.join(', ')}`);
  });
});

// ─── (e) consistency: FORK-DELTA.md ⇄ FORK-PATCHES.json ──────────────────────

describe('consistency: FORK-DELTA.md and FORK-PATCHES.json pin the same modified-file set', () => {
  // Modified table rows + whole-file bullets in the .md must equal the unique
  // path set in the .json (whole-file entries live in their own .md section).
  const modified = tablePaths(mdSection('Modified files carrying fork content'));
  const wholeFile = bulletPaths(mdSection('Whole-file replacements'));
  const mdSet = new Set([...modified, ...wholeFile]);
  const jsonSet = new Set(manifest.patches.map((p) => p.path));

  test('both manifests parsed non-trivially', () => {
    assert.ok(modified.length >= 50, `modified table parsed only ${modified.length} rows — format drifted?`);
    assert.ok(wholeFile.length >= 3, `whole-file section parsed only ${wholeFile.length} bullets`);
  });

  test('every FORK-PATCHES.json path appears in FORK-DELTA.md', () => {
    const missing = [...jsonSet].filter((f) => !mdSet.has(f));
    assert.deepEqual(missing, [], `in FORK-PATCHES.json but not FORK-DELTA.md: ${missing.join(', ')}`);
  });

  test('every FORK-DELTA.md modified/whole-file path appears in FORK-PATCHES.json', () => {
    const missing = [...mdSet].filter((f) => !jsonSet.has(f));
    assert.deepEqual(missing, [], `in FORK-DELTA.md but not FORK-PATCHES.json: ${missing.join(', ')}`);
  });

  test('whole-file .md section entries are mode=whole-file in the .json (and vice versa)', () => {
    const jsonWhole = new Set(manifest.patches.filter((p) => p.mode === 'whole-file').map((p) => p.path));
    assert.deepEqual([...jsonWhole].sort(), [...wholeFile].sort());
  });
});
