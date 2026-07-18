'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

describe('discuss-phase capsule append contract', () => {
  test('discuss-phase honors the capsule append contract', () => {
    const wf = read('gsd-core/workflows/discuss-phase.md');
    assert.match(wf, /context provenance/, 'provenance check before writing');
    assert.match(wf, /## Discussion additions/, 'append layer heading');
    assert.match(wf, /never replace|never overwrite/i);
    const resume = read('gsd-core/workflows/discuss-phase/resume.md');
    assert.match(resume, /context_provenance/, 'resume branch is capsule-aware');
    const dp = read('gsd-core/workflows/discuss-phase.md');
    assert.match(dp, /DISCUSSION-LOG\.md/, 'discussion log wiring');
  });
});

describe('roadmap capsule seed offer', () => {
  test('roadmap offers context seeding at the strategy->build transition', () => {
    const wf = read('gsd-core/workflows/roadmap.md');
    assert.match(wf, /gsd-context.*seed --milestone/, 'dispatches gsd-context seed --milestone');
    assert.match(wf, /seed_offer/, 'reads context_lifecycle.seed_offer');
  });
});

describe('plan-phase freshness gate + curation (capability plan:pre contribution)', () => {
  // The plan-phase host is frozen (phase6 shrink ceiling + #1169 config-leak
  // guard), so the context capability delivers both behaviors as a plan:pre
  // loop-hook contribution — no inline plan-phase.md patch.
  const capPath = 'capabilities/context/capability.json';

  test('context capability declares the plan:pre contribution carrying both behaviors', () => {
    const cap = JSON.parse(read(capPath));
    const contrib = (cap.contributions || []).find((c) => c.point === 'plan:pre');
    assert.ok(contrib, 'context capability must declare a plan:pre contribution');
    assert.equal(contrib.into, 'planner', 'into must be a role in the plan step contract');
    const frag = contrib.fragment && contrib.fragment.inline;
    assert.ok(frag, 'contribution must carry an inline fragment');
    assert.match(frag, /context verify/, 'freshness gate runs gsd_run context verify');
    assert.match(frag, /## Orchestrator curation/, 'curation appends the Orchestrator curation layer');
    assert.match(frag, /verify_max_age_commits/, 'threshold from context_lifecycle.verify_max_age_commits');
    assert.match(frag, /git rev-list --count --since/, 'age counted in commits since provenance date');
    assert.match(frag, /BEFORE spawning gsd-plan-checker/i, 'curation is scoped before the checker spawn');
    assert.equal(contrib.when, 'context_lifecycle.enabled', 'gated on the capability master switch');
  });

  test('generated capability registry carries the fragment (regen landed)', () => {
    const reg = read('gsd-core/bin/lib/capability-registry.cjs');
    assert.match(reg, /<context_capsule_lifecycle>/, 'registry must include the rendered fragment body');
    assert.match(reg, /git rev-list --count --since/, 'registry must include the freshness gate bash');
    assert.match(reg, /## Orchestrator curation \(<date>\)/, 'registry must include the curation layer heading');
  });

  test('plan-phase renders plan:pre hooks in-context (upstream delivery path, unpatched)', () => {
    const wf = read('gsd-core/workflows/plan-phase.md');
    assert.match(wf, /loop render-hooks plan:pre/, 'plan:pre render-hooks call site');
    assert.match(wf, /Read the `activeHooks` array directly/, 'orchestrator reads the hook envelope in-context');
    assert.match(wf, /into\s*==\s*"planner"/, 'generic planner-contribution injection into the planner prompt');
    assert.doesNotMatch(wf, /FORK:context/, 'plan-phase.md itself stays unpatched (frozen host)');
  });
});

describe('resume-project re-anchor step', () => {
  test('resume-project re-anchors against MASTER-CONTEXT.md and verifies capsule freshness', () => {
    const wf = read('gsd-core/workflows/resume-project.md');
    assert.match(wf, /MASTER-CONTEXT\.md/, 're-anchor reads the global knowledge index');
    assert.match(wf, /context verify/, 're-anchor runs the freshness-verify subcommand');
  });
});

describe('execute-phase sectional capsule injection', () => {
  test('executor spawn reads only the binding capsule sections', () => {
    const wf = read('gsd-core/workflows/execute-phase.md');
    assert.match(
      wf,
      /Locked Decisions.*Phase-Scoped Pitfalls|Phase-Scoped Pitfalls.*Locked Decisions/s,
      'executor slice: Locked Decisions + Phase-Scoped Pitfalls'
    );
  });

  test('verifier spawn reads the capsule What Done Looks Like section', () => {
    const wf = read('gsd-core/workflows/execute-phase.md');
    assert.match(wf, /What Done Looks Like/, 'verifier slice: What Done Looks Like');
  });
});
