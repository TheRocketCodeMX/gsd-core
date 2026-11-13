// allow-test-rule: source-text-is-the-product — see TheRocketCodeMX/gsd-core#3
// Reads .md product files whose deployed text IS what the runtime loads.

'use strict';

/**
 * Source-fidelity contracts (1.13.0).
 *
 * Pins the wiring that closes the design/source laundering failure: a from-design
 * build turned one literal `address` input into an invented street/city/state/zip
 * schema because (a) no builder grounded in the literal design and (b) no gate ever
 * diffed the build against it. These contracts assert the corrected model is wired
 * end-to-end — grounding (model-domain + planner-source-audit), the shared in-repo
 * oracle (DESIGN-INVENTORY template), the per-source precedence (single-sourced, no
 * drift), and the per-source gates (design-fidelity + disposition-gated parity +
 * vibe intent-gate). A green grep here would NOT have caught the original failure;
 * these substring contracts would.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const REF = (f) => `gsd-core/references/${f}`;
const WF = (f) => `gsd-core/workflows/${f}`;
const TPL = (f) => `gsd-core/templates/${f}`;
const AG = (f) => `agents/${f}`;

function has(rel, needle) {
  assert.ok(read(rel).includes(needle), `${rel} must contain: ${JSON.stringify(needle)}`);
}
function lacks(rel, needle) {
  assert.ok(!read(rel).includes(needle), `${rel} must NOT contain (regression): ${JSON.stringify(needle)}`);
}

describe('DOCTRINE: per-source precedence is canonical + complete (no drift)', () => {
  const EA = REF('exploration-and-adaptability.md');

  test('exploration-and-adaptability owns the canonical § Source precedence block', () => {
    has(EA, '## Source precedence');
    has(EA, 'fidelity ≠ blind reproduction');
  });

  test('all five source axes are named with their authority', () => {
    for (const src of ['Provided design', 'Legacy / old code', 'Vibe-coded prototype', 'External dependency', 'Strategy / DDD']) {
      has(EA, src);
    }
  });

  test('"structure" is disambiguated into observable-shape vs internal-modeling', () => {
    has(EA, 'observable');
    has(EA, 'internal');
  });

  test('the two other reference homes POINT to the canonical block (not restate it)', () => {
    // The drift we fixed: design-ingestion.md:30 had dropped "/structure" from a restated triad.
    // Single-sourcing means both now reference "§ Source precedence" instead of restating.
    has(REF('brownfield-adaptation.md'), '§ Source precedence');
    has(REF('design-ingestion.md'), '§ Source precedence');
  });

  test('engineering-standards names source-fidelity as the third failure axis (both directions)', () => {
    const ES = REF('engineering-standards.md');
    has(ES, 'source-fidelity');
    has(ES, 'blind reproduction');   // legacy under-rework direction
    has(ES, 'fidelity-loss');        // design over-invention direction
  });

  test('autonomous smart discuss rule 5 is mode-aware: vibe = intent, never behaviour to preserve (align-1.21.0 F1)', () => {
    const SD = REF('autonomous-smart-discuss.md');
    const rule = read(SD).split('\n').find((l) => l.startsWith('5. **Source fidelity (fork law):**'));
    assert.ok(rule, `${SD} must carry rule 5 (Source fidelity)`);
    // Points to the canonical precedence instead of restating it.
    assert.ok(rule.includes('§ Source precedence in `gsd-core/references/exploration-and-adaptability.md`'), rule);
    // Legacy pins behaviour only for rows the inventory marks preserve.
    assert.match(rule, /LEGACY-INVENTORY\.md` \(Parity disposition `preserve`\) → `\(source: legacy\)`/);
    // A vibe prototype (mode or a harden-intent row) is tagged as intent, never as legacy behaviour.
    for (const needle of ['code_quality: vibe-coded-to-harden', '`harden-intent`', 'answers intent only', '`(source: vibe)`', 'never as behaviour to preserve']) {
      assert.ok(rule.includes(needle), `rule 5 must contain ${JSON.stringify(needle)}: ${rule}`);
    }
    // The mode token it keys on is the one project mode actually emits.
    has(TPL('project.md'), 'vibe-coded-to-harden');
    has(REF('exploration-and-adaptability.md'), 'never pin its behavior as a parity oracle');
  });
});

describe('ORACLE: a normalized in-repo, provenance-tagged DESIGN-INVENTORY exists', () => {
  test('the design-inventory template ships with the user-facing-field oracle', () => {
    const T = TPL('design-inventory.md');
    has(T, '## Covered surfaces');
    has(T, 'provenance');
    has(T, 'address-failure guard'); // one address input must not become four required fields
  });

  test('design-ingestion describes the gate diffing the in-repo oracle, never the raw design', () => {
    const DI = REF('design-ingestion.md');
    has(DI, 'design-fidelity gate');
    has(DI, 'never the raw design');
    // The old FALSE promise ("the in-loop verifier checks design fidelity for from-design phases")
    // must be gone — replaced by the real, two-station gate description.
    lacks(DI, 'the in-loop verifier checks design fidelity for from-design phases');
  });
});

describe('GROUNDING: the strategy + plan layers re-ground in the design', () => {
  test('model-domain ingests a provided design and writes the oracle (root-cause fix)', () => {
    const MD = WF('model-domain.md');
    has(MD, 'Design-provided mode');
    has(MD, 'DESIGN-INVENTORY');
  });

  test('design-ingestion lists model-domain as a consumer (was conspicuously absent)', () => {
    has(REF('design-ingestion.md'), 'model-domain');
  });

  test('planner-source-audit carries DESIGN as a source type + the field-fidelity audit', () => {
    const PSA = REF('planner-source-audit.md');
    has(PSA, 'Five Source Types');
    has(PSA, 'Design fidelity (the address-failure guard)');
  });
});

describe('GATES: per-source fidelity gates are wired', () => {
  // v1.9.0 realignment: the verifier's gate BODY was extracted to the
  // verifier-fidelity-gates reference (agent size cap left no room inline);
  // the agent must still @-load the reference, and the gate text must live there.
  test('gsd-verifier has the design-fidelity gate (observable-shape diff)', () => {
    const V = AG('gsd-verifier.md');
    has(V, 'verifier-fidelity-gates.md');          // the @-load seam
    const G = REF('verifier-fidelity-gates.md');
    has(G, 'Design-fit check');
    has(G, 'address-failure guard');
  });

  test('gsd-verifier splits the Mode-fit gate: design-delta parity-exempt + vibe intent-gate', () => {
    // v1.11.0: the Mode-fit split lives wholly in the gates reference (agent
    // cap ~0 headroom after upstream growth; the agent keeps the @-load seam).
    const G = REF('verifier-fidelity-gates.md');
    has(G, 'parity-EXEMPT');                       // design-mandated change is not drift
    has(G, 'intent-hardening, NOT behavior-parity'); // vibe is not pinned to its bugs
  });

  test('gsd-plan-checker has the design-fidelity dimension + the two exemptions', () => {
    const PC = AG('gsd-plan-checker.md');
    has(PC, 'honor the provided design');
    has(PC, 'address-failure guard');
    has(PC, 'design-delta'); // exemption from characterization-first
  });
});

describe('SEAMS: trigger → write → read are mechanically wired (not prose-only)', () => {
  // The audit caught that the gates judged against an oracle never handed to them,
  // the fallback writer was unwired, and the entry points never detected a design.
  // These pin the MECHANISM so it can't regress to prose-deep again.

  test('READ: both gate spawn prompts hand the oracle to the Read-only gate agents', () => {
    has(WF('execute-phase/steps/verify-phase-goal.md'), 'DESIGN-INVENTORY.md and {phase_dir}/*-UI-SPEC.md'); // verifier spawn (align-1.16.0: upstream extracted it into this step)
    has(WF('plan-phase.md'), 'design oracle — REQUIRED input for the design-fidelity check'); // plan-checker spawn
  });

  test('WRITE: the oracle has live writers on the FE-led + fallback paths (not just optional model-domain)', () => {
    has(WF('frontend-architecture.md'), 'Write the field oracle');                 // FE-led path
    // v1.9.0: the planner-fallback bullet was condensed — the oracle path and the
    // write-before-shape mandate now sit in one sentence ("No oracle yet → ingest
    // this phase's design slice and write it before finalizing the data shape").
    has(WF('plan-phase.md'), '.planning/DESIGN-INVENTORY.md');
    has(WF('plan-phase.md'), 'write it before finalizing the data shape'); // planner fallback
  });

  test('TRIGGER: all three entry points detect/route a provided design', () => {
    has(WF('new-project.md'), 'Provided-design detection');
    has(WF('new-milestone.md'), 'ships to a provided design');
    has(WF('discover-product.md'), 'design-source pointer');
  });

  test('TRIGGER: init emits a machine design-hint signal (symmetric with the legacy axis)', () => {
    // src is TS; the compiled .cjs is gitignored — assert on the source of truth.
    const init = require('fs').readFileSync(path.join(ROOT, 'src/init.cts'), 'utf8');
    for (const f of ['has_design_hint', 'design_pointer', 'design_hint_source', 'design_dismissed']) {
      assert.ok(init.includes(f), `src/init.cts must emit ${f}`);
    }
    has(WF('new-project.md'), 'has_design_hint'); // the workflow consumes it
  });

  test('TRIGGER: the design-fidelity gate fires on a schema/contract field that backs a covered surface (not only UI phases)', () => {
    // v1.9.0: trigger text lives in the extracted verifier-fidelity-gates
    // reference (see the GATES block above for the @-load seam assertion).
    has(REF('verifier-fidelity-gates.md'), 'backs a design-covered surface');
    has(TPL('design-inventory.md'), 'Backs (surface field)'); // the column that maps a built column to its user-facing field
  });

  test('code-reviewer is the diff-time fidelity-loss catcher AND is handed the oracle', () => {
    has(AG('gsd-code-reviewer.md'), 'fidelity-loss');
    // The hook is inert unless the spawn prompt actually hands it the oracle (the residual dead READ seam).
    has(WF('code-review.md'), '.planning/DESIGN-INVENTORY.md');
  });

  test('the verifier records a structured Design-fit verdict (auditable, not buried in prose)', () => {
    has(TPL('verification-report.md'), 'Design-fit');
  });

  test('oracle writers are uniformly first-writer-wins (no clobber)', () => {
    has(WF('model-domain.md'), 'First-writer-wins');
    has(WF('frontend-architecture.md'), 'read + reconcile against it rather than re-distilling');
  });

  test('security-strategy is design-aware (screens carry attack-surface signals)', () => {
    has(WF('security-strategy.md'), 'Design-aware (when');
  });

  test('legacy-inventory template points to canonical precedence (no residual triad drift)', () => {
    lacks(TPL('legacy-inventory.md'), 'Locked design wins on UX/scope/structure ·'); // the drifted phrasing
    has(TPL('legacy-inventory.md'), '§ Source precedence');
  });
});

describe('MIXTURE: the gap-map is the shared approved-change allowlist', () => {
  test('legacy-inventory template carries the design-delta bucket + Parity disposition column', () => {
    const T = TPL('legacy-inventory.md');
    has(T, 'Parity disposition');
    has(T, 'In both — design changes this');
    has(T, 'design-delta');
  });

  test('the legacy-inventory workflow emits the parity-disposition allowlist', () => {
    has(WF('legacy-inventory.md'), 'design-delta');
  });
});

// ─── #5548 repo-location scrub in fork fences (pre-ship matrix120-A F4 / B F5) ─────────────────
//
// A git hook or wrapper exports GIT_DIR / GIT_WORK_TREE / GIT_INDEX_FILE. Upstream #5548 scrubs them
// in execGit and in pr-branch.md's workflow fence; the fork's own fences that run raw git did not,
// so they measured (or staged into) the OTHER repo. Each fence below runs VERBATIM in bash, from the
// project's cwd, with those variables exported at a second "decoy" repo; the answer must be the
// cwd repo's. The scrub line itself is upstream's, read from pr-branch.md, never re-typed here.
describe('fork fences that run raw git ignore an inherited GIT_DIR / GIT_WORK_TREE (#5548 idiom)', () => {
  const os = require('node:os');
  const { runHook } = require('./helpers/process-seam.cjs');
  const { gitOrThrow } = require('./helpers/git-fixture.cjs');
  const { cleanup } = require('./helpers.cjs');
  const { scanFencedBlocks } = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'markdown-sectionizer.cjs'));
  const shell = os.platform() === 'win32' ? null : 'bash';

  const bashFences = (rel) => {
    const lines = read(rel).split(/\r?\n/);
    return scanFencedBlocks(lines)
      .filter((b) => /^bash\b/.test(b.infoString))
      .map((b) => lines.slice(b.openLineIdx + 1, b.closeLineIdx).join('\n'));
  };
  const fenceWith = (rel, needle) => {
    const hit = bashFences(rel).find((f) => f.includes(needle));
    assert.ok(hit, `${rel} has no bash fence containing ${needle}`);
    return hit;
  };
  const SCRUB = bashFences(WF('pr-branch.md')).join('\n').split('\n').find((l) => /^unset GIT_ALTERNATE_OBJECT_DIRECTORIES /.test(l.trim()));

  // The fork-owned fences that run raw git (the shared runtime shim excepted: it is upstream's).
  const FORK_GIT_FENCES = [
    [WF('roadmap.md'), 'git ls-tree --name-only HEAD'],
    [WF('legacy-inventory.md'), 'git ls-files | wc -l'],
    [WF('cicd-strategy.md'), 'MERGES_90D='],
    [WF('complete-milestone/detail/elaboration.md'), 'git add -- "[forward_capsule path printed above]"'],
    [REF('verifier-fidelity-gates.md'), "git diff ${DIFF_BASE:-HEAD~1}..HEAD"],
  ];

  function repo(prefix, commits) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    gitOrThrow(['init', '-q'], { cwd: dir });
    gitOrThrow(['config', 'commit.gpgsign', 'false'], { cwd: dir });
    for (const { author, files } of commits) {
      for (const [rel, body] of Object.entries(files)) {
        fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
        fs.writeFileSync(path.join(dir, rel), body);
      }
      gitOrThrow(['add', '-A'], { cwd: dir });
      gitOrThrow(['-c', `user.name=${author}`, '-c', `user.email=${author}@example.com`, 'commit', '-q', '-m', `c by ${author}`], { cwd: dir });
    }
    return dir;
  }
  const decoyEnv = (decoy) => ({
    GIT_DIR: path.join(decoy, '.git'),
    GIT_WORK_TREE: decoy,
    GIT_INDEX_FILE: path.join(decoy, '.git', 'index'),
  });
  function run(dir, fence, extraEnv) {
    const PATH = [path.join(ROOT, 'gsd-core', 'bin'), process.env.PATH].join(path.delimiter);
    const env = { ...process.env, PATH, RUNTIME_DIR: ROOT, HOME: dir, ...extraEnv };
    delete env.GSD_WORKSTREAM;
    delete env.GSD_SESSION_KEY;
    return runHook('-c', [fence], { interpreter: 'bash', cwd: dir, env }).stdout;
  }

  test('every fork-owned fence that runs raw git carries upstream\'s #5548 scrub line verbatim', () => {
    assert.ok(SCRUB, 'upstream pr-branch.md no longer carries the #5548 unset line — re-derive the idiom');
    for (const [rel, needle] of FORK_GIT_FENCES) {
      const fence = fenceWith(rel, needle);
      const lines = fence.split('\n').map((l) => l.trim());
      const at = lines.indexOf(SCRUB.trim());
      assert.ok(at !== -1, `${rel}: the fence running \`${needle}\` must carry upstream's #5548 scrub line`);
      const firstGit = lines.findIndex((l) => !l.startsWith('#') && !l.startsWith('_GSD_SHIM_NAME=') && /(^|[\s;&|(`!])git\s+[a-z]/.test(l));
      assert.ok(firstGit === -1 || at < firstGit, `${rel}: the scrub must run before the fence's first raw git call`);
    }
  });

  test('legacy-inventory Step 1 counts the cwd repo\'s tracked files', { skip: shell ? false : 'bash fences' }, () => {
    const dir = repo('gsd-gd-li-', [{ author: 'a', files: { 'a.txt': 'a', 'b.txt': 'b', 'c.txt': 'c' } }]);
    const decoy = repo('gsd-gd-decoy-', [{ author: 'z', files: { 'z.txt': 'z' } }]);
    try {
      const out = run(dir, fenceWith(WF('legacy-inventory.md'), 'git ls-files | wc -l'), decoyEnv(decoy));
      const counts = out.split('\n').map((l) => l.trim()).filter((l) => /^\d+$/.test(l));
      assert.deepEqual(counts, ['3'], `expected the cwd repo's 3 tracked files, got:\n${out}`);
    } finally { cleanup(dir); cleanup(decoy); }
  });

  test('cicd-strategy Step 2 measures the cwd repo\'s history, not the inherited one', { skip: shell ? false : 'bash fences' }, () => {
    const dir = repo('gsd-gd-ci-', [
      { author: 'ana', files: { 'a.txt': '1' } },
      { author: 'bo', files: { 'a.txt': '2' } },
      { author: 'ana', files: { 'a.txt': '3' } },
      { author: 'cy', files: { 'a.txt': '4' } },
    ]);
    const decoy = repo('gsd-gd-decoy-', [{ author: 'z', files: { 'z.txt': 'z' } }]);
    try {
      const out = run(dir, fenceWith(WF('cicd-strategy.md'), 'MERGES_90D='), decoyEnv(decoy));
      assert.match(out, /^MERGES_90D=\s*4$/m, out);
      assert.match(out, /^CONTRIBUTORS_90D=\s*3$/m, out);
    } finally { cleanup(dir); cleanup(decoy); }
  });

  test('the verifier reward-hacking diff reads the cwd repo\'s last commit', { skip: shell ? false : 'bash fences' }, () => {
    const dir = repo('gsd-gd-vf-', [
      { author: 'a', files: { 'tests/a.test.js': "test('x', () => {\n  expect(sum(1, 1)).toBe(2);\n});\n" } },
      { author: 'a', files: { 'tests/a.test.js': "test('x', () => {\n});\n" } },
    ]);
    const decoy = repo('gsd-gd-decoy-', [{ author: 'z', files: { 'z.txt': 'z' } }]);
    try {
      const out = run(dir, fenceWith(REF('verifier-fidelity-gates.md'), 'git diff ${DIFF_BASE:-HEAD~1}..HEAD'), decoyEnv(decoy));
      assert.match(out, /expect\(sum\(1, 1\)\)/, `the deleted assertion must be flagged, got:\n${out}`);
    } finally { cleanup(dir); cleanup(decoy); }
  });
});

// matrix1210-B F4: Step 2's design branch keys on `design_hint_source: arg` / `design_dismissed`,
// which only `init.new-project --design <path>` / `--no-design` produce, so Step 1 must forward
// them from the typed arguments. The Step 1 argument lines run VERBATIM in bash with a stub
// `gsd_run` that echoes its argv.
describe('/gsd-new-project forwards --design / --no-design to init.new-project (F4)', () => {
  const os = require('node:os');
  const { runHook } = require('./helpers/process-seam.cjs');
  const shell = os.platform() === 'win32' ? null : 'bash';
  const lines = read(WF('new-project.md')).split(/\r?\n/);
  const pick = (re) => {
    const hit = lines.find((l) => re.test(l));
    assert.ok(hit, `new-project.md Step 1 lost the line matching ${re}`);
    return hit;
  };
  const argLines = () => [/^AUTO_PARAM=""; /, /^INIT=\$\(gsd_run query init\.new-project \$AUTO_PARAM\)$/, /^DESIGN_ARG=/].map(pick).join('\n');
  const initArgv = (gsdArgs) => runHook('-c', [`gsd_run() { printf '%s|' "$@"; }\nGSD_ARGS=${JSON.stringify(gsdArgs)}\n${argLines()}\nprintf '%s' "$INIT"`], {
    interpreter: 'bash', cwd: os.tmpdir(), env: { ...process.env },
  }).stdout;

  for (const [args, want] of [
    ['', 'query|init.new-project|'],
    ['--auto', 'query|init.new-project|--auto|'],
    ['--design designs/app.fig', 'query|init.new-project|--design|designs/app.fig|'],
    ['--auto --design=https://figma.com/file/x', 'query|init.new-project|--auto|--design|https://figma.com/file/x|'],
    ['--no-design --auto', 'query|init.new-project|--auto|--no-design|'],
    ['--designer x', 'query|init.new-project|'],
  ]) {
    test(`typed arguments ${JSON.stringify(args)} reach init as ${want}`, { skip: shell ? false : 'bash fences' }, () => {
      assert.equal(initArgv(args), want);
    });
  }
});
