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
      /Skill\(skill="gsd-roadmap", args="--auto"\)/.test(advance),
      'advance.md must dispatch Skill(skill="gsd-roadmap", args="--auto") when the strategy chain completes'
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
      /Skill\(skill="gsd-discuss-phase", args="1 --auto"\)/.test(roadmapSkill),
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
      /Skill\(skill="gsd-roadmap", args="--milestone"/.test(newMilestone),
      'new-milestone.md must dispatch Skill(skill="gsd-roadmap", args="--milestone")'
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
    assert.ok(read('tests/enh-2790-skill-consolidation.test.cjs').includes("'roadmap.md'"));
    assert.ok(/'roadmap'/.test(read('src/clusters.cts')), 'roadmap missing from src/clusters.cts');
  });
});
