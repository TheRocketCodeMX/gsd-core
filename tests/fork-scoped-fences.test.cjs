/**
 * Fork fences follow upstream's scoped planning paths (align-1.22.0, upstream #5861/#5859/#5858).
 *
 * Upstream made every shipped fence resolve the active scope — `GSD_PROJECT=<name>` and
 * workstreams — instead of a root `.planning/<artifact>` literal. The fork's own fences
 * (the strategy skills, `/gsd-roadmap`, `/gsd-context`) use the same mechanism, and the
 * fork's project-level artifacts sit beside PROJECT.md (`planningDir(cwd, null)`):
 * `.planning/` in a flat project and shared under a workstream, `.planning/<name>/` under
 * GSD_PROJECT. Each case below runs a shipped fence verbatim, with the repo's own
 * `gsd_run` on PATH and the launcher preamble pointed at this checkout, then reads the
 * commit it made.
 */

'use strict';

const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runHook } = require('./helpers/process-seam.cjs');
const { gitOrThrow } = require('./helpers/git-fixture.cjs');
const { cleanup } = require('./helpers.cjs');

const ROOT = path.join(__dirname, '..');
const { scanFencedBlocks } = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'markdown-sectionizer.cjs'));
const { splitLines } = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'text-lines.cjs'));
const WF = (rel) => path.join(ROOT, 'gsd-core', 'workflows', rel);

/** The first shell fence of `file` that contains `needle`, with `$ARGUMENTS` replaced by `args`. */
function fence(file, needle, args = '') {
  const lines = splitLines(fs.readFileSync(file, 'utf8'));
  for (const b of scanFencedBlocks(lines)) {
    if (b.closeLineIdx === -1 || (b.infoString || '').trim() !== 'bash') continue;
    const body = lines.slice(b.openLineIdx + 1, b.closeLineIdx).map((l) => l.replace(/^ {3}/, ''));
    if (body.some((l) => l.includes(needle))) return body.map((l) => (l === '$ARGUMENTS' ? args : l)).join('\n');
  }
  throw new Error(`${path.relative(ROOT, file)}: no bash fence contains ${needle}`);
}

function run(dir, script, extraEnv = {}) {
  const env = {
    ...process.env,
    HOME: path.join(dir, '.home'),
    RUNTIME_DIR: ROOT,
    PATH: [path.join(ROOT, 'gsd-core', 'bin'), ...String(process.env.PATH || '').split(path.delimiter)
      .filter((p) => !p.includes(`${path.sep}.claude${path.sep}gsd-core${path.sep}bin`))].join(path.delimiter),
    ...extraEnv,
  };
  // Each fence runs in a fresh shell at runtime (#381): nothing a previous fence or the caller set may leak in.
  for (const k of ['GSD_PROJECT', 'GSD_WORKSTREAM', 'GSD_WS', 'GSD_SESSION_KEY', 'CLAUDE_ENV_FILE', 'COMMIT_DOCS', 'PROJECT_DIR', 'PROJECT_PATH']) if (!(k in extraEnv)) delete env[k];
  const r = runHook('-c', [script], { interpreter: 'bash', cwd: dir, env });
  assert.equal(r.exitCode, 0, `fence exited ${r.exitCode}\nstdout: ${r.stdout}\nstderr: ${r.stderr}`);
  return r.stdout;
}

const lastCommitFiles = (dir) => gitOrThrow(['log', '-1', '--name-only', '--format='], { cwd: dir }).trim().split('\n').filter(Boolean).sort();

// The fences are bash; the POSIX lanes run them (as source-fidelity-contracts' fence cases do).
describe('fork fences resolve the active scope (align-1.22.0, upstream #5861 mechanism)', { skip: process.platform === 'win32' ? 'bash fences run on the POSIX lanes' : false }, () => {
  let dir;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-fork-scope-'));
    fs.mkdirSync(path.join(dir, '.home'), { recursive: true });
    gitOrThrow(['init', '-q'], { cwd: dir });
    gitOrThrow(['config', 'user.email', 't@example.invalid'], { cwd: dir });
    gitOrThrow(['config', 'user.name', 't'], { cwd: dir });
    gitOrThrow(['config', 'commit.gpgsign', 'false'], { cwd: dir });
    const plan = '# P\n\n## Strategy Plan\n\n| Step | Status |\n|---|---|\n| model-domain | recommended |\n| recommend-architecture | recommended |\n';
    for (const scope of ['.planning', path.join('.planning', 'beta'), path.join('.planning', 'workstreams', 'ws1')]) {
      fs.mkdirSync(path.join(dir, scope), { recursive: true });
      if (!scope.includes('workstreams')) fs.writeFileSync(path.join(dir, scope, 'PROJECT.md'), plan);
      for (const f of ['REQUIREMENTS.md', 'STATE.md']) fs.writeFileSync(path.join(dir, scope, f), `# ${f} ${scope}\n`);
      fs.writeFileSync(path.join(dir, scope, 'config.json'), '{"commit_docs":true}\n');
    }
    fs.writeFileSync(path.join(dir, '.gitignore'), '.home/\n');
    gitOrThrow(['add', '-A'], { cwd: dir });
    gitOrThrow(['commit', '-qm', 'init'], { cwd: dir });
  });
  afterEach(() => cleanup(dir));

  test('model-domain Step 7 under GSD_PROJECT=beta commits the named project\'s DOMAIN-MODEL.md and PROJECT.md, not the root\'s', () => {
    fs.writeFileSync(path.join(dir, '.planning', 'beta', 'DOMAIN-MODEL.md'), '# beta domain\n');
    fs.writeFileSync(path.join(dir, '.planning', 'DOMAIN-MODEL.md'), '# root domain — must stay untracked\n');
    run(dir, fence(WF('model-domain.md'), 'strategy-done model-domain'), { GSD_PROJECT: 'beta' });
    assert.deepEqual(lastCommitFiles(dir), ['.planning/beta/DOMAIN-MODEL.md', '.planning/beta/PROJECT.md']);
    assert.match(fs.readFileSync(path.join(dir, '.planning', 'beta', 'PROJECT.md'), 'utf8'), /\| model-domain \| done \|/,
      'strategy-done flips the named project\'s Strategy Plan row');
    assert.match(fs.readFileSync(path.join(dir, '.planning', 'PROJECT.md'), 'utf8'), /\| model-domain \| recommended \|/,
      'the root project\'s Strategy Plan is untouched');
  });

  test('model-domain Step 7 in a flat project commits .planning/DOMAIN-MODEL.md (behaviour unchanged)', () => {
    fs.writeFileSync(path.join(dir, '.planning', 'DOMAIN-MODEL.md'), '# root domain\n');
    run(dir, fence(WF('model-domain.md'), 'strategy-done model-domain'));
    assert.deepEqual(lastCommitFiles(dir), ['.planning/DOMAIN-MODEL.md', '.planning/PROJECT.md']);
  });

  // Matrix 1220-B F1: Step 1 sets COMMIT_DOCS, but the commit step runs in a new shell. Each commit fence
  // must re-derive it, or it never commits and claims "commit_docs is false".
  const STRATEGY_COMMITS = [
    ['model-domain', 'DOMAIN-MODEL.md'], ['legacy-inventory', 'LEGACY-INVENTORY.md'], ['discover-product', 'PRODUCT-BRIEF.md'],
    ['recommend-architecture', 'adr/NNNN-architecture.md'], ['security-strategy', 'SECURITY-STRATEGY.md'],
    ['frontend-architecture', 'FRONTEND-ARCHITECTURE.md'], ['testing-strategy', 'TEST-STRATEGY.md'],
    ['infrastructure-strategy', 'INFRA-STRATEGY.md'], ['cicd-strategy', 'CICD-STRATEGY.md'],
  ];
  for (const [skill, artifact] of STRATEGY_COMMITS) {
    test(`/gsd-${skill} commit step, run alone in a clean shell, commits under GSD_PROJECT=beta and honours commit_docs false`, () => {
      const commitFence = fence(WF(`${skill}.md`), `strategy-done ${skill}`);
      const target = path.join(dir, '.planning', 'beta', ...artifact.split('/'));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, `# beta ${artifact}\n`);
      const before = gitOrThrow(['rev-parse', 'HEAD'], { cwd: dir }).trim();
      const out = run(dir, commitFence, { GSD_PROJECT: 'beta' });
      assert.ok(!out.includes('not committed'), `${skill}: the commit step skipped with commit_docs true:\n${out}`);
      assert.notEqual(gitOrThrow(['rev-parse', 'HEAD'], { cwd: dir }).trim(), before, `${skill}: no commit was made`);
      const files = lastCommitFiles(dir);
      assert.ok(files.includes(`.planning/beta/${artifact}`), `${skill}: commit lacks the artifact: ${files.join(', ')}`);
      assert.deepEqual(files.filter((f) => !f.startsWith('.planning/beta/')), [], `${skill}: out-of-scope files committed`);

      fs.writeFileSync(path.join(dir, '.planning', 'beta', 'config.json'), '{"commit_docs":false}\n');
      fs.writeFileSync(target, `# beta ${artifact}, revised\n`);
      const head = gitOrThrow(['rev-parse', 'HEAD'], { cwd: dir }).trim();
      assert.match(run(dir, commitFence, { GSD_PROJECT: 'beta' }), /written but not committed \(commit_docs is false\)/);
      assert.equal(gitOrThrow(['rev-parse', 'HEAD'], { cwd: dir }).trim(), head, `${skill}: committed although commit_docs is false`);
    });
  }

  test('/gsd-testing-strategy Step 2 reads the TESTING-STANDARDS.md it writes and commits (the scoped one), a repo-root file only as fallback', () => {
    const step2 = fence(WF('testing-strategy.md'), 'TESTING_STANDARDS=');
    fs.writeFileSync(path.join(dir, 'TESTING-STANDARDS.md'), 'ROOTMARK repo-wide standards\n');
    fs.writeFileSync(path.join(dir, '.planning', 'beta', 'TESTING-STANDARDS.md'), 'BETAMARK project standards\n');
    const beta = run(dir, step2, { GSD_PROJECT: 'beta' });
    assert.match(beta, /^TESTING_STANDARDS=.*\.planning[\\/]beta[\\/]TESTING-STANDARDS\.md$/m);
    assert.ok(beta.includes('BETAMARK') && !beta.includes('ROOTMARK'), `the named project's standards, not the repo root's:\n${beta}`);
    const flat = run(dir, step2);
    assert.match(flat, /^TESTING_STANDARDS=.*[\\/]TESTING-STANDARDS\.md$/m);
    assert.ok(flat.includes('ROOTMARK'), 'a flat project without .planning/TESTING-STANDARDS.md falls back to the repo-wide file');
    fs.writeFileSync(path.join(dir, '.planning', 'TESTING-STANDARDS.md'), 'FLATMARK project standards\n');
    const flat2 = run(dir, step2);
    assert.ok(flat2.includes('FLATMARK') && !flat2.includes('ROOTMARK'), 'the project file wins over the repo-wide one');
  });

  // Matrix 1220-B F3: the strategy chain (advance.md) dispatches the next skill with `--auto --ws <name>`;
  // the typed workstream must reach the skill's REQUIREMENTS/codebase reads, over the shell's GSD_WS.
  test('a typed --ws reaches a strategy skill\'s REQUIREMENTS read (the chain forwards it) and the ASVS config write/commit', () => {
    const step2 = (args) => fence(WF('testing-strategy.md'), 'TESTING_STANDARDS=', args);
    assert.match(run(dir, step2('--auto --ws ws1')), /^# REQUIREMENTS\.md \.planning[\\/]workstreams[\\/]ws1$/m);
    assert.match(run(dir, step2('--auto'), { GSD_WS: '--ws ws1' }), /^# REQUIREMENTS\.md \.planning[\\/]workstreams[\\/]ws1$/m,
      'without a typed --ws the shell\'s GSD_WS still applies');
    for (const [skill, needle] of [['model-domain', 'HAS_MAPS'], ['recommend-architecture', 'HAS_MAPS'], ['frontend-architecture', 'HAS_MAPS'],
      ['discover-product', 'planning.inspect'], ['infrastructure-strategy', 'planning.inspect'], ['cicd-strategy', 'planning.inspect']]) {
      const lines = splitLines(fs.readFileSync(WF(`${skill}.md`), 'utf8'));
      const fences = scanFencedBlocks(lines)
        .filter((f) => f.closeLineIdx !== -1 && (f.infoString || '').trim() === 'bash')
        .map((f) => lines.slice(f.openLineIdx + 1, f.closeLineIdx).join('\n'))
        .filter((body) => body.includes(needle) && body.includes('planning.inspect'));
      assert.ok(fences.length > 0, `${skill}: no planning.inspect fence`);
      for (const b of fences) assert.ok(b.includes('$ARGUMENTS') && b.includes('_TWS='), `${skill}: a planning.inspect fence ignores a typed --ws:\n${b}`);
    }
    run(dir, `ASVS_LEVEL=2\n${fence(WF('security-strategy.md'), 'config-set workflow.security_asvs_level', '--auto --ws ws1')}`);
    assert.match(fs.readFileSync(path.join(dir, '.planning', 'workstreams', 'ws1', 'config.json'), 'utf8'), /"security_asvs_level": 2/);
    fs.writeFileSync(path.join(dir, '.planning', 'SECURITY-STRATEGY.md'), '# shared security posture\n');
    run(dir, fence(WF('security-strategy.md'), 'strategy-done security-strategy', '--auto --ws ws1'));
    assert.deepEqual(lastCommitFiles(dir), ['.planning/SECURITY-STRATEGY.md', '.planning/workstreams/ws1/config.json']);
  });

  test('a strategy skill\'s Step 1 announces the project directory per scope', () => {
    const setup = fence(WF('recommend-architecture.md'), 'PROJECT_FOUND');
    assert.match(run(dir, setup, { GSD_PROJECT: 'beta' }), new RegExp(`^PROJECT_DIR=.*${path.join('.planning', 'beta').replace(/[\\/.]/g, '\\$&')}\\s*#?`, 'm'));
    const ws = run(dir, setup, { GSD_WORKSTREAM: 'ws1' });
    assert.match(ws, /^PROJECT_FOUND$/m);
    assert.ok(!ws.includes('workstreams'), `a workstream shares the project's strategy artifacts at the root: ${ws}`);
  });

  for (const [label, args, env, scope] of [
    ['--ws ws1', '--ws ws1', {}, path.join('.planning', 'workstreams', 'ws1')],
    ['GSD_PROJECT=beta', '', { GSD_PROJECT: 'beta' }, path.join('.planning', 'beta')],
  ]) {
    test(`/gsd-roadmap Step 4 commit under ${label} stages that scope's ROADMAP, STATE and REQUIREMENTS`, () => {
      for (const f of ['ROADMAP.md', 'STATE.md', 'REQUIREMENTS.md']) fs.writeFileSync(path.join(dir, scope, f), `# ${f} written by the roadmapper\n`);
      fs.writeFileSync(path.join(dir, '.planning', 'ROADMAP.md'), '# root roadmap — must stay untracked\n');
      run(dir, fence(WF('roadmap.md'), 'git ls-tree --name-only HEAD', args), env);
      const rel = scope.split(path.sep).join('/');
      assert.deepEqual(lastCommitFiles(dir), [`${rel}/REQUIREMENTS.md`, `${rel}/ROADMAP.md`, `${rel}/STATE.md`]);
    });
  }

  test('/gsd-roadmap Step 2 under GSD_PROJECT=beta reads the named project\'s strategy artifacts, not the root\'s', () => {
    const step2 = fence(WF('roadmap.md'), 'echo "roadmap_mode: $MODE"');
    fs.writeFileSync(path.join(dir, '.planning', 'beta', 'ROADMAP.md'), '# beta roadmap (coarse)\n');
    fs.mkdirSync(path.join(dir, '.planning', 'adr'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.planning', 'adr', '0001-architecture.md'), '# root ADR\n');
    assert.match(run(dir, step2, { GSD_PROJECT: 'beta' }), /^roadmap_mode: current$/m,
      'a root ADR is another project\'s decision: the named project has none, so its coarse roadmap stays current');
    fs.mkdirSync(path.join(dir, '.planning', 'beta', 'adr'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.planning', 'beta', 'adr', '0001-architecture.md'), '# beta ADR\n');
    assert.match(run(dir, step2, { GSD_PROJECT: 'beta' }), /^roadmap_mode: elaborate$/m);
  });

  test('every fork-owned gsd-roadmapper spawn passes the init-resolved <write_targets> (upstream #5859 write guard)', () => {
    const want = ['ROADMAP.md: {roadmap_path}', 'STATE.md: {state_path}', 'REQUIREMENTS.md: {requirements_path}'];
    for (const [rel, n] of [['roadmap.md', 3], [path.join('plan-phase', 'modes', 'strategy-elaboration.md'), 1]]) {
      const src = fs.readFileSync(WF(rel), 'utf8');
      const spawns = src.match(/subagent_type="gsd-roadmapper"/g) || [];
      const blocks = [...src.matchAll(/<write_targets>([\s\S]{0,400}?)<\/write_targets>/g)].map((m) => m[1]);
      assert.equal(spawns.length, n, `${rel}: roadmapper spawn count changed — re-check its write targets`);
      assert.equal(blocks.length, n, `${rel}: one <write_targets> block per roadmapper spawn`);
      for (const b of blocks) for (const w of want) assert.ok(b.includes(w), `${rel}: <write_targets> must name ${w}`);
    }
  });

  test('/gsd-context master commit under GSD_PROJECT=beta stages the named project\'s MASTER-CONTEXT.md', () => {
    const master = fence(WF('context.md'), 'curate MASTER-CONTEXT');
    fs.writeFileSync(path.join(dir, '.planning', 'beta', 'MASTER-CONTEXT.md'), '# beta master\n');
    fs.writeFileSync(path.join(dir, '.planning', 'MASTER-CONTEXT.md'), '# root master — must stay untracked\n');
    // `context verify --milestone` is advisory in this fence; the commit line is what is under test.
    run(dir, master.replace(/^gsd_run context verify .*$/m, ':'), { GSD_PROJECT: 'beta' });
    assert.deepEqual(lastCommitFiles(dir), ['.planning/beta/MASTER-CONTEXT.md']);
  });

  test('grounding required under GSD_PROJECT=beta cites the named project\'s strategy artifact', () => {
    const plan = '# P\n\n## Strategy Plan\n\n| Step | Status |\n|---|---|\n| model-domain | done |\n';
    fs.writeFileSync(path.join(dir, '.planning', 'beta', 'PROJECT.md'), plan);
    fs.writeFileSync(path.join(dir, '.planning', 'beta', 'DOMAIN-MODEL.md'), '# beta domain\n');
    const out = JSON.parse(run(dir, 'gsd_run grounding required', { GSD_PROJECT: 'beta' }));
    assert.deepEqual(out.required.map((r) => path.relative(dir, r.path).split(path.sep).join('/')), ['.planning/beta/DOMAIN-MODEL.md']);
  });
});
