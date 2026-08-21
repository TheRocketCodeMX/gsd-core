'use strict';

/**
 * auto-advance-endings.test.cjs — fork workflow endings must be autonomous-run
 * safe (#74).
 *
 * The defect (proven on orbit's sandbox pods, viken repo): with `mode: yolo`
 * and `workflow.auto_advance: true` correctly recorded, a fork workflow ending
 * printed the human "Next Up" handoff block unconditionally — in a
 * browser-hosted pod there is no human terminal, so the autonomous run stalled
 * at the workflow boundary even though the record and the chain driver's
 * contract were correct. Root cause: the ending derived auto mode from the
 * `--auto` FLAG only and never consulted the config record.
 *
 * The law this file pins (fork-authored endings only — upstream-inherited
 * endings are upstream's driver-based design and are deliberately out of
 * scope): any fork-added workflow whose ending prints a `/gsd:<cmd>` handoff
 * must be auto_advance-aware — either it consults the consolidated auto-mode
 * record itself (`gsd_run query check auto-mode --pick active`, the same read
 * `strategy-chain/modes/advance.md` and upstream's discuss-phase family use:
 * chain flag OR `workflow.auto_advance`), or it delegates its ending to the
 * chain driver (the strategy family's `Auto-advance (chain):` line).
 *
 * The roster is derived mechanically from docs/FORK-DELTA.md's "## Additive
 * files" list, so an upstream-inherited ending can never fail this suite and
 * a newly fork-added workflow with a handoff ending is swept in automatically.
 *
 * Also pins #74's second half: the tool-provenance law (planning artifacts
 * come from gsd-tools commands, never hand-made) exists as a fork-owned
 * reference, principle-only, and is wired where autonomous drivers read.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const deltaMd = read('docs/FORK-DELTA.md');

function mdSection(heading) {
  const start = deltaMd.indexOf(`\n## ${heading}`);
  assert.notEqual(start, -1, `FORK-DELTA.md must have a "## ${heading}" section`);
  const rest = deltaMd.slice(start + 1 + `## ${heading}`.length + 3);
  const next = rest.search(/\n## /);
  return next === -1 ? rest : rest.slice(0, next);
}

function bulletPaths(sectionBody) {
  return [...sectionBody.matchAll(/^- `([^`]+)`/gm)].map((m) => m[1]);
}

/** Fork-added workflow docs (the mechanically derived roster). */
const forkWorkflows = bulletPaths(mdSection('Additive files')).filter(
  (p) => p.startsWith('gsd-core/workflows/') && p.endsWith('.md') && fs.existsSync(path.join(ROOT, p)),
);

/** Does this workflow's body print a slash-command handoff pointer? */
function printsHandoff(body) {
  return /^Next: \/gsd[:-][a-z]/m.test(body) || /## ▶ Next Up/.test(body);
}

/** Is the ending auto_advance-aware (record consult or chain-driver delegation)? */
function autoAware(body) {
  return (
    /check auto-mode --pick active/.test(body) ||
    /Auto-advance \(chain\):[^\n]*advance\.md/.test(body)
  );
}

describe('fork workflow endings are autonomous-run safe (#74)', () => {
  test('roster sanity: the fork-added workflow list is non-trivial and includes the known handoff carriers', () => {
    assert.ok(forkWorkflows.length >= 10, `expected a real roster, got ${forkWorkflows.length}`);
    for (const must of [
      'gsd-core/workflows/roadmap.md',
      'gsd-core/workflows/discover-product.md',
      'gsd-core/workflows/legacy-inventory.md',
      'gsd-core/workflows/testing-strategy.md',
    ]) {
      assert.ok(forkWorkflows.includes(must), `${must} must be in FORK-DELTA's additive workflow roster`);
    }
  });

  test('SWEEP: no fork-authored ending prints a /gsd handoff without the auto_advance branch', () => {
    const violations = [];
    for (const p of forkWorkflows) {
      const body = read(p);
      if (printsHandoff(body) && !autoAware(body)) violations.push(p);
    }
    assert.deepEqual(
      violations,
      [],
      `fork-authored workflow(s) print a slash-command handoff without consulting the auto-mode record ` +
        `(add the consolidated read \`check auto-mode --pick active\` + Skill dispatch, or delegate via the ` +
        `Auto-advance (chain) line):\n  ${violations.join('\n  ')}`,
    );
  });

  test('roadmap.md derives AUTO_MODE from the flag OR the config record — never flag-only (the viken stall)', () => {
    const body = read('gsd-core/workflows/roadmap.md');
    // The flag parse stays (fast path, no tool spawn when the flag is present)…
    assert.match(body, /AUTO_MODE=false; case " \$ARGUMENTS " in \*" --auto "\*/, 'flag parse preserved');
    // …and the record consult joins it: an unflagged invocation on a yolo /
    // auto_advance project must still resolve AUTO_MODE=true.
    assert.match(
      body,
      /\[ "\$AUTO_MODE" = true \] \|\| AUTO_MODE=\$\(gsd_run query check auto-mode --pick active/,
      'roadmap must OR-in the consolidated auto-mode record (chain flag OR workflow.auto_advance)',
    );
    // The auto branch dispatches per advance.md's documented contract…
    assert.match(body, /Skill\(skill="gsd-discuss-phase", args="1 --auto"\)/, "advance.md's contract: dispatch discuss-phase 1 --auto");
    // …and the interactive human block is preserved byte-for-byte in its key lines.
    assert.match(body, /\/gsd:discuss-phase 1 — gather context and clarify approach/, 'human pointer preserved');
    assert.match(body, /## ▶ Next Up/, 'human Next Up block preserved');
    // The milestone guard still precedes chaining (new-milestone must get control back).
    assert.match(body, /If `MILESTONE_MODE=true`:\*\* do NOT chain/, 'milestone-mode no-chain guard preserved');
  });

  for (const [file, humanLine] of [
    ['gsd-core/workflows/discover-product.md', 'Next: /gsd:new-project (capture it'],
    ['gsd-core/workflows/legacy-inventory.md', 'Next: /gsd:new-project — it derives requirements'],
  ]) {
    test(`${path.basename(file)} ending consults the record, dispatches on true, and keeps the human pointer on false`, () => {
      const body = read(file);
      assert.match(body, /check auto-mode --pick active/, 'must consult the consolidated auto-mode record');
      assert.match(body, /Skill\(skill="gsd-new-project", args="--auto"\)/, 'auto branch dispatches gsd-new-project --auto via the Skill tool');
      assert.ok(body.includes(humanLine), `interactive human pointer preserved verbatim: ${humanLine}`);
    });
  }

  test('the chain driver keeps its consolidated read (regression guard)', () => {
    const body = read('gsd-core/workflows/strategy-chain/modes/advance.md');
    assert.match(body, /AUTO_MODE=\$\(gsd_run query check auto-mode --pick active/, 'advance.md reads chain-flag OR workflow.auto_advance');
  });
});

describe('tool-provenance law (#74 fix 2)', () => {
  test('the fork-owned reference exists and states the law, principle-only', () => {
    const p = 'gsd-core/references/tool-provenance.md';
    assert.ok(fs.existsSync(path.join(ROOT, p)), `${p} must exist`);
    const body = read(p);
    assert.match(body, /never hand-made/i, 'the law is stated');
    assert.match(body, /gsd-tools/, 'names the tool as the only writer');
    for (const artifact of [/phase director/i, /state file/i, /completion marker/i]) {
      assert.match(body, artifact, `covers ${artifact}`);
    }
    // Principle only — the report's domain examples must NOT appear.
    assert.doesNotMatch(body, /foundations/i, 'no domain examples (principle only)');
  });

  test('autonomous drivers see the law: autonomous.md carries the fork-marked pointer', () => {
    const body = read('gsd-core/workflows/autonomous.md');
    assert.match(body, /<!-- FORK:provenance BEGIN -->/, 'FORK:provenance marker present');
    assert.match(body, /tool-provenance\.md/, 'points at the reference');
    assert.match(body, /<!-- FORK:provenance END -->/, 'marker closed');
  });

  test('the reference and this test are registered in FORK-DELTA additive lists', () => {
    const additive = bulletPaths(mdSection('Additive files'));
    assert.ok(additive.includes('gsd-core/references/tool-provenance.md'), 'reference registered');
    assert.ok(additive.includes('tests/auto-advance-endings.test.cjs'), 'this test registered');
  });
});
