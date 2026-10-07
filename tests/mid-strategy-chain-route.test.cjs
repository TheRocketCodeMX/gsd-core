'use strict';
// Executes the bash block the installed smart-entry.md workflow runs; the .md text IS the product.

/**
 * #87 — `/gsd-next` (smart-entry) on a mid-strategy-chain project.
 *
 * The roadmap is generated once, at the END of the strategy chain, by /gsd-roadmap.
 * A mid-chain project therefore has PROJECT.md (with `## Strategy Plan`) and
 * REQUIREMENTS.md but no ROADMAP.md / STATE.md. Upstream's smart-entry classifier
 * (src/smart-entry.cts, byte-identical to upstream) reports that shape as
 * `needs-first-phase` and recommends discussing phase 1 — a phase no roadmap
 * defines yet. The fork route lives in smart-entry.md (the fork-owned layer the
 * skill reads) inside a FORK:strategy block, consistent with the mid-chain route
 * in progress.md / resume-project.md.
 *
 * These tests run that block's bash verbatim against the real gsd-tools output
 * for each project shape.
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createTempProject, cleanup, runGsdTools, TOOLS_PATH, TEST_ENV_BASE } = require('./helpers.cjs');
// The bash block runs gsd-tools twice — the same subprocess class runGsdTools bounds.
const { SEAM_DEFAULT_TIMEOUT_MS } = require('./helpers/timeouts.cjs');
const { splitLines } = require('../gsd-core/bin/lib/text-lines.cjs');

const SMART_ENTRY = path.join(__dirname, '..', 'gsd-core', 'workflows', 'smart-entry.md');
const BEGIN = '<!-- FORK:strategy BEGIN -->';
const END = '<!-- FORK:strategy END -->';

/** The lines between the FORK:strategy markers (line scanner, CRLF-safe). */
function forkBlockLines() {
  const lines = splitLines(fs.readFileSync(SMART_ENTRY, 'utf8'));
  const b = lines.findIndex((l) => l.trim() === BEGIN);
  const e = lines.findIndex((l, i) => i > b && l.trim() === END);
  assert.ok(b !== -1 && e !== -1, 'smart-entry.md must carry a FORK:strategy block');
  return lines.slice(b + 1, e);
}

function forkBlock() {
  return forkBlockLines().join('\n');
}

function forkBash() {
  const lines = forkBlockLines();
  const open = lines.findIndex((l) => l.trim() === '```bash');
  const close = lines.findIndex((l, i) => i > open && l.trim() === '```');
  assert.ok(open !== -1 && close !== -1, 'the FORK:strategy block must carry a bash fence');
  return lines.slice(open + 1, close).join('\n');
}

/** Run the detect step's SNAPSHOT line + the fork block in `cwd`; return STRATEGY_ROUTE. */
function route(cwd) {
  const script = [
    `gsd_run() { node ${JSON.stringify(TOOLS_PATH)} "$@"; }`,
    'SNAPSHOT=$(gsd_run smart-entry --json 2>/dev/null)',
    forkBash(),
    'printf "ROUTE=%s\\n" "$STRATEGY_ROUTE"',
  ].join('\n');
  const out = execFileSync('bash', [], {
    cwd, input: script, encoding: 'utf8', timeout: SEAM_DEFAULT_TIMEOUT_MS,
    env: { ...process.env, ...TEST_ENV_BASE },
  });
  const m = out.match(/^ROUTE=(.*)$/m);
  assert.ok(m, `no ROUTE line in: ${out}`);
  return m[1];
}

const PLAN = (rows, ledger = '') => `# Proj

## Mode
- **Origin:** greenfield

## Strategy Plan
**Archetype:** backend service

| Step | Status |
|---|---|
${rows}

### Skip-ledger
${ledger || '- (none yet)'}

## Requirements
`;

function write(dir, rel, body) {
  const f = path.join(dir, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, body);
}

describe('#87 smart-entry routes a mid-strategy-chain project to the strategy chain', () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = createTempProject();
    write(tmpDir, '.planning/REQUIREMENTS.md', '# Requirements\n\n- [ ] R1\n');
  });
  afterEach(() => { cleanup(tmpDir); });

  test('precondition: upstream smart-entry classifies the mid-chain shape as needs-first-phase', () => {
    write(tmpDir, '.planning/PROJECT.md', PLAN('| model-domain | done |\n| security-strategy | recommended |'));
    const r = runGsdTools(['smart-entry', '--json'], tmpDir);
    assert.ok(r.success, `failed: ${r.error}`);
    const snap = JSON.parse(r.output);
    assert.equal(snap.situation, 'needs-first-phase');
    assert.equal(snap.signals.has_roadmap, false);
  });

  test('mid-chain → the next strategy step', () => {
    write(tmpDir, '.planning/PROJECT.md', PLAN('| model-domain | done |\n| security-strategy | recommended |\n| testing-strategy | recommended |'));
    assert.equal(route(tmpDir), 'security-strategy');
  });

  test('mid-chain with a ledgered skip next → the step after it (#86)', () => {
    write(tmpDir, '.planning/PROJECT.md', PLAN(
      '| model-domain | done |\n| infrastructure-strategy | recommended |\n| cicd-strategy | recommended |',
      '- infrastructure-strategy — skipped (single VPS, 2026-09-01)'));
    assert.equal(route(tmpDir), 'cicd-strategy');
  });

  test('plan exhausted, no roadmap → roadmap', () => {
    write(tmpDir, '.planning/PROJECT.md', PLAN('| model-domain | done |\n| security-strategy | done |'));
    assert.equal(route(tmpDir), 'roadmap');
  });

  test('no Strategy Plan, no roadmap → unchanged (upstream needs-first-phase menu stands)', () => {
    write(tmpDir, '.planning/PROJECT.md', '# Proj\n\n## Requirements\n');
    assert.equal(route(tmpDir), '');
  });

  test('normal project with a roadmap → unchanged', () => {
    write(tmpDir, '.planning/PROJECT.md', PLAN('| model-domain | done |\n| security-strategy | recommended |'));
    write(tmpDir, '.planning/ROADMAP.md', '# Roadmap\n\n## Phases\n\n- [ ] **Phase 1: Foundation**\n\n### Phase 1: Foundation\n**Goal:** build it\n');
    write(tmpDir, '.planning/STATE.md', '---\nstatus: executing\n---\n# State\n\n**Phase:** 1\n**Status:** executing\n');
    write(tmpDir, '.planning/phases/01-foundation/01-01-PLAN.md', '# plan\n');
    assert.equal(route(tmpDir), '');
  });
});

describe('#87 smart-entry.md fork block contract', () => {
  const text = fs.readFileSync(SMART_ENTRY, 'utf8');

  test('markers are balanced and the block sits in the detect step, before the menu is presented', () => {
    const begins = text.match(/<!-- FORK:strategy BEGIN -->/g) || [];
    const ends = text.match(/<!-- FORK:strategy END -->/g) || [];
    assert.equal(begins.length, 1);
    assert.equal(ends.length, 1);
    const at = text.indexOf('<!-- FORK:strategy BEGIN -->');
    assert.ok(at > text.indexOf('<step name="detect">'), 'inside/after detect');
    assert.ok(at < text.indexOf('<step name="present">'), 'before present');
  });

  test('the override recommends the strategy step or /gsd:roadmap, never a phase command', () => {
    const block = forkBlock();
    assert.match(block, /\/gsd:\{STRATEGY_ROUTE\}/);
    assert.match(block, /\/gsd:roadmap/);
    assert.match(block, /Never offer `\/gsd:discuss-phase`/);
  });
});
