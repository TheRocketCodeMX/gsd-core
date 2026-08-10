'use strict';

/**
 * cicd-rung-ladder.test.cjs — the load-bearing structures of the right-sized
 * `/gsd:cicd-strategy` (issue #43).
 *
 * ## Why this file exists
 *
 * The over-engineering defect this redesign fixes was STRUCTURAL, not rhetorical:
 * the prose already said "no staging for a solo dev", but the TABLES said "fill in
 * three stages" — and a pre-printed template row is an instruction to fill it.
 * Tables beat prose. So the things worth pinning are the structures, not the wording:
 *
 *   - the C0–C3 / D0–D5 rung ladders exist in the reference, each above-floor rung
 *     carrying an entry criterion;
 *   - the pre-printed `Nightly` rows are GONE from BOTH templates (cicd-strategy's
 *     pipeline map and test-strategy's CI execution map — the latter is cicd's own
 *     upstream input, so leaving it would re-assert the nightly as a fact);
 *   - the workflow MEASURES the facts that decide the shape instead of asking for
 *     them (suite wall clock, merges/week, contributors) and reads SECURITY-STRATEGY
 *     for blast radius;
 *   - the over/under-engineering check enumerates every capability it can turn on
 *     (12 rows), because a check cannot fire on what it does not name;
 *   - the floor is stated CONFIDENTLY as the complete DORA CI capability.
 *
 * A `describe('citation honesty')` block additionally guards the claims the research
 * pass deliberately refused to ship (they are listed in the proposal's excluded-claims
 * appendix). Those are the ones a future edit is most likely to "helpfully" restore.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const WORKFLOW = 'gsd-core/workflows/cicd-strategy.md';
const REFERENCE = 'gsd-core/references/cicd-strategy.md';
const TEMPLATE = 'gsd-core/templates/cicd-strategy.md';
const TEST_TEMPLATE = 'gsd-core/templates/test-strategy.md';
const TESTING_WORKFLOW = 'gsd-core/workflows/testing-strategy.md';
const SKILL = 'skills/gsd-cicd-strategy/SKILL.md';
const COMMAND = 'commands/gsd/cicd-strategy.md';

/**
 * Data rows of the first markdown table that appears after `heading` (a substring of
 * the heading line). Header + separator are dropped, so the count is the count of
 * decisions the table encodes.
 */
function tableRowsAfter(text, heading) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.includes(heading));
  assert.notEqual(start, -1, `heading not found: ${heading}`);
  const rows = [];
  let seenTable = false;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith('|')) {
      seenTable = true;
      if (/^\|[\s|:-]+\|$/.test(line)) continue; // separator
      rows.push(line);
    } else if (seenTable && line !== '') {
      break;
    }
  }
  assert.ok(seenTable, `no table found after: ${heading}`);
  return rows.slice(1); // drop the header row
}

/** The section body from `heading` up to the next heading of the same-or-higher level. */
function section(text, heading) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.trim().startsWith('#') && l.includes(heading));
  assert.notEqual(start, -1, `section not found: ${heading}`);
  const level = (lines[start].match(/^#+/) || ['#'])[0].length;
  const body = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const m = lines[i].match(/^(#+)\s/);
    if (m && m[1].length <= level) break;
    body.push(lines[i]);
  }
  return body.join('\n');
}

describe('Axis C — the CI rung ladder (reference)', () => {
  test('the reference ships a C0–C3 ladder, one row per rung', () => {
    const ref = read(REFERENCE);
    const rows = tableRowsAfter(ref, 'The CI rung ladder (Axis C)');
    for (const rung of ['C0', 'C1', 'C2', 'C3']) {
      assert.ok(
        rows.some((r) => r.includes(rung)),
        `rung ${rung} missing from the Axis-C ladder table`,
      );
    }
  });

  test('C0 is the floor and names its explicit non-goals', () => {
    const ref = read(REFERENCE);
    const rows = tableRowsAfter(ref, 'The CI rung ladder (Axis C)');
    const c0 = rows.find((r) => r.includes('C0'));
    assert.match(c0, /one job/i, 'C0 must be one workflow, one job');
    // The floor's non-goals must be stated, not implied: an unnamed capability is one
    // the meta-tell check can never fire on.
    for (const nonGoal of [/no matrix/i, /no `?schedule/i, /merge queue/i]) {
      assert.match(c0, nonGoal, `C0 must state its non-goals — missing ${nonGoal}`);
    }
  });

  test('every above-floor C rung carries an entry criterion', () => {
    const ref = read(REFERENCE);
    const rows = tableRowsAfter(ref, 'The CI rung ladder (Axis C)');
    for (const rung of ['C1', 'C2', 'C3']) {
      const row = rows.find((r) => r.includes(rung));
      const cells = row.split('|').map((c) => c.trim()).filter(Boolean);
      // rung · contents · entry criteria (+ promotion trigger) — the criteria cell is
      // what stops a rung from being adopted by default.
      assert.ok(cells.length >= 3, `${rung} row must carry an entry-criteria cell`);
      assert.ok(cells[2].length > 20, `${rung} entry criteria must be substantive`);
    }
  });

  test('scheduled jobs get their own section: four named jobs + an admission gate', () => {
    const ref = read(REFERENCE);
    const s = section(ref, 'When a scheduled job earns its keep');
    for (const job of ['C2-a', 'C2-b', 'C2-c', 'C2-d']) {
      assert.ok(s.includes(job), `scheduled-job section missing ${job}`);
    }
    assert.match(s, /owner/i, 'the admission gate must require a named owner');
    assert.match(s, /triage SLA/i, 'the admission gate must require a triage SLA');
    // The two platform facts that make a naive nightly worse than assumed.
    assert.match(s, /60 days/, 'public-repo auto-disable after 60 idle days must be recorded');
    assert.match(s, /Dependabot/, 'the "Dependabot already schedules this" tell must be recorded');
  });

  test('matrix builds are an explicitly gated decision, default none', () => {
    const ref = read(REFERENCE);
    const s = section(ref, 'Matrix builds');
    assert.match(s, /default:?\s*\*{0,2}no matrix/i, 'the matrix default must be "no matrix"');
    assert.match(s, /supported[- ]platform promise/i, 'the only justification is a support promise');
  });
});

describe('Axis D — the delivery rung ladder (reference)', () => {
  test('the reference ships a D0–D5 ladder, one row per rung', () => {
    const ref = read(REFERENCE);
    const rows = tableRowsAfter(ref, 'The delivery rung ladder (Axis D)');
    for (const rung of ['D0', 'D1', 'D2', 'D3', 'D4', 'D5']) {
      assert.ok(
        rows.some((r) => r.includes(rung)),
        `rung ${rung} missing from the Axis-D ladder table`,
      );
    }
  });

  test('staging is the TOP rung, above progressive rollout and canary', () => {
    const ref = read(REFERENCE);
    const rows = tableRowsAfter(ref, 'The delivery rung ladder (Axis D)');
    const d3 = rows.findIndex((r) => /D3/.test(r));
    const d5 = rows.findIndex((r) => /D5/.test(r));
    assert.ok(d5 > d3, 'staging must sit ABOVE progressive rollout — it is not a stepping stone toward it');
    assert.match(rows[d5], /staging/i, 'the top rung IS the staging environment');
    assert.match(rows[d3], /progressive|weighted/i, 'D3 is the weighted, human-judged rollout');
  });

  test('D0 exists and is gated on zero production users', () => {
    const ref = read(REFERENCE);
    const rows = tableRowsAfter(ref, 'The delivery rung ladder (Axis D)');
    const d0 = rows.find((r) => r.includes('D0'));
    assert.match(d0, /users/i, 'D0 must be gated on production-user exposure');
  });
});

describe('citation honesty', () => {
  const SHIPPED = [WORKFLOW, REFERENCE, TEMPLATE, SKILL, COMMAND];

  test('the canary SLI/traffic thresholds are labelled as GSD\'s heuristic, not Google\'s', () => {
    const ref = read(REFERENCE);
    assert.match(
      ref,
      /GSD'?s heuristic/i,
      'the "~a dozen SLIs / 1–5% slice" numbers are ours — the SRE Workbook states the requirement qualitatively only',
    );
  });

  test('the deliberately-excluded claims never ship', () => {
    for (const file of SHIPPED) {
      const text = read(file);
      // No Radar blip by these names exists.
      assert.doesNotMatch(text, /pipeline as (a )?product/i, `${file}: unverified Radar blip`);
      // Not present in current GitHub billing docs.
      assert.doesNotMatch(text, /10× multiplier|10x multiplier|2× multiplier|2x multiplier/i, `${file}: outdated minute multipliers`);
      // DORA's numeric benchmark table was never read from the primary source.
      assert.doesNotMatch(text, /elite performers?/i, `${file}: unverified DORA benchmark tier`);
    }
  });
});

describe('the templates no longer pre-print the stages', () => {
  test('the CICD template ships ONE pipeline row and a trigger column', () => {
    const tpl = read(TEMPLATE);
    const rows = tableRowsAfter(tpl, 'Pipeline map');
    assert.equal(rows.length, 1, 'exactly one pre-printed stage row — the PR gate');
    assert.match(rows[0], /PR gate/i);
    const header = tpl.split('\n').find((l) => l.includes('| Stage'));
    assert.match(header, /Trigger/i, 'an extra stage row must justify itself in-line');
  });

  test('the CICD template pre-prints no nightly and no merge-to-main stage', () => {
    const tpl = read(TEMPLATE);
    const rows = tableRowsAfter(tpl, 'Pipeline map');
    for (const row of rows) {
      assert.doesNotMatch(row, /nightly/i, 'a pre-printed nightly row IS the over-engineering mechanism');
      assert.doesNotMatch(row, /merge to main/i, 'the second stage is a C1 decision, not a template default');
    }
  });

  test('the TEST-STRATEGY template pre-prints no nightly row either', () => {
    const tpl = read(TEST_TEMPLATE);
    const rows = tableRowsAfter(tpl, 'CI execution map');
    for (const row of rows) {
      assert.doesNotMatch(row, /nightly/i, 'cicd-strategy reads this file — a nightly here is already a "fact"');
    }
    assert.match(tpl, /C1\/C2|C1 \/ C2/, 'the deleted rows must point at cicd-strategy\'s triggers');
  });

  test('testing-strategy stops instructing a three-way PR/merge/nightly split', () => {
    const wf = read(TESTING_WORKFLOW);
    assert.doesNotMatch(
      wf,
      /PR gate vs merge-to-main vs nightly/i,
      'the fill instruction must not assert three stages',
    );
  });

  test('the CICD template opens with the right-sizing facts', () => {
    const tpl = read(TEMPLATE);
    const s = section(tpl, 'Rungs');
    assert.match(s, /CI rung \(Axis C\)/);
    assert.match(s, /Delivery rung \(Axis D\)/);
    assert.match(s, /Suite wall clock/i, 'the number that decides tiering belongs at the top');
    assert.match(s, /Production users/i, 'the strongest right-sizing signal in the domain');
    assert.match(s, /Merges\/week/i);
  });

  test('the deferred block pre-seeds the floor\'s non-goals as decided, not forgotten', () => {
    const tpl = read(TEMPLATE);
    const s = section(tpl, 'Deferred (with triggers)');
    for (const item of [/nightly/i, /matrix/i, /merge queue/i, /staging/i, /canary/i, /preview env/i]) {
      assert.match(s, item, `deferred block must pre-seed ${item}`);
    }
  });

  test('the flaky policy no longer manufactures an SLA for a problem that has not occurred', () => {
    const tpl = read(TEMPLATE);
    const s = section(tpl, 'Flaky-test policy');
    assert.match(s, /no flakes observed yet/i, 'the default state is "no flakes yet"');
    assert.match(s, /retry-until-green/i, 'the canon itself stays');
  });

  test('artifact retention and concurrency join the free floor checklist', () => {
    const tpl = read(TEMPLATE);
    const s = section(tpl, 'Supply-chain checklist');
    assert.match(s, /retention/i, 'the 90-day default is billable and must be set explicitly');
    assert.match(s, /cancel-in-progress/i, 'free spend/latency win — floor material');
  });
});

describe('the workflow measures instead of asking', () => {
  test('the context step derives merge volume and contributors from git', () => {
    const wf = read(WORKFLOW);
    assert.match(wf, /git log[^\n]*--first-parent/, 'merges/week must be measured, not guessed');
    assert.match(wf, /git shortlog/, 'contributor count must be measured, not guessed');
  });

  // `git shortlog` with no revision argument reads STDIN whenever stdout is not
  // a TTY — which is always true inside an agent's Bash tool. Without an explicit
  // revision the emitted command blocks on an empty stdin and CONTRIBUTORS_90D
  // resolves to 0 for every project, silently mis-answering the C3 15-vs-16
  // contributor threshold and the trunk-based-development judgement.
  // Reproduced during realistic testing of the v1.10.0 realignment
  // (.superpowers/sdd/flows-110-report.md §Flow 6): fixture 0 vs 1, this repo 0 vs 40.
  test('every emitted git shortlog carries an explicit revision (never reads stdin)', () => {
    const wf = read(WORKFLOW);
    const invocations = wf.match(/git shortlog[^\n|)]*/g) || [];
    assert.ok(invocations.length > 0, 'expected at least one git shortlog invocation to check');
    for (const invocation of invocations) {
      assert.match(
        invocation,
        /git shortlog\s.*\bHEAD\b/,
        `"${invocation.trim()}" has no revision argument — git shortlog then reads stdin ` +
          'under the agent\'s non-TTY stdout and the count is always 0',
      );
    }
  });

  test('suite wall clock is measured — or explicitly recorded as unmeasured', () => {
    const wf = read(WORKFLOW);
    assert.match(wf, /wall clock/i, 'the single number that decides the pipeline shape');
    assert.match(wf, /unmeasured/i, 'greenfield has no suite yet — say so and default to the floor');
  });

  test('blast radius comes from SECURITY-STRATEGY.md instead of a re-interview', () => {
    const wf = read(WORKFLOW);
    assert.match(wf, /SECURITY-STRATEGY\.md/, 'the authoritative data-classification source');
  });

  test('the ask is reduced to the production-user question first', () => {
    const wf = read(WORKFLOW);
    assert.match(wf, /production users today/i, 'the strongest right-sizing signal must be asked');
  });

  test('the workflow picks a CI rung and a matrix decision as named steps', () => {
    const wf = read(WORKFLOW);
    assert.match(wf, /Pick the CI rung \(Axis C\)/i);
    assert.match(wf, /Matrix check/i);
  });
});

describe('the over/under-engineering check bites', () => {
  test('the downward table enumerates every capability the skill can turn on', () => {
    const wf = read(WORKFLOW);
    const rows = tableRowsAfter(wf, 'Downward (over-engineering)');
    assert.ok(
      rows.length >= 12,
      `the check cannot fire on what it does not name — expected >=12 capability rows, got ${rows.length}`,
    );
    for (const cap of [/second pipeline stage/i, /schedule/i, /matrix/i, /merge queue/i,
      /preview environment/i, /DB branch/i, /feature flag/i, /progressive rollout/i,
      /canary/i, /staging/i, /cloud-native CI/i, /flake fix-SLA|fix-SLA/i]) {
      assert.ok(rows.some((r) => cap.test(r)), `downward table missing a row for ${cap}`);
    }
  });

  test('every downward row names both the forcing fact and where it is observable', () => {
    const wf = read(WORKFLOW);
    const rows = tableRowsAfter(wf, 'Downward (over-engineering)');
    for (const row of rows) {
      const cells = row.split('|').map((c) => c.trim()).filter(Boolean);
      assert.equal(cells.length, 3, `row must be capability | forcing requirement | where observable: ${row}`);
      assert.ok(cells[1].length > 5 && cells[2].length > 5, `empty justification cell: ${row}`);
    }
  });

  test('the upward check names CI theatre as the under-engineering anti-pattern', () => {
    const wf = read(WORKFLOW);
    assert.match(wf, /CI theatre/i, 'a floor that is not actually gating main is theatre (Radar, Hold)');
  });
});

describe('the floor is stated confidently', () => {
  test('the workflow ships a C0+D0 default block that refuses the starter-kit framing', () => {
    const wf = read(WORKFLOW);
    assert.match(wf, /C0 \+ (Rung )?D0|C0\/D0/, 'the common-case default must name both floors');
    assert.match(wf, /not a starter kit/i, 'the floor is the senior answer, not a phase to outgrow');
    assert.match(
      wf,
      /Continuous Integration/,
      'the floor IS the complete DORA Continuous Integration capability — that is the citation',
    );
  });

  test('critical rules carry the three new invariants', () => {
    const wf = read(WORKFLOW);
    const rules = wf.slice(wf.indexOf('<critical_rules>'), wf.indexOf('</critical_rules>'));
    assert.match(rules, /C0 is the default/i);
    assert.match(rules, /owner/i, 'no schedule without an owner + triage SLA');
    assert.match(rules, /matrix/i, 'no matrix without a supported-platform promise');
    assert.match(rules, /production-user exposure/i, 'the ladder follows user exposure, not team size alone');
  });

  test('a single-stage pipeline is a PASSING outcome', () => {
    const wf = read(WORKFLOW);
    const criteria = wf.slice(wf.indexOf('<success_criteria>'), wf.indexOf('</success_criteria>'));
    assert.match(criteria, /single[- ]stage/i, 'today\'s wording effectively required three stages');
    assert.doesNotMatch(criteria, /nightly\s*\+?\s*mutation/i, 'nightly must not be a success criterion');
  });

  test('the FORK:context discussion-log block survives the rewrite', () => {
    const wf = read(WORKFLOW);
    assert.match(wf, /<!-- FORK:context BEGIN -->/);
    assert.match(wf, /<!-- FORK:context END -->/);
    assert.match(wf, /PROJECT-DISCUSSION-LOG\.md/);
  });
});

describe('the skill and command do not drift', () => {
  const descOf = (text) => {
    const line = text.split('\n').find((l) => l.startsWith('description:'));
    assert.ok(line, 'description frontmatter present');
    return line;
  };

  test('both descriptions are single-line and carry the rung vocabulary', () => {
    for (const file of [SKILL, COMMAND]) {
      const line = descOf(read(file));
      assert.match(line, /rung/i, `${file}: the description must sell the right-sizing`);
      // Single-line + quoted: a multi-line or block-scalar description is the YAML
      // strict-parse trap that has bitten this repo before.
      assert.doesNotMatch(line, /[|>]\s*$/, `${file}: no block scalar`);
    }
  });

  test('the skill and command describe the same thing', () => {
    const skillDesc = descOf(read(SKILL)).replace(/^description:\s*"?|"?\s*$/g, '');
    const cmdDesc = descOf(read(COMMAND)).replace(/^description:\s*"?|"?\s*$/g, '');
    assert.equal(skillDesc, cmdDesc, 'SKILL.md and the command must not drift');
  });

  test('--auto names the floor explicitly', () => {
    for (const file of [SKILL, COMMAND]) {
      const text = read(file);
      const autoLine = text.split('\n').find((l) => l.includes('`--auto`'));
      assert.ok(autoLine, `${file}: --auto flag documented`);
      assert.match(autoLine, /C0\/D0|C0 \+ D0/, `${file}: the unattended path must default to the floor`);
    }
  });
});
