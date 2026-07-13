'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const g = require(path.resolve(__dirname, '..', 'gsd-core', 'bin', 'lib', 'grounding.cjs'));

const ADR = '### Axis A\n| Subdomain | Type | Rung | Why |\n|---|---|---|---|\n| pricing | Core | Domain Model + Hexagonal | second adapter |\n';

describe('grounding citation + cross-check', () => {
  test('parses the ## Grounding block into citations', () => {
    const plan = '## Grounding\n- ADR · pricing → Domain Model + Hexagonal\n- DOMAIN-MODEL · pricing → Core\n\n## Tasks\n';
    const cites = g.parseGroundingBlock(plan);
    assert.equal(cites.length, 2);
    assert.deepEqual(cites[0], { artifact: 'ADR', key: 'pricing', value: 'Domain Model + Hexagonal' });
  });

  test('ADR cross-check passes on set-equality, fails on mismatch/subset/placeholder', () => {
    assert.ok(g.crossCheck('ADR', 'pricing', 'Domain Model + Hexagonal', ADR).ok);
    assert.equal(g.crossCheck('ADR', 'pricing', 'Domain Model', ADR).ok, false, 'subset must fail');
    assert.equal(g.crossCheck('ADR', 'pricing', 'Transaction Script', ADR).ok, false, 'wrong rung fails');
    assert.equal(g.crossCheck('ADR', 'nope', 'Domain Model', ADR).ok, false, 'unknown subdomain fails');
    const placeholder = '### Axis A\n| Subdomain | Type | Rung | Why |\n|---|---|---|---|\n| [core] | Core | [Transaction Script / Domain Model] | x |\n';
    assert.equal(g.crossCheck('ADR', '[core]', '[Transaction Script / Domain Model]', placeholder).ok, false, 'placeholder cell must fail');
  });

  test('DOMAIN-MODEL and TEST-STRATEGY cross-check on their table cells', () => {
    const dm = '## Subdomains\n| Subdomain | Type |\n|---|---|\n| pricing | Core |\n';
    assert.ok(g.crossCheck('DOMAIN-MODEL', 'pricing', 'Core', dm).ok);
    assert.equal(g.crossCheck('DOMAIN-MODEL', 'pricing', 'Generic', dm).ok, false);
    const ts = '## Level emphasis\n| Subdomain | Architecture rung | Primary level (small/medium/large) | Why |\n|---|---|---|---|\n| pricing | Domain Model | small (unit) + medium for adapters | logic |\n';
    assert.ok(g.crossCheck('TEST-STRATEGY', 'pricing', 'small', ts).ok, 'leading token matches');
    assert.equal(g.crossCheck('TEST-STRATEGY', 'pricing', 'medium', ts).ok, false, 'the non-leading token must not pass as primary');
  });

  test('key near-miss (parenthetical qualifier) gets a did-you-mean reason (#21 P2e)', () => {
    const adr = '### Axis A\n| Subdomain | Type | Rung | Why |\n|---|---|---|---|\n| pricing (core) | Core | Domain Model | rich |\n';
    const r = g.crossCheck('ADR', 'pricing', 'Domain Model', adr);
    assert.equal(r.ok, false);
    assert.match(r.reason, /did you mean "pricing \(core\)"\?/,
      'a qualifier-only miss should teach the exact row key');
    const rGhost = g.crossCheck('ADR', 'ghost', 'Domain Model', adr);
    assert.ok(!/did you mean/.test(rGhost.reason), 'a genuine fabrication gets no suggestion');
  });

  test('DESIGN-INVENTORY cross-check on (field) source enum', () => {
    const di = '## User-facing fields\n| Field | Surface / screen | Source | Required? | Backs | Captured shape | Notes |\n|---|---|---|---|---|---|---|\n| address | signup | design | yes | — | single free-text input | — |\n';
    assert.ok(g.crossCheck('DESIGN-INVENTORY', 'address @ signup', 'design / single input', di).ok);
    assert.equal(g.crossCheck('DESIGN-INVENTORY', 'address @ signup', 'internal / x', di).ok, false, 'wrong source enum fails');
    assert.equal(g.crossCheck('DESIGN-INVENTORY', 'ghost', 'design / x', di).ok, false, 'unknown field fails');
  });
});

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const { cleanup } = require('./helpers.cjs');
const TOOLS = path.resolve(__dirname, '..', 'gsd-core', 'bin', 'gsd-tools.cjs');

function runGate(dir, phaseDir) {
  try {
    return JSON.parse(execFileSync(process.execPath, [TOOLS, 'query', 'check.grounding-plan', phaseDir], { cwd: dir, encoding: 'utf8' }));
  } catch (e) {
    return JSON.parse((e.stdout || '{}').trim() || '{}');
  }
}

function gateProject(planBody, config) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-gate-'));
  fs.mkdirSync(path.join(dir, '.planning', 'adr'), { recursive: true });
  const phaseDir = path.join(dir, '.planning', 'phase');
  fs.mkdirSync(phaseDir, { recursive: true });
  fs.writeFileSync(path.join(dir, '.planning', 'PROJECT.md'),
    '## Strategy Plan\n\n| Step | Status |\n|---|---|\n| recommend-architecture | done |\n');
  fs.writeFileSync(path.join(dir, '.planning', 'adr', '0001-architecture.md'),
    '### Axis A\n| Subdomain | Type | Rung | Why |\n|---|---|---|---|\n| pricing | Core | Domain Model | rich |\n');
  if (config) fs.writeFileSync(path.join(dir, '.planning', 'config.json'), JSON.stringify(config));
  fs.writeFileSync(path.join(phaseDir, '01-01-PLAN.md'), planBody);
  return { dir, phaseDir };
}

describe('grounding gate (blocking)', () => {
  test('missing citation for a done source → gate fails', () => {
    const { dir, phaseDir } = gateProject('## Objective\nbuild it\n## Tasks\n- do\n');
    assert.equal(runGate(dir, phaseDir).passed, false);
    cleanup(dir);
  });

  test('correct citation → gate passes', () => {
    const { dir, phaseDir } = gateProject('## Grounding\n- ADR · pricing → Domain Model\n## Tasks\n- do\n');
    assert.equal(runGate(dir, phaseDir).passed, true);
    cleanup(dir);
  });

  test('wrong rung → gate fails with reason', () => {
    const { dir, phaseDir } = gateProject('## Grounding\n- ADR · pricing → Transaction Script\n## Tasks\n- do\n');
    const j = runGate(dir, phaseDir);
    assert.equal(j.passed, false);
    assert.match(j.message, /mismatch/i);
    cleanup(dir);
  });

  test('workflow.grounding_gate=false → skipped/pass', () => {
    const { dir, phaseDir } = gateProject('## Objective\nno grounding\n', { workflow: { grounding_gate: false } });
    assert.equal(runGate(dir, phaseDir).passed, true);
    cleanup(dir);
  });

  test('ALL citations must pass: a valid line cannot carry a bogus sibling (#21 P1-1)', () => {
    // Pre-fix, ONE valid citation per artifact satisfied the gate (anyOk), so a
    // fabricated sibling line rode through unchecked. Every line must now pass.
    const { dir, phaseDir } = gateProject(
      '## Grounding\n- ADR · pricing → Domain Model\n- ADR · billing → Event Sourcing\n## Tasks\n- do\n');
    const j = runGate(dir, phaseDir);
    assert.equal(j.passed, false, 'the fabricated sibling citation must block');
    assert.match(j.message, /billing/, 'the failing line is reported');
    cleanup(dir);
  });

  test('every failing line is reported individually', () => {
    const { dir, phaseDir } = gateProject(
      '## Grounding\n- ADR · pricing → Transaction Script\n- ADR · ghost → Domain Model\n## Tasks\n- do\n');
    const j = runGate(dir, phaseDir);
    assert.equal(j.passed, false);
    assert.match(j.message, /pricing/, 'mismatched rung line reported');
    assert.match(j.message, /ghost/, 'unknown subdomain line reported');
    cleanup(dir);
  });

  test('multiple valid citations for one artifact still pass', () => {
    const { dir, phaseDir } = gateProject(
      '## Grounding\n- ADR · pricing → Domain Model\n- ADR · pricing → Domain Model\n## Tasks\n- do\n');
    assert.equal(runGate(dir, phaseDir).passed, true);
    cleanup(dir);
  });

  test('reports plans_scanned so a vacuous pass is visible (#21 P1-4)', () => {
    const { dir, phaseDir } = gateProject('## Grounding\n- ADR · pricing → Domain Model\n## Tasks\n- do\n');
    const j = runGate(dir, phaseDir);
    assert.equal(j.passed, true);
    assert.equal(j.plans_scanned, 1, 'the matched *-PLAN.md count is reported');
    cleanup(dir);
  });

  test('plan-like files that do not match *-PLAN.md produce a warning, not a silent pass (#21 P1-4)', () => {
    // A phase dir containing only e.g. 01-01-plan.md (wrong case) previously
    // returned passed:true with no signal that ZERO plans were actually read.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-gate-'));
    const phaseDir = path.join(dir, '.planning', 'phase');
    fs.mkdirSync(phaseDir, { recursive: true });
    fs.writeFileSync(path.join(dir, '.planning', 'PROJECT.md'), '# P\n');
    fs.writeFileSync(path.join(phaseDir, '01-01-plan.md'), '## Grounding\n\n## Tasks\n- do\n');
    const j = runGate(dir, phaseDir);
    assert.equal(j.passed, true, 'passed semantics unchanged (nothing required)');
    assert.equal(j.plans_scanned, 0);
    assert.ok(Array.isArray(j.warnings) && j.warnings.some((w) => /01-01-plan\.md/.test(w)),
      `expected a near-miss warning naming 01-01-plan.md, got: ${JSON.stringify(j.warnings)}`);
    cleanup(dir);
  });
});
