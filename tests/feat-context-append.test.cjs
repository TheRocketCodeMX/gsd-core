'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

describe('elicitation discussion logs (Task 13)', () => {
  const ELICITATION_WORKFLOWS = [
    'new-project.md',
    'model-domain.md',
    'recommend-architecture.md',
    'security-strategy.md',
    'testing-strategy.md',
    'frontend-architecture.md',
    'infrastructure-strategy.md',
    'cicd-strategy.md',
    'legacy-inventory.md',
    'discover-product.md',
  ];

  for (const file of ELICITATION_WORKFLOWS) {
    test(`${file} appends elicitation rounds to PROJECT-DISCUSSION-LOG.md`, () => {
      const wf = read(`gsd-core/workflows/${file}`);
      assert.match(wf, /PROJECT-DISCUSSION-LOG\.md/, `${file} must wire the project discussion log`);
      assert.match(wf, /references\/context-lifecycle\.md/, `${file} must defer the procedure to the reference doc`);
    });
  }

  test('context-lifecycle reference doc exists and carries the doctrine + enable check', () => {
    const doc = read('gsd-core/references/context-lifecycle.md');
    assert.match(doc, /plans are perishable/i, 'doctrine line present');
    assert.match(doc, /context_lifecycle\.discussion_logs/, 'decidable enable-check for the discussion-log flag');
    assert.match(doc, /PROJECT-DISCUSSION-LOG\.md/, 'project-level log location');
  });
});

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
    assert.match(
      wf,
      /config-get context_lifecycle\.seed_offer[^\n]*--raw/,
      'seed_offer config-get must pass --raw, else the value is JSON-quoted and branch comparisons never match'
    );
  });
});

describe('plan-phase freshness gate + curation (capability plan:pre contribution)', () => {
  // The context capability delivers both behaviors as a plan:pre loop-hook
  // contribution; two marked FORK:context directive lines in plan-phase.md
  // (§5.6 + §10) hard-route the fragment's orchestrator-scoped parts to the
  // host (E2E Scenario 3 fix — ceiling raised to 94900, user-approved
  // 2026-07-18; the fragment stays the single source of behavior + config).
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

  test('plan-phase renders plan:pre hooks in-context (upstream delivery path)', () => {
    const wf = read('gsd-core/workflows/plan-phase.md');
    assert.match(wf, /loop render-hooks plan:pre/, 'plan:pre render-hooks call site');
    assert.match(wf, /Read the `activeHooks` array directly/, 'orchestrator reads the hook envelope in-context');
    assert.match(wf, /into\s*==\s*"planner"/, 'generic planner-contribution injection into the planner prompt');
  });

  test('plan-phase hard-delivers the orchestrator parts via marked directives (E2E Scenario 3 fix)', () => {
    const wf = read('gsd-core/workflows/plan-phase.md');
    // §5.6 directive: host runs the fragment's freshness verify pre-planner.
    assert.match(wf, /\*\*Context freshness gate:\*\*.*`context verify`.*never blocks/,
      'host directive to run the freshness verify before any planner spawn');
    assert.match(wf, /context_provenance/, 'gated on provenance (file evidence), not inline config');
    // §10 directive: host applies curation before the checker spawn.
    assert.match(wf, /\*\*Curation first:\*\*.*## Orchestrator curation \(<date>\).*pre-checker/,
      'host directive to append the curation layer before spawning the checker');
    // Both ride inside balanced FORK:context markers (2 pairs, manifest-tracked).
    const pairs = (wf.match(/<!-- FORK:context BEGIN -->/g) || []).length;
    assert.equal(pairs, 2, 'exactly 2 FORK:context marker pairs in plan-phase.md');
    // #1169 stays satisfied: no inline config-get of a capability-owned key.
    assert.doesNotMatch(wf, /config-get\s+context_lifecycle\./,
      'directives must not read context_lifecycle.* config inline (#1169)');
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
    // align-1.16.0: upstream extracted the verifier spawn prompt into its own step fragment.
    const wf = read('gsd-core/workflows/execute-phase/steps/verify-phase-goal.md');
    assert.match(wf, /What Done Looks Like/, 'verifier slice: What Done Looks Like');
  });
});

describe('forward routing: phase-end promotion + cross-milestone capsule (Task 12)', () => {
  test('transition promotes phase discoveries into MASTER-CONTEXT.md', () => {
    const wf = read('gsd-core/workflows/transition.md');
    assert.match(wf, /MASTER-CONTEXT\.md/, 'transition promotes into the master knowledge index');
    assert.match(wf, /Load-bearing verified facts|Standing rules/, 'promotion targets a MASTER section');
  });

  test('complete-milestone routes acknowledged deferrals into a next-milestone capsule', () => {
    const wf = read('gsd-core/workflows/complete-milestone.md');
    assert.match(wf, /milestones\/next\/.*-CAPSULE\.md/, 'deferrals route into milestones/next/<label>-CAPSULE.md');
  });

  test('new-milestone consumes a matching forward capsule at opening', () => {
    const wf = read('gsd-core/workflows/new-milestone.md');
    assert.match(wf, /-CAPSULE\.md/, 'new-milestone folds in a matching capsule');
    assert.match(wf, /milestones\/consumed/, 'consumed capsule is moved aside');
  });
});

// ─── complete-milestone Step 2b: the forward capsule is committed (pre-ship matrix119-B F3) ──
//
// The fork's Step 2b wrote `.planning/milestones/next/<label>-CAPSULE.md` but no commit fence
// staged it, so it stayed untracked after the close (flat and --ws). And `milestones/next/` is
// shared at the root while new-milestone Step 3.1 consumes any label match, so two workstreams'
// next labels collided. The fork's resolve + stage fences (elaboration.md 2b) and upstream's own
// close fences (safety commit → git rm → final commit) are extracted VERBATIM and run in order.

describe('complete-milestone Step 2b forward capsule is committed and workstream-unique (matrix119-B F3)', () => {
  const os = require('node:os');
  const { runHook } = require('./helpers/process-seam.cjs');
  const { gitOrThrow, throwIfFailed } = require('./helpers/git-fixture.cjs');
  const { cleanup } = require('./helpers.cjs');
  const ROOT = path.resolve(__dirname, '..');
  const { scanFencedBlocks } = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'markdown-sectionizer.cjs'));
  const bashFences = (md) => {
    const lines = md.split(/\r?\n/);
    return scanFencedBlocks(lines)
      .filter((b) => /^bash\b/.test(b.infoString))
      .map((b) => lines.slice(b.openLineIdx + 1, b.closeLineIdx).join('\n'));
  };
  const detail = bashFences(read('gsd-core/workflows/complete-milestone/detail/elaboration.md'));
  const spine = bashFences(read('gsd-core/workflows/complete-milestone.md'));
  const pick = (fences, needle, where) => {
    const hit = fences.find((f) => f.includes(needle));
    assert.ok(hit, `${where} has no bash fence containing ${needle}`);
    return hit;
  };
  const shell = os.platform() === 'win32' ? null : 'bash';
  const LABEL_PH = '[next milestone label, e.g. v1.3]';
  const PATH_PH = '[forward_capsule path printed above]';

  function makeProject({ ws }) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-cm-capsule-'));
    const put = (rel, body) => {
      const f = path.join(dir, rel);
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, body);
    };
    put('.planning/PROJECT.md', '# Project\n');
    put('.planning/config.json', '{\n  "commit_docs": true\n}\n');
    const base = ws ? `.planning/workstreams/${ws}` : '.planning';
    put(`${base}/ROADMAP.md`, '# Roadmap\n');
    put(`${base}/STATE.md`, '---\nmilestone: v1.2\n---\n# State\n');
    put(`${base}/REQUIREMENTS.md`, '# Requirements\n');
    put(`${base}/MILESTONES.md`, '# Milestones\n');
    gitOrThrow(['init', '-q'], { cwd: dir });
    gitOrThrow(['config', 'user.email', 't@example.com'], { cwd: dir });
    gitOrThrow(['config', 'user.name', 't'], { cwd: dir });
    gitOrThrow(['config', 'commit.gpgsign', 'false'], { cwd: dir });
    gitOrThrow(['add', '.'], { cwd: dir });
    gitOrThrow(['commit', '-q', '-m', 'init'], { cwd: dir });
    return dir;
  }

  function run(dir, fence, args) {
    const PATH = [path.join(ROOT, 'gsd-core', 'bin'), process.env.PATH].join(path.delimiter);
    const env = { ...process.env, PATH, RUNTIME_DIR: ROOT, HOME: dir, USERPROFILE: dir };
    delete env.GSD_WORKSTREAM;
    delete env.GSD_SESSION_KEY;
    const marker = '\n$ARGUMENTS\nGSD_ARGS_END';
    const script = (fence.includes(marker) ? fence.replace(marker, () => `\n${args}\nGSD_ARGS_END`) : fence)
      .split('[X.Y]').join('1.2');
    const r = runHook('-c', [script], { interpreter: 'bash', cwd: dir, env });
    throwIfFailed(r, 'bash <complete-milestone fence>');
    return r.stdout;
  }

  function close(dir, args) {
    const resolve = pick(detail, 'forward_capsule:', 'elaboration.md');
    assert.ok(resolve.includes(LABEL_PH), `resolve fence must keep the ${LABEL_PH} placeholder`);
    const out = run(dir, resolve.split(LABEL_PH).join('v1.3'), args);
    const m = out.match(/^forward_capsule: (\S+)$/m);
    assert.ok(m, `resolve fence printed no forward_capsule line:\n${out}`);
    const capsule = m[1];
    fs.mkdirSync(path.dirname(capsule), { recursive: true });
    fs.writeFileSync(capsule, '---\nmilestone: v1.3\n---\n# Milestone v1.3 — Forward Capsule\n');
    const stage = pick(detail, PATH_PH, 'elaboration.md');
    run(dir, stage.split(PATH_PH).join(capsule), args);
    // Upstream's own close commits, verbatim: safety commit (path-scoped), git rm, final commit.
    run(dir, pick(spine, 'chore: archive v[X.Y] milestone files', 'complete-milestone.md'), args);
    run(dir, pick(spine, 'git rm "$REQUIREMENTS_PATH"', 'complete-milestone.md'), args);
    run(dir, pick(spine, 'git commit -m "chore: remove REQUIREMENTS.md', 'complete-milestone.md'), args);
    return path.relative(dir, capsule).split(path.sep).join('/');
  }

  const tracked = (dir, rel) => gitOrThrow(['ls-tree', '-r', '--name-only', 'HEAD', '--', rel], { cwd: dir }).trim();
  const dirty = (dir) => gitOrThrow(['status', '--porcelain', '--', '.planning/milestones'], { cwd: dir }).trim();

  test('workstream (--ws search): the capsule label is workstream-prefixed and the close commits it', { skip: shell ? false : 'bash fences' }, () => {
    const dir = makeProject({ ws: 'search' });
    try {
      const rel = close(dir, 'v1.2 --ws search');
      assert.equal(rel, '.planning/milestones/next/search-v1.3-CAPSULE.md');
      assert.equal(tracked(dir, rel), rel, 'capsule must be in HEAD after the close');
      assert.equal(dirty(dir), '', 'nothing under milestones/ left untracked');
    } finally { cleanup(dir); }
  });

  test('flat project: the capsule keeps the bare label and the close commits it', { skip: shell ? false : 'bash fences' }, () => {
    const dir = makeProject({ ws: null });
    try {
      const rel = close(dir, 'v1.2');
      assert.equal(rel, '.planning/milestones/next/v1.3-CAPSULE.md');
      assert.equal(tracked(dir, rel), rel, 'capsule must be in HEAD after the close');
      assert.equal(dirty(dir), '');
    } finally { cleanup(dir); }
  });

  test('new-milestone Step 3.1 matches the workstream-prefixed label under a workstream', () => {
    const wf = read('gsd-core/workflows/new-milestone.md');
    assert.match(wf, /<workstream>-<version>-CAPSULE\.md/, 'Step 3.1 must name the workstream-prefixed label');
  });
});
