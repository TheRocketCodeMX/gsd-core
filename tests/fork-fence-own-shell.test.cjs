/**
 * Fork fences never read a shell variable that only an earlier fence sets (align-1.23.0).
 *
 * The runtime runs every fenced bash block in its own shell (#381), so a variable assigned in one
 * block is unset in the next. Upstream v1.23.0 fixed the reads it found (plan-phase 13b #6257,
 * execute-phase begin-phase #6258, insert-phase #5961/#6195, plan-review convergence #6122) by
 * assigning the value inside the block that uses it: a `{placeholder}` the orchestrator fills, or
 * a re-derivation through gsd_run. The fork's 2.12.0 strategy-commit bug (`COMMIT_DOCS` read in
 * a commit fence that never set it) was the same class. This guard parses every fork-owned fence
 * (the additive files in FORK-DELTA and every FORK:<feature> marker block) and fails on a read of
 * a variable that no earlier line of the same fence assigns, unless the read carries its own
 * default (`${X:-…}`) or the variable comes from the environment.
 */

'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { scanFencedBlocks } = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'markdown-sectionizer.cjs'));
const { splitLines } = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'text-lines.cjs'));

/** Variables a fence may read without assigning them: the environment and shell specials. */
const ENV = new Set([
  'HOME', 'PATH', 'PWD', 'TMPDIR', 'USER', 'SHELL', 'IFS', 'OSTYPE', 'RANDOM', 'LINENO', 'REPLY', 'OPTARG', 'OPTIND',
  'BASH_REMATCH', 'PIPESTATUS', 'BASH_VERSION', 'CI', 'RUNTIME_DIR', 'CLAUDE_ENV_FILE', 'CLAUDE_CONFIG_DIR',
  'XDG_CONFIG_HOME', 'GSD_WS', 'GSD_PROJECT', 'GSD_WORKSTREAM', 'GSD_HOME', 'GSD_SESSION_KEY', 'GIT_DIR', 'GIT_WORK_TREE',
  'GIT_INDEX_FILE',
]);

/**
 * Reads the analysis cannot see as assigned, each with why it is not a cross-fence read.
 * Key: `<repo-relative file>::<VAR>`. Empty today: every fork fence assigns what it reads.
 * Fork lines inside upstream fences (anchors-only patches, no FORK markers) are outside this
 * scan; the realignment audit diffs them against the upstream tag instead (runbook).
 */
const EXEMPT = new Map([]);

function walkMd(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkMd(p, out);
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

/**
 * Additive (fork-owned) shipped .md files listed in FORK-DELTA. A file upstream later adopted also
 * appears in the "Modified files" table; only its FORK marker blocks are fork-owned then.
 */
function additiveMarkdown() {
  const delta = fs.readFileSync(path.join(ROOT, 'docs', 'FORK-DELTA.md'), 'utf8');
  const start = delta.indexOf('\n## Additive files');
  const end = delta.indexOf('\n### Do NOT restore', start);
  const modStart = delta.indexOf('\n## Modified files carrying fork content');
  const modified = new Set([...delta.slice(modStart, delta.indexOf('\n## ', modStart + 1)).matchAll(/^\| `([^`]{1,300})` \|/gm)].map((m) => m[1]));
  return [...delta.slice(start, end).matchAll(/^- `([^`]{1,300})`/gm)].map((m) => m[1])
    .filter((f) => /^(gsd-core|agents|commands)\/.*\.md$/.test(f) && !modified.has(f) && fs.existsSync(path.join(ROOT, f)));
}

/** Every shell fence of `lines` whose opening line lies in `[from, to)`, dedented. */
function shellFences(lines, from = 0, to = lines.length) {
  const out = [];
  for (const b of scanFencedBlocks(lines)) {
    if (b.closeLineIdx === -1 || b.openLineIdx < from || b.openLineIdx >= to) continue;
    if (!/^(bash|sh|shell)$/.test((b.infoString || '').trim())) continue;
    const body = lines.slice(b.openLineIdx + 1, b.closeLineIdx);
    const indent = Math.min(...body.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length), 64);
    out.push({ line: b.openLineIdx + 1, body: body.map((l) => l.slice(Math.min(indent, l.match(/^ */)[0].length))) });
  }
  return out;
}

/** Fork-owned fences: whole additive files, plus FORK:<feature> marker blocks anywhere in the shipped tree. */
function forkFences() {
  const fences = [];
  const additive = new Set(additiveMarkdown());
  for (const rel of additive) {
    const lines = splitLines(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    for (const f of shellFences(lines)) fences.push({ rel, ...f });
  }
  for (const dir of ['gsd-core', 'agents', 'commands']) {
    for (const file of walkMd(path.join(ROOT, dir))) {
      const rel = path.relative(ROOT, file).split(path.sep).join('/');
      if (additive.has(rel)) continue;
      const lines = splitLines(fs.readFileSync(file, 'utf8'));
      for (let i = 0; i < lines.length; i++) {
        if (!/<!-- FORK:[\w-]+ BEGIN -->/.test(lines[i])) continue;
        let j = i + 1;
        while (j < lines.length && !/<!-- FORK:[\w-]+ END -->/.test(lines[j])) j++;
        for (const f of shellFences(lines, i, j)) fences.push({ rel, ...f });
        i = j;
      }
    }
  }
  return fences;
}

/** Unguarded reads of variables no earlier line of the fence assigns. */
function crossFenceReads(body) {
  const assigned = new Set();
  const hits = [];
  let heredocEnd = null;
  for (const raw of body) {
    if (heredocEnd !== null) { if (raw.trim() === heredocEnd) heredocEnd = null; continue; }
    if (raw.startsWith('_GSD_SHIM_NAME=')) { for (const v of ['GSD_TOOLS', '_GSD_SHIM_NAME', '_GSD_RUNTIME_ROOT', 'GSD_IDENTITY_STATUS', '_G']) assigned.add(v); continue; }
    const doc = raw.match(/<<-?\s*'([A-Za-z_]\w*)'/);
    if (/^\s*#/.test(raw)) continue;
    // Literal text: single-quoted spans and trailing comments carry no expansion.
    const line = raw.replace(/'[^']*'/g, "''").replace(/(^|\s)#\s.*$/, '');
    const assigns = [];
    for (const m of line.matchAll(/(?:^|[\s;&|(!])(?:export\s+|local\s+|readonly\s+|declare\s+(?:-\w+\s+)*)?([A-Za-z_]\w*)\+?=/g)) assigns.push({ name: m[1], at: m.index });
    for (const m of line.matchAll(/\bfor\s+([A-Za-z_]\w*)\s+in\b/g)) assigns.push({ name: m[1], at: m.index });
    for (const m of line.matchAll(/\bread\b(?:\s+-\w+(?:\s+'[^']*')?)*((?:\s+[A-Za-z_]\w*)+)/g)) for (const v of m[1].trim().split(/\s+/)) assigns.push({ name: v, at: m.index });
    for (const m of line.matchAll(/\$\{#?([A-Za-z_]\w*)([^}]*)\}|\$([A-Za-z_]\w*)/g)) {
      const name = m[1] || m[3];
      if (assigned.has(name) || ENV.has(name)) continue;
      if (/^(:?-|:?=|:?\?|:?\+)/.test(m[2] || '')) continue;
      if (assigns.some((a) => a.name === name && a.at < m.index)) continue;
      hits.push({ name, text: raw.trim().slice(0, 140) });
    }
    for (const a of assigns) assigned.add(a.name);
    if (doc) heredocEnd = doc[1];
  }
  return hits;
}

describe('fork fences assign what they read (each fence is its own shell, #381)', () => {
  const fences = forkFences();

  test('the fork fence set is non-trivial (additive list and FORK markers parsed)', () => {
    assert.ok(fences.length >= 60, `expected the strategy skills, roadmap, context and the FORK blocks; found ${fences.length} fences`);
    const files = new Set(fences.map((f) => f.rel));
    for (const rel of ['gsd-core/workflows/roadmap.md', 'gsd-core/workflows/context.md', 'gsd-core/workflows/model-domain.md', 'gsd-core/workflows/smart-entry.md']) {
      assert.ok(files.has(rel), `${rel} must be scanned`);
    }
  });

  test('no fork fence reads a variable that only an earlier fence sets', () => {
    const offenders = [];
    for (const f of fences) {
      for (const h of crossFenceReads(f.body)) {
        if (EXEMPT.has(`${f.rel}::${h.name}`)) continue;
        offenders.push(`${f.rel}:${f.line} reads $${h.name} — ${h.text}`);
      }
    }
    assert.deepEqual(offenders, [], 'assign the value inside the fence (a {placeholder} or a gsd_run re-derivation), as upstream #6257/#6258 do');
  });

  test('every exemption still names a read the scan sees', () => {
    const seen = new Set();
    for (const f of fences) for (const h of crossFenceReads(f.body)) seen.add(`${f.rel}::${h.name}`);
    const stale = [...EXEMPT.keys()].filter((k) => !seen.has(k));
    assert.deepEqual(stale, [], 'drop exemptions whose read is gone');
  });

  test('the analysis catches the 2.12.0 COMMIT_DOCS shape and accepts its fix (positive control)', () => {
    const bad = ['if [ "$COMMIT_DOCS" = "true" ]; then', '  gsd_run query commit "docs" --files a.md', 'fi'];
    assert.deepEqual(crossFenceReads(bad).map((h) => h.name), ['COMMIT_DOCS']);
    const good = ['COMMIT_DOCS=$(gsd_run query config-get commit_docs --raw 2>/dev/null || echo "true")', ...bad];
    assert.deepEqual(crossFenceReads(good), []);
    assert.deepEqual(crossFenceReads(['echo "${UNSET_BUT_DEFAULTED:-x}"', "echo '$LITERAL'"]), []);
  });
});

/**
 * Pre-ship matrix1230-A K4: under a shell whose default NOMATCH option is on, a glob in a `for` list
 * that matches nothing aborts the WHOLE fence (a glob in a plain command only fails that command).
 * `/gsd-roadmap`'s mode detection, plan-phase's elaboration check and ship's certification sweep lost
 * their output that way on a project without `adr/*.md` / UAT files. Fork fences list such files
 * glob-free (`ls <dir> | grep`, or a grouped `{ ls glob; } 2>/dev/null` inside `$( )`) or set the
 * null-glob option first, as upstream's resume-project fences do.
 */
function globForLists(body) {
  const hits = [];
  let nullGlob = false;
  for (const raw of body) {
    if (/\bsetopt\s+NULL_GLOB\b/i.test(raw)) nullGlob = true;
    if (/^\s*#/.test(raw)) continue;
    const line = raw.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""').replace(/(^|\s)#\s.*$/, '');
    const m = line.match(/\bfor\s+[A-Za-z_]\w*\s+in\s+([^;]*)/);
    if (!m || nullGlob) continue;
    if (/[*?]|\[[^\]]*\]/.test(m[1].replace(/\$\{[^}]*\}|\$\([^)]*\)/g, ''))) hits.push(raw.trim().slice(0, 140));
  }
  return hits;
}

describe('fork fences never iterate a bare glob (an unmatched one aborts the fence under NOMATCH, matrix1230-A K4)', () => {
  const fences = forkFences();

  test('no fork fence has a glob in a for-list without the null-glob option', () => {
    const offenders = [];
    for (const f of fences) for (const h of globForLists(f.body)) offenders.push(`${f.rel}:${f.line} — ${h}`);
    assert.deepEqual(offenders, [], 'list the files glob-free (ls <dir> | grep, or $( { ls glob; } 2>/dev/null )) and loop over that');
  });

  test('the scan catches the shape it guards and accepts the rewrites (positive control)', () => {
    assert.equal(globForLists(['for f in "${D}"/adr/*.md "${D}"/X.md; do', '  [ -e "$f" ] && break', 'done']).length, 1);
    assert.equal(globForLists(['for f in X.md Y.md; do [ -e "${D}/$f" ] && break; done']).length, 0);
    assert.equal(globForLists(['shopt -s nullglob 2>/dev/null; setopt NULL_GLOB 2>/dev/null', 'for f in .planning/*.md; do :; done']).length, 0);
    assert.equal(globForLists(['for d in $(ls "${D}" 2>/dev/null); do :; done']).length, 0);
  });
});
