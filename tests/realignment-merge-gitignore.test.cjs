'use strict';
process.env.GSD_TEST_MODE = '1';

/**
 * Fork: lint-removed-but-needed on a merge-anchored realignment PR (align-1.21.0, #115).
 *
 * The #3677 gitignored-path refinement switches itself off when the PR diff
 * touches any `.gitignore`. A realignment PR always carries upstream's own
 * `.gitignore` edits through its `Merge upstream vX.Y.Z into
 * align/upstream-X.Y.Z` commit, so an upstream deletion of a force-committed,
 * gitignored file (upstream #5921) produced false basename violations.
 * `gitignoreChangesAreUpstreams` treats `.gitignore` as untouched only when
 * every change is exactly upstream's; any fork-authored edit still disables
 * the refinement (the anti-steering guarantee).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const LINT_SCRIPT = path.join(ROOT, 'scripts', 'lint-removed-but-needed.cjs');
const { scan, getIgnoredDeletions, gitignoreChangesAreUpstreams, parseNameStatusZ } = require(LINT_SCRIPT);
const { cleanup } = require('./helpers.cjs');
const { runNode } = require('./helpers/process-seam.cjs');
const { gitOrThrow } = require('./helpers/git-fixture.cjs');
const { copyScriptWithDeps } = require('./helpers/copy-script-fixture.cjs');

const BASE_REF = 'origin/main';
const DELETED = '.gsd/p/40-design.md';
const SUBJECT = 'Merge upstream v1.2.3 into align/upstream-1.2.3 — waves 1-3 (0 conflicts resolved)';
const UPSTREAM_BASE_IGNORE = ['.gsd', 'a/', 'b/', 'c/', 'build/', 'd/', 'e/', ''].join('\n');
const FORK_BASE_IGNORE = ['.gsd', 'fork-only/', 'a/', 'b/', 'c/', 'build/', 'd/', 'e/', ''].join('\n');

/**
 * An upstream line, a fork line cut from it, an upstream release that deletes
 * the force-committed gitignored `DELETED` and appends a `.gitignore` rule,
 * and a `pr` branch that merges the release with `subject`. A tracked
 * consumer cites the deleted file's bare basename, which is a violation only
 * when the refinement is off.
 */
function buildRealignRepo(tmpDir, opts = {}) {
  const { forkTouchesIgnore = true, subject = SUBJECT, mergeAddsLine = null, laterForkLine = null, noMerge = false } = opts;
  const git = (...args) => gitOrThrow(args, { cwd: tmpDir });
  const write = (rel, content) => {
    fs.mkdirSync(path.dirname(path.join(tmpDir, rel)), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, rel), content);
  };
  git('init', '-q', '-b', 'upstream');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  write('.gitignore', UPSTREAM_BASE_IGNORE);
  write(DELETED, '# design\n');
  write('gsd-core/consumer.cjs', '// see the local 40-design.md notes\n');
  git('add', '.gitignore', 'gsd-core/consumer.cjs');
  git('add', '-f', '--', DELETED);
  git('commit', '-q', '-m', 'upstream base');
  git('checkout', '-q', '-b', 'main');
  if (forkTouchesIgnore) write('.gitignore', FORK_BASE_IGNORE);
  write('fork.md', 'fork\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'fork base');
  git('update-ref', 'refs/remotes/origin/main', 'HEAD');
  git('checkout', '-q', 'upstream');
  fs.appendFileSync(path.join(tmpDir, '.gitignore'), '/gsd-core/bin/lib/new-built.cjs\n');
  git('rm', '-q', '--', DELETED);
  git('add', '.gitignore');
  git('commit', '-q', '-m', 'upstream release');
  git('checkout', '-q', 'main');
  git('checkout', '-q', '-b', 'pr');
  if (noMerge) return git;
  git('merge', '-q', '--no-ff', '--no-commit', 'upstream');
  if (mergeAddsLine) {
    fs.appendFileSync(path.join(tmpDir, '.gitignore'), `${mergeAddsLine}\n`);
    git('add', '.gitignore');
  }
  git('commit', '-q', '-m', subject);
  if (laterForkLine) {
    fs.appendFileSync(path.join(tmpDir, '.gitignore'), `${laterForkLine}\n`);
    git('add', '.gitignore');
    git('commit', '-q', '-m', 'fork edits .gitignore');
  }
  return git;
}

function diffEntries(tmpDir) {
  return parseNameStatusZ(
    gitOrThrow(['diff', '--name-status', '-z', '--no-renames', `${BASE_REF}...HEAD`], { cwd: tmpDir }),
  );
}

function verdict(tmpDir) {
  return {
    upstreams: gitignoreChangesAreUpstreams(tmpDir, BASE_REF, diffEntries(tmpDir)),
    ignored: [...getIgnoredDeletions(tmpDir, [DELETED], BASE_REF)],
    violations: scan(tmpDir, BASE_REF).map((v) => `${v.deletedFile} -> ${v.referencedIn}`),
  };
}

function tmp(t, tag) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `gsd-rbn-realign-${tag}-`));
  t.after(() => cleanup(dir));
  return dir;
}

describe('removed-but-needed lint on a realignment merge (fork, #115)', () => {
  test('upstream\'s own .gitignore edit through the realignment merge keeps the refinement on', (t) => {
    const dir = tmp(t, 'ok');
    buildRealignRepo(dir);
    assert.deepEqual(verdict(dir), { upstreams: true, ignored: [DELETED], violations: [] });
  });

  test('the fork base copy equal to upstream\'s base copy: HEAD must be upstream\'s copy', (t) => {
    const dir = tmp(t, 'same-base');
    buildRealignRepo(dir, { forkTouchesIgnore: false });
    assert.deepEqual(verdict(dir), { upstreams: true, ignored: [DELETED], violations: [] });
  });

  test('an extra fork .gitignore commit after the merge disables the refinement', (t) => {
    const dir = tmp(t, 'later');
    buildRealignRepo(dir, { laterForkLine: 'fork-extra/' });
    assert.deepEqual(verdict(dir), {
      upstreams: false,
      ignored: [],
      violations: [`${DELETED} -> gsd-core/consumer.cjs`],
    });
  });

  test('a fork line added inside the merge commit itself (divergence from upstream) disables the refinement', (t) => {
    const dir = tmp(t, 'evil');
    buildRealignRepo(dir, { mergeAddsLine: '40-design.md' });
    const v = verdict(dir);
    assert.equal(v.upstreams, false);
    assert.deepEqual(v.ignored, []);
    assert.deepEqual(v.violations, [`${DELETED} -> gsd-core/consumer.cjs`]);
  });

  for (const subject of [
    'Merge branch upstream into pr',
    'Merge upstream v1.2.3 into align/upstream-1.2.4',
    'Merge upstream-v1.2.3 into align/upstream-1.2.3',
  ]) {
    test(`a merge not subjected as a realignment merge changes nothing: ${JSON.stringify(subject)}`, (t) => {
      const dir = tmp(t, 'subject');
      buildRealignRepo(dir, { subject });
      assert.deepEqual(verdict(dir), {
        upstreams: false,
        ignored: [],
        violations: [`${DELETED} -> gsd-core/consumer.cjs`],
      });
    });
  }

  test('a non-merge PR is unchanged: touching .gitignore disables, not touching it keeps the refinement', (t) => {
    const dir = tmp(t, 'nomerge');
    const git = buildRealignRepo(dir, { noMerge: true });
    git('rm', '-q', '--', DELETED);
    git('commit', '-q', '-m', 'pr deletes the force-committed file');
    assert.deepEqual(verdict(dir), { upstreams: false, ignored: [DELETED], violations: [] });
    fs.appendFileSync(path.join(dir, '.gitignore'), 'pr-rule/\n');
    git('add', '.gitignore');
    git('commit', '-q', '-m', 'pr touches .gitignore');
    assert.deepEqual(verdict(dir), {
      upstreams: false,
      ignored: [],
      violations: [`${DELETED} -> gsd-core/consumer.cjs`],
    });
  });

  test('fails closed on a git error (unresolvable base)', (t) => {
    const dir = tmp(t, 'nobase');
    buildRealignRepo(dir);
    assert.equal(gitignoreChangesAreUpstreams(dir, 'origin/no-such-branch', diffEntries(dir)), false);
  });

  test('end to end: exit 0 on the realignment merge, exit 1 once the fork edits .gitignore too', (t) => {
    const dir = tmp(t, 'e2e');
    const git = buildRealignRepo(dir);
    const script = copyScriptWithDeps(ROOT, dir, path.relative(ROOT, LINT_SCRIPT));
    const env = { ...process.env, GSD_REMOVED_BUT_NEEDED_BASE: 'main', CI: '', GITHUB_ACTIONS: '' };
    const ok = runNode([script], { cwd: dir, env });
    assert.equal(ok.exitCode, 0, `expected exit 0: ${ok.stderr}`);
    fs.appendFileSync(path.join(dir, '.gitignore'), 'fork-extra/\n');
    git('add', '.gitignore');
    git('commit', '-q', '-m', 'fork edits .gitignore');
    const bad = runNode([script], { cwd: dir, env });
    assert.equal(bad.exitCode, 1, `expected exit 1: ${bad.stdout}`);
    assert.match(bad.stderr, /40-design\.md deleted, but still referenced in gsd-core\/consumer\.cjs/);
  });
});
