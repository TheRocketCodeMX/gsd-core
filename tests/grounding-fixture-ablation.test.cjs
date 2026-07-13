'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { cleanup } = require('./helpers.cjs');
const TOOLS = path.resolve(__dirname, '..', 'gsd-core', 'bin', 'gsd-tools.cjs');

// Counter-instinctive fixture: the ADR mandates Transaction Script for the
// `ledger` subdomain — a model would instinctively reach for a Domain Model.
// The gate must BLOCK a plan that drifts to Domain Model, and PASS one that
// honors the ADR. With the gate OFF, the same drift slips through (baseline).
function fixture(planGrounding, gateOff) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-fix-'));
  fs.mkdirSync(path.join(dir, '.planning', 'adr'), { recursive: true });
  const phaseDir = path.join(dir, '.planning', 'phase');
  fs.mkdirSync(phaseDir, { recursive: true });
  fs.writeFileSync(path.join(dir, '.planning', 'PROJECT.md'),
    '## Strategy Plan\n\n| Step | Status |\n|---|---|\n| recommend-architecture | done |\n');
  fs.writeFileSync(path.join(dir, '.planning', 'adr', '0001-architecture.md'),
    '### Axis A\n| Subdomain | Type | Rung | Why |\n|---|---|---|---|\n| ledger | Supporting | Transaction Script | thin CRUD, no rich rules |\n');
  if (gateOff) fs.writeFileSync(path.join(dir, '.planning', 'config.json'), JSON.stringify({ workflow: { grounding_gate: false } }));
  fs.writeFileSync(path.join(phaseDir, '01-01-PLAN.md'), `## Grounding\n${planGrounding}\n\n## Tasks\n- build\n`);
  return { dir, phaseDir };
}
function gate(dir, phaseDir) {
  try { return JSON.parse(execFileSync(process.execPath, [TOOLS, 'query', 'check.grounding-plan', phaseDir], { cwd: dir, encoding: 'utf8' })); }
  catch (e) { return JSON.parse((e.stdout || '{}').trim() || '{}'); }
}

describe('grounding — planted discrepancy + ablation (the realistic proof)', () => {
  test('gate ON: a plan that DRIFTS from the counter-instinctive ADR is blocked', () => {
    const { dir, phaseDir } = fixture('- ADR · ledger → Domain Model', false); // instinct over the ADR
    assert.equal(gate(dir, phaseDir).passed, false, 'drift to Domain Model must be blocked');
    cleanup(dir);
  });

  test('gate ON: a plan that HONORS the ADR (Transaction Script) passes', () => {
    const { dir, phaseDir } = fixture('- ADR · ledger → Transaction Script', false);
    assert.equal(gate(dir, phaseDir).passed, true, 'honoring the ADR passes');
    cleanup(dir);
  });

  test('gate OFF (ablation): the same drift is NOT blocked — the before/after proof', () => {
    const { dir, phaseDir } = fixture('- ADR · ledger → Domain Model', true);
    assert.equal(gate(dir, phaseDir).passed, true, 'gate disabled → drift slips through (baseline)');
    cleanup(dir);
  });
});
