// docs-guard-exempt: no docs/ file is read; every read targets gsd-core/ workflow/agent sources and tmpdir .planning fixtures.
'use strict';

/**
 * Flow-ordering contract: the roadmap is generated ONCE, at the strategy-chain →
 * build-loop transition, by the `gsd-roadmap` skill — never eagerly before the
 * strategy chain (plan: docs/superpowers/plans/2026-07-14-roadmap-after-strategy-chain.md).
 *
 * These are STATIC string/routing assertions over the shipped workflow prose
 * (the dispatch is LLM-driven, so there is no runtime hook to exercise — we pin
 * the exact routing strings the model is instructed to emit).
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WF = path.join(ROOT, 'gsd-core', 'workflows');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const newProject = read('gsd-core/workflows/new-project.md');
const newMilestone = read('gsd-core/workflows/new-milestone.md');
const advance = read('gsd-core/workflows/strategy-chain/modes/advance.md');
const roadmapSkill = read('gsd-core/workflows/roadmap.md');
const roadmapCmd = read('commands/gsd/roadmap.md');

// ─── (a) new-project no longer spawns the roadmapper ─────────────────────────

describe('new-project: roadmap creation is deferred (no eager roadmapper spawn)', () => {
  test('new-project.md does NOT inline-spawn gsd-roadmapper', () => {
    assert.ok(
      !/subagent_type="gsd-roadmapper"/.test(newProject),
      'new-project.md still contains a subagent_type="gsd-roadmapper" spawn — it must be owned by the gsd-roadmap skill'
    );
  });

  test('new-project routes the empty-strategy transition to /gsd:roadmap (not discuss-phase directly)', () => {
    assert.ok(
      /SlashCommand\("\/gsd:roadmap --auto"\)/.test(newProject),
      'new-project auto empty-strategy handoff must invoke SlashCommand("/gsd:roadmap --auto")'
    );
    assert.ok(
      !/SlashCommand\("\/gsd:discuss-phase 1 --auto"\)/.test(newProject),
      'new-project must no longer jump straight to discuss-phase in auto mode — the roadmap step comes first'
    );
  });

  test('new-project persists the roadmap-mode marker for the deferred roadmap', () => {
    assert.ok(/roadmap-mode:/.test(newProject), 'new-project must persist a roadmap-mode marker in PROJECT.md');
  });
});

// ─── (b) advance.md routes through gsd-roadmap before the build loop ─────────

describe('strategy-chain advance: chain completion routes through gsd-roadmap', () => {
  test('advance.md step-4 dispatches gsd-roadmap (via the Skill tool)', () => {
    assert.ok(
      /Skill\(skill="gsd-roadmap", args="--auto \$\{GSD_WS\}"\)/.test(advance),
      'advance.md must dispatch Skill(skill="gsd-roadmap", args="--auto ${GSD_WS}") when the strategy chain completes (workstream forwarded, #4456/#4545)'
    );
  });

  test('advance.md does NOT dispatch discuss-phase directly (it goes through gsd-roadmap)', () => {
    assert.ok(
      !/Skill\(skill="gsd-discuss-phase"/.test(advance),
      'advance.md must not dispatch discuss-phase directly — gsd-roadmap performs that hand-off'
    );
  });

  test('advance.md empty-plan fallback also routes through gsd-roadmap', () => {
    // The "Strategy Plan absent or empty" note must point at gsd-roadmap, not discuss-phase.
    const emptyNote = advance.slice(advance.indexOf('Strategy Plan` is absent or empty'));
    assert.ok(
      /gsd-roadmap/.test(emptyNote) && !/gsd-discuss-phase/.test(emptyNote),
      'the empty-strategy-plan fallback in advance.md must dispatch gsd-roadmap, not discuss-phase'
    );
  });

  test('advance.md never spawns an Agent (flat-chain rule #686)', () => {
    assert.ok(!/Agent\(/.test(advance), 'advance.md must dispatch via the Skill tool only — never an Agent spawn');
  });
});

// ─── (c) the gsd-roadmap skill owns the spawn and is born-elaborated ─────────

describe('gsd-roadmap skill: owns the roadmapper spawn, born-elaborated, chains onward', () => {
  test('roadmap.md spawns gsd-roadmapper', () => {
    assert.ok(
      /subagent_type="gsd-roadmapper"/.test(roadmapSkill),
      'the gsd-roadmap skill must own the gsd-roadmapper Agent spawn'
    );
  });

  test('born-elaborated invariant: create-mode writes the elaboration marker when strategy artifacts exist', () => {
    // If strategy artifacts exist at create time, the roadmap must carry the marker so
    // plan-phase §1.6 evaluates `skip` (never flags the fresh roadmap as stale).
    assert.ok(
      /Elaborated against strategy/.test(roadmapSkill),
      'roadmap.md must instruct writing the `Elaborated against strategy` marker'
    );
  });

  test("the marker literal matches plan-phase §1.6's grep literal", () => {
    const planPhase = read('gsd-core/workflows/plan-phase.md');
    const literal = 'Elaborated against strategy';
    assert.ok(planPhase.includes(literal), 'plan-phase §1.6 grep literal drifted');
    assert.ok(roadmapSkill.includes(literal), 'gsd-roadmap marker literal drifted from the §1.6 grep literal');
  });

  test('auto mode chains onward to discuss-phase; --milestone returns without chaining', () => {
    assert.ok(
      /Skill\(skill="gsd-discuss-phase", args="1 --auto \$\{GSD_WS\}"\)/.test(roadmapSkill),
      'roadmap.md must chain to discuss-phase in auto mode'
    );
    assert.ok(
      /MILESTONE_MODE=true/.test(roadmapSkill) && /do NOT chain/.test(roadmapSkill),
      'roadmap.md must not chain onward in --milestone mode (returns to the caller)'
    );
  });

  test('the idempotency guard mirrors §1.6 (marker + strategy-artifact check)', () => {
    assert.ok(/MODE=create/.test(roadmapSkill) && /MODE=elaborate/.test(roadmapSkill) && /MODE=extend/.test(roadmapSkill));
    assert.ok(/SECURITY-STRATEGY\.md/.test(roadmapSkill), 'guard must probe the strategy artifacts like §1.6');
  });
});

// ─── (d) new-milestone routes through gsd-roadmap (extend mode) ──────────────

describe('new-milestone: roadmap creation routes through gsd-roadmap extend mode', () => {
  test('new-milestone.md does NOT inline-spawn gsd-roadmapper', () => {
    assert.ok(
      !/subagent_type="gsd-roadmapper"/.test(newMilestone),
      'new-milestone.md must delegate the roadmapper spawn to gsd-roadmap'
    );
  });

  test('new-milestone dispatches gsd-roadmap in --milestone mode', () => {
    assert.ok(
      /Skill\(skill="gsd-roadmap", args="--milestone \$\{GSD_WS\}"/.test(newMilestone),
      'new-milestone.md must dispatch Skill(skill="gsd-roadmap", args="--milestone ${GSD_WS}") (workstream forwarded, #4456/#4545)'
    );
  });
});

// ─── (e) skill registration is present ───────────────────────────────────────

describe('gsd-roadmap skill registration', () => {
  test('command shell and workflow body exist', () => {
    assert.ok(fs.existsSync(path.join(WF, 'roadmap.md')));
    assert.ok(fs.existsSync(path.join(ROOT, 'commands', 'gsd', 'roadmap.md')));
    assert.match(roadmapCmd, /name:\s*gsd:roadmap/);
  });

  test('registered in the ns-project router (requires + routing row)', () => {
    const nsProject = read('commands/gsd/ns-project.md');
    assert.ok(/requires:.*\broadmap\b/.test(nsProject), 'roadmap missing from ns-project requires');
    assert.ok(/\|\s*gsd-roadmap\s*\|/.test(nsProject), 'roadmap missing from ns-project routing table');
  });

  test('allowlisted in the skill-consolidation ratchet and a surface cluster', () => {
    // v1.9.0: upstream consolidated tests/enh-2790-skill-consolidation.test.cjs
    // into tests/skill-frontmatter-contract.test.cjs (#1970); its KNOWN_SKILLS
    // allowlist is the successor surface ratchet.
    assert.ok(read('tests/skill-frontmatter-contract.test.cjs').includes("'roadmap.md'"));
    assert.ok(/'roadmap'/.test(read('src/clusters.cts')), 'roadmap missing from src/clusters.cts');
  });
});

// ─── (f) workstream scope: roadmap.md's guard / mode / commit lines, run for real ──
//
// Pre-ship matrix B / F1: roadmap.md used to hard-code `.planning/{REQUIREMENTS,ROADMAP,STATE}.md`,
// so `/gsd-new-milestone --ws X` stopped at the guard ("Run /gsd-new-project first") and the
// commit staged nothing. The fences below are extracted VERBATIM from roadmap.md and executed in
// bash against the real gsd-tools (RUNTIME_DIR → this checkout), once against a workstream
// fixture and once against a flat fixture whose behaviour must be unchanged.

describe('gsd-roadmap honours --ws (upstream #4456/#4545 mechanism, init.new-milestone paths)', () => {
  const os = require('os');
  const { runHook } = require('./helpers/process-seam.cjs');
  const { gitOrThrow, throwIfFailed } = require('./helpers/git-fixture.cjs');
  const { cleanup } = require('./helpers.cjs');
  const { scanFencedBlocks } = require('../gsd-core/bin/lib/markdown-sectionizer.cjs');

  function bashFences(markdown) {
    const lines = markdown.split(/\r?\n/);
    return scanFencedBlocks(lines)
      .filter((b) => /^bash\b/.test(b.infoString))
      .map((b) => lines.slice(b.openLineIdx + 1, b.closeLineIdx).join('\n'));
  }
  const fences = bashFences(roadmapSkill);
  const fenceWith = (needle) => {
    const hit = fences.find((f) => f.includes(needle));
    assert.ok(hit, `roadmap.md has no bash fence containing ${needle}`);
    return hit;
  };
  const step1 = fenceWith('roadmap_guard:');
  const step2 = fenceWith('roadmap_mode:');
  const commit = fenceWith('gsd_run query commit "$MSG"');

  const shell = os.platform() === 'win32' ? null : 'bash';

  function makeProject({ ws }) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-roadmap-ws-'));
    const p = (...s) => path.join(dir, '.planning', ...s);
    fs.mkdirSync(p(), { recursive: true });
    fs.writeFileSync(p('PROJECT.md'), '# Project\n\n<!-- roadmap-mode: standard -->\n');
    fs.writeFileSync(p('config.json'), '{\n  "commit_docs": true\n}\n');
    if (ws) {
      fs.mkdirSync(p('workstreams', ws), { recursive: true });
      fs.writeFileSync(p('workstreams', ws, 'REQUIREMENTS.md'), '# Requirements\n\n- [ ] **NOTIF-01**: push\n');
      fs.writeFileSync(p('workstreams', ws, 'STATE.md'), '---\nmilestone: v1.0\n---\n# State\n');
    } else {
      fs.writeFileSync(p('REQUIREMENTS.md'), '# Requirements\n\n- [ ] **CORE-01**: thing\n');
      fs.writeFileSync(p('STATE.md'), '---\nmilestone: v1.0\n---\n# State\n');
    }
    gitOrThrow(['init', '-q'], { cwd: dir });
    gitOrThrow(['config', 'user.email', 't@example.com'], { cwd: dir });
    gitOrThrow(['config', 'user.name', 't'], { cwd: dir });
    gitOrThrow(['config', 'commit.gpgsign', 'false'], { cwd: dir });
    gitOrThrow(['add', '.'], { cwd: dir });
    gitOrThrow(['commit', '-q', '-m', 'init'], { cwd: dir });
    return dir;
  }

  function run(dir, fence, args, extraEnv = {}) {
    // Later fences rely on the `gsd_run` shim the Step-1 fence exports onto PATH (CLAUDE_ENV_FILE).
    const PATH = [path.join(ROOT, 'gsd-core', 'bin'), process.env.PATH].join(path.delimiter);
    const env = { ...process.env, PATH, RUNTIME_DIR: ROOT, HOME: dir, USERPROFILE: dir, ARGUMENTS: args, ...extraEnv };
    delete env.GSD_WORKSTREAM;
    delete env.GSD_SESSION_KEY;
    const r = runHook('-c', [fence], { interpreter: 'bash', cwd: dir, env });
    throwIfFailed(r, 'bash <roadmap.md fence>');
    return r.stdout;
  }

  function committedFiles(dir) {
    return gitOrThrow(['show', '--name-only', '--format=%s', 'HEAD'], { cwd: dir }).trim().split('\n');
  }

  test('workstream: guard passes with --ws, resolves the workstream paths, PROJECT.md stays shared', { skip: shell ? false : 'bash fences' }, () => {
    const dir = makeProject({ ws: 'notif' });
    try {
      const out = run(dir, step1, '--milestone --ws notif');
      assert.match(out, /roadmap_guard: ok/);
      assert.match(out, /project=\S*\/\.planning\/PROJECT\.md /);
      assert.match(out, /requirements=\S*\/\.planning\/workstreams\/notif\/REQUIREMENTS\.md /);
      assert.match(out, /roadmap=\S*\/\.planning\/workstreams\/notif\/ROADMAP\.md /);
      assert.match(out, /state=\S*\/\.planning\/workstreams\/notif\/STATE\.md$/m);
      // The F1 dead-end, reproduced: the same project without the flag has no root REQUIREMENTS.md.
      assert.match(run(dir, step1, '--milestone'), /roadmap_guard: no-project/);
    } finally { cleanup(dir); }
  });

  test('workstream: mode detection reads the workstream ROADMAP.md (extend), commit stages the workstream files', { skip: shell ? false : 'bash fences' }, () => {
    const dir = makeProject({ ws: 'notif' });
    try {
      const wsDir = path.join(dir, '.planning', 'workstreams', 'notif');
      assert.match(run(dir, step2, '--milestone --ws notif'), /roadmap_mode: create/);
      fs.writeFileSync(path.join(wsDir, 'ROADMAP.md'), '# Roadmap\n\n### Phase 1: Push\n');
      assert.match(run(dir, step2, '--milestone --ws notif'), /roadmap_mode: extend/);
      fs.appendFileSync(path.join(wsDir, 'STATE.md'), '\nroadmapped\n');
      fs.appendFileSync(path.join(wsDir, 'REQUIREMENTS.md'), '\n| NOTIF-01 | Phase 1 |\n');
      run(dir, commit, '--milestone --ws notif', { MODE: 'extend' });
      const files = committedFiles(dir);
      assert.equal(files[0], 'docs: extend roadmap for milestone ([N] phases added)');
      assert.deepEqual(files.slice(1).filter(Boolean).sort(), [
        '.planning/workstreams/notif/REQUIREMENTS.md',
        '.planning/workstreams/notif/ROADMAP.md',
        '.planning/workstreams/notif/STATE.md',
      ]);
      assert.equal(gitOrThrow(['status', '--porcelain'], { cwd: dir }).trim(), '', 'nothing left untracked/unstaged');
    } finally { cleanup(dir); }
  });

  test('flat (no workstream): guard, mode and commit behave exactly as before — root .planning/ files', { skip: shell ? false : 'bash fences' }, () => {
    const dir = makeProject({ ws: null });
    try {
      const out = run(dir, step1, '--auto');
      assert.match(out, /roadmap_guard: ok/);
      assert.match(out, /requirements=\S*\/\.planning\/REQUIREMENTS\.md /);
      assert.match(out, /roadmap=\S*\/\.planning\/ROADMAP\.md /);
      assert.match(run(dir, step2, '--auto'), /roadmap_mode: create/);
      fs.writeFileSync(path.join(dir, '.planning', 'ROADMAP.md'), '# Roadmap\n\n### Phase 1: Core\n');
      fs.appendFileSync(path.join(dir, '.planning', 'STATE.md'), '\nroadmapped\n');
      fs.appendFileSync(path.join(dir, '.planning', 'REQUIREMENTS.md'), '\n| CORE-01 | Phase 1 |\n');
      run(dir, commit, '--auto', { MODE: 'create' });
      const files = committedFiles(dir);
      assert.equal(files[0], 'docs: create roadmap ([N] phases)');
      assert.deepEqual(files.slice(1).filter(Boolean).sort(), [
        '.planning/REQUIREMENTS.md',
        '.planning/ROADMAP.md',
        '.planning/STATE.md',
      ]);
    } finally { cleanup(dir); }
  });

  test('onward dispatches and pointers carry ${GSD_WS}', () => {
    assert.ok(roadmapSkill.includes('Skill(skill="gsd-discuss-phase", args="1 --auto ${GSD_WS}")'));
    assert.ok(roadmapSkill.includes('/gsd:discuss-phase 1 ${GSD_WS}'));
    assert.ok(newMilestone.includes('Skill(skill="gsd-roadmap", args="--milestone ${GSD_WS}")'));
    assert.ok(advance.includes('Skill(skill="gsd-roadmap", args="--auto ${GSD_WS}")'));
  });
});
