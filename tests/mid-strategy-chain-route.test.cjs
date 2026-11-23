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

/**
 * Run the fork block ALONE in `cwd` (a fresh shell, as the runtime runs every fenced block, #381):
 * align-1.23.0 — it re-reads the snapshot itself instead of relying on the detect step's SNAPSHOT.
 * Returns STRATEGY_ROUTE.
 */
function route(cwd) {
  const script = [
    `gsd_run() { node ${JSON.stringify(TOOLS_PATH)} "$@"; }`,
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

// Pre-ship matrix1201-B F4: after /gsd-new-milestone the roadmap already exists (extended for the
// new milestone), so the no-roadmap route above never fires, and /gsd-next offered discuss/plan
// although new-milestone's on-ramp says a recommended strategy step comes first. At milestone start
// (no phase of the active milestone planned yet) a pending recommended step now leads the menu.
describe('matrix1201-B F4: smart-entry surfaces a milestone strategy step before the build loop', () => {
  let tmpDir;
  const MILESTONE_ROADMAP = [
    '# Roadmap', '', '<details>', '<summary>v1.0 MVP (Phases 1-2) — SHIPPED</summary>', '',
    '- [x] **Phase 1: Foundation**', '- [x] **Phase 2: Auth**', '', '</details>', '',
    '### 🚧 v1.1 Payments', '', '- [ ] **Phase 3: Checkout**', '- [ ] **Phase 4: Refunds**', '',
    '### Phase 3: Checkout', '**Goal**: pay', '', '### Phase 4: Refunds', '**Goal**: refund', '',
  ].join('\n');
  beforeEach(() => {
    tmpDir = createTempProject();
    write(tmpDir, '.planning/REQUIREMENTS.md', '# Requirements\n\n- [ ] R1\n');
    write(tmpDir, '.planning/ROADMAP.md', MILESTONE_ROADMAP);
    write(tmpDir, '.planning/STATE.md', '---\nmilestone: v1.1\nstatus: planning\n---\n# State\n\n## Current Position\n\nPhase: 3\nStatus: Ready to plan\n');
    write(tmpDir, '.planning/milestones/v1.0-phases/01-foundation/01-01-PLAN.md', '# plan\n');
  });
  afterEach(() => { cleanup(tmpDir); });

  test('new milestone, nothing planned yet, a step recommended → that step', () => {
    write(tmpDir, '.planning/PROJECT.md', PLAN('| model-domain | done |\n| security-strategy | recommended |'));
    assert.equal(route(tmpDir), 'security-strategy');
  });

  test('new milestone, every step done → unchanged (no roadmap fallback: the roadmap exists)', () => {
    write(tmpDir, '.planning/PROJECT.md', PLAN('| model-domain | done |\n| security-strategy | done |'));
    assert.equal(route(tmpDir), '');
  });

  test('a recorded pause (HANDOFF.json, upstream #6431) → unchanged: resume comes before the strategy step', () => {
    write(tmpDir, '.planning/PROJECT.md', PLAN('| model-domain | done |\n| security-strategy | recommended |'));
    write(tmpDir, '.planning/HANDOFF.json', '{"phase":"3"}\n');
    assert.equal(route(tmpDir), '');
  });

  test('a phase of the milestone is already planned → unchanged (the build loop has started)', () => {
    write(tmpDir, '.planning/PROJECT.md', PLAN('| model-domain | done |\n| security-strategy | recommended |'));
    write(tmpDir, '.planning/phases/03-checkout/03-01-PLAN.md', '# plan\n');
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
    assert.match(block, /\/gsd-\{STRATEGY_ROUTE\}/);
    assert.match(block, /\/gsd:roadmap/);
    assert.match(block, /Never offer `\/gsd:discuss-phase`/);
  });
});

// Pre-ship matrix1230-B B1: a pause recorded mid-chain looped /gsd-next ↔ /gsd-resume-work. /gsd-next
// correctly yields to resume (above), but resume-project's FORK:strategy block exited ("no STATE.md to
// resume from") before check_incomplete_work / consume_handoff, and under a workstream (STATE.md exists)
// upstream's init_incomplete branch sent the user to /gsd-new-project. The block now decides mid-chain
// and the pause in its own fence and, when paused, yields to the handoff restore. The cycle below runs
// every fence ALONE in a fresh shell with the repo's gsd-tools: pause → next → resume → consume → next.
describe('matrix1230-B B1: a pause mid-chain resumes back into the strategy chain', { skip: process.platform === 'win32' ? 'bash fences run on the POSIX lanes' : false }, () => {
  const { runHook } = require('./helpers/process-seam.cjs');
  const { gitOrThrow } = require('./helpers/git-fixture.cjs');
  const { scanFencedBlocks } = require('../gsd-core/bin/lib/markdown-sectionizer.cjs');
  const ROOT = path.join(__dirname, '..');
  const RESUME = path.join(ROOT, 'gsd-core', 'workflows', 'resume-project.md');

  /** The bash fence between `from` and `to` in `file`, `$ARGUMENTS` replaced by the typed args. */
  function fenceIn(file, from, to, args = '') {
    const text = fs.readFileSync(file, 'utf8');
    const a = text.indexOf(from);
    const z = text.indexOf(to, a + from.length);
    assert.ok(a !== -1 && z !== -1, `${path.basename(file)}: no section ${from} … ${to}`);
    const lines = splitLines(text.slice(a, z));
    const b = scanFencedBlocks(lines).find((x) => x.closeLineIdx !== -1 && (x.infoString || '').trim() === 'bash');
    assert.ok(b, `${path.basename(file)}: no bash fence in ${from}`);
    return lines.slice(b.openLineIdx + 1, b.closeLineIdx).map((l) => (l === '$ARGUMENTS' ? args : l)).join('\n');
  }
  function sh(dir, script, extraEnv = {}) {
    const env = {
      ...process.env,
      HOME: path.join(dir, '.home'),
      RUNTIME_DIR: ROOT,
      PATH: [path.join(ROOT, 'gsd-core', 'bin'), ...String(process.env.PATH || '').split(path.delimiter)
        .filter((p) => !p.includes(`${path.sep}.claude${path.sep}gsd-core${path.sep}bin`))].join(path.delimiter),
      ...extraEnv,
    };
    for (const k of ['GSD_PROJECT', 'GSD_WORKSTREAM', 'GSD_WS', 'GSD_SESSION_KEY', 'CLAUDE_ENV_FILE']) if (!(k in extraEnv)) delete env[k];
    const r = runHook('-c', [script], { interpreter: 'bash', cwd: dir, env });
    assert.equal(r.exitCode, 0, `fence exited ${r.exitCode}\nstdout: ${r.stdout}\nstderr: ${r.stderr}`);
    return r.stdout;
  }
  const seRoute = (dir, env) => {
    const m = sh(dir, `${forkBash()}\nprintf "ROUTE=%s\\n" "$STRATEGY_ROUTE"`, env).match(/^ROUTE=(.*)$/m);
    assert.ok(m, 'no ROUTE line');
    return m[1];
  };
  const situation = (dir, env) => JSON.parse(sh(dir, 'gsd_run smart-entry --json', env)).situation;
  const resumeDecision = (dir, args, env) => {
    const out = sh(dir, fenceIn(RESUME, '<!-- FORK:strategy BEGIN -->', '<!-- FORK:strategy END -->', args), env);
    const m = out.match(/^mid_chain=(\S+) paused=(\S+) next_strategy=(\S*)$/m);
    assert.ok(m, `no decision line in: ${out}`);
    return { midChain: m[1], paused: m[2], next: m[3] };
  };

  const SCOPES = [
    { name: 'flat project', scope: '.planning', env: {}, args: '' },
    { name: 'GSD_PROJECT=beta', scope: '.planning/beta', env: { GSD_PROJECT: 'beta' }, args: '' },
    { name: 'workstream ws1, typed --ws "ws1" for resume', scope: '.planning/workstreams/ws1', env: { GSD_WORKSTREAM: 'ws1' }, resumeEnv: {}, args: '--ws "ws1"' },
    { name: 'workstream ws1, typed --ws ws1 for resume', scope: '.planning/workstreams/ws1', env: { GSD_WORKSTREAM: 'ws1' }, resumeEnv: {}, args: '--ws ws1' },
  ];
  for (const s of SCOPES) {
    test(`${s.name}: pause → /gsd-next yields → resume restores and consumes the handoff → /gsd-next continues the chain`, (t) => {
      const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'gsd-b1-'));
      t.after(() => cleanup(dir));
      fs.mkdirSync(path.join(dir, '.home'), { recursive: true });
      for (const a of [['init', '-q'], ['config', 'user.email', 't@example.invalid'], ['config', 'user.name', 't'], ['config', 'commit.gpgsign', 'false']]) gitOrThrow(a, { cwd: dir });
      const plan = PLAN('| model-domain | done |\n| security-strategy | recommended |\n| testing-strategy | recommended |');
      const projectDir = s.scope.includes('workstreams') ? '.planning' : s.scope;   // PROJECT.md is shared under workstreams
      write(dir, `${projectDir}/PROJECT.md`, plan);
      write(dir, `${s.scope}/REQUIREMENTS.md`, '# Requirements\n\n- [ ] R1\n');
      write(dir, `${s.scope}/config.json`, '{"commit_docs":true}\n');
      if (s.scope !== '.planning') write(dir, '.planning/config.json', '{"commit_docs":true}\n');
      if (s.scope.includes('workstreams')) write(dir, `${s.scope}/STATE.md`, '# State\n');   // workstream create seeds STATE.md
      write(dir, '.gitignore', '.home/\n');
      // What /gsd-pause-work records mid-chain (pause-work.md): the root HANDOFF.json plus the default .continue-here.md.
      write(dir, '.planning/HANDOFF.json', '{"status":"paused","next_action":"run security-strategy"}\n');
      write(dir, '.planning/.continue-here.md', 'paused before security-strategy\n');   // no phase yet: the default location
      gitOrThrow(['add', '-A'], { cwd: dir });
      gitOrThrow(['commit', '-qm', 'paused mid-chain'], { cwd: dir });

      // /gsd-next: the pause wins, the strategy route steps aside.
      assert.equal(situation(dir, s.env), 'paused');
      assert.equal(seRoute(dir, s.env), '');

      // /gsd-resume-work: the fork block sees mid-chain AND the pause, so it yields to the handoff restore.
      const d = resumeDecision(dir, s.args, s.resumeEnv || s.env);
      assert.deepEqual(d, { midChain: 'true', paused: 'true', next: 'security-strategy' });

      // consume_handoff (upstream #6431), alone: removes the record and the checkpoint. (Its commit passes the
      // removed paths as --files, which the commit verb skips as missing; that is upstream code, not pinned here.)
      sh(dir, fenceIn(RESUME, '<step name="consume_handoff">', '</step>'), s.resumeEnv || s.env);
      assert.ok(!fs.existsSync(path.join(dir, '.planning', 'HANDOFF.json')), 'HANDOFF.json consumed');
      assert.ok(!fs.existsSync(path.join(dir, '.planning', '.continue-here.md')), '.continue-here.md consumed');

      // /gsd-next again: no pause, back in the chain at the step the handoff stopped before.
      assert.equal(situation(dir, s.env), 'needs-first-phase');
      assert.equal(seRoute(dir, s.env), 'security-strategy');
      // and a second resume no longer sees a pause (no loop)
      assert.equal(resumeDecision(dir, s.args, s.resumeEnv || s.env).paused, 'false');
    });
  }

  // Matrix 1230-A K6: the fork route read the root project when --ws was only typed (no GSD_WORKSTREAM, no pointer).
  test('/gsd-next with a typed --ws routes the workstream\'s chain, not the root\'s (K6)', (t) => {
    const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'gsd-k6-'));
    t.after(() => cleanup(dir));
    fs.mkdirSync(path.join(dir, '.home'), { recursive: true });
    gitOrThrow(['init', '-q'], { cwd: dir });
    write(dir, '.planning/PROJECT.md', PLAN('| model-domain | done |\n| security-strategy | recommended |'));
    write(dir, '.planning/config.json', '{}\n');
    // root: building already (a roadmap with a planned phase) → no strategy route
    write(dir, '.planning/REQUIREMENTS.md', '# Requirements\n\n- [ ] R1\n');
    write(dir, '.planning/ROADMAP.md', '# Roadmap\n\n## Phases\n\n- [ ] **Phase 1: Foundation**\n\n### Phase 1: Foundation\n**Goal:** build it\n');
    write(dir, '.planning/STATE.md', '---\nstatus: executing\n---\n# State\n\n**Phase:** 1\n**Status:** executing\n');
    write(dir, '.planning/phases/01-foundation/01-01-PLAN.md', '# plan\n');
    // ws1: mid-chain (no roadmap yet)
    write(dir, '.planning/workstreams/ws1/REQUIREMENTS.md', '# Requirements\n\n- [ ] W1\n');
    write(dir, '.planning/workstreams/ws1/STATE.md', '# State\n');
    write(dir, '.planning/workstreams/ws1/config.json', '{}\n');
    const fenceWithArgs = (args) => forkBash().split('\n$ARGUMENTS\nGSD_ARGS_END').join(`\n${args}\nGSD_ARGS_END`);
    const r = (args) => sh(dir, `${fenceWithArgs(args)}\nprintf "ROUTE=%s\\n" "$STRATEGY_ROUTE"`).match(/^ROUTE=(.*)$/m)[1];
    assert.equal(r(''), '', 'the root project is building: no strategy route');
    assert.equal(r('--ws ws1'), 'security-strategy');
    assert.equal(r('--ws "ws1"'), 'security-strategy');
  });

  test('a project with a roadmap is not mid-chain: resume takes upstream\'s routes (and consumes the handoff there)', (t) => {
    const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'gsd-b1-'));
    t.after(() => cleanup(dir));
    fs.mkdirSync(path.join(dir, '.home'), { recursive: true });
    gitOrThrow(['init', '-q'], { cwd: dir });
    write(dir, '.planning/PROJECT.md', PLAN('| model-domain | done |\n| security-strategy | recommended |'));
    write(dir, '.planning/ROADMAP.md', '# Roadmap\n\n### Phase 1: Foundation\n**Goal:** build it\n');
    write(dir, '.planning/STATE.md', '# State\n');
    write(dir, '.planning/HANDOFF.json', '{}\n');
    assert.deepEqual(resumeDecision(dir, '', {}), { midChain: 'false', paused: 'true', next: 'roadmap' });
  });

  test('the block routes a paused mid-chain resume through check_incomplete_work and consume_handoff, never to new-project', () => {
    const text = fs.readFileSync(RESUME, 'utf8');
    const block = text.slice(text.indexOf('<!-- FORK:strategy BEGIN -->'), text.indexOf('<!-- FORK:strategy END -->'));
    assert.match(block, /\*\*If `mid_chain=true` and `paused=true`\*\*[^\n]*run `check_incomplete_work`[^\n]*run `consume_handoff`/);
    assert.match(block, /do not take the `init_incomplete` route/);
    assert.doesNotMatch(block, /There is no STATE\.md to resume from yet/, 'a workstream has a STATE.md; the message names the roadmap');
  });
});
