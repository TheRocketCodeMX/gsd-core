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

  test('DESIGN-INVENTORY cross-check on (field) source enum', () => {
    const di = '## User-facing fields\n| Field | Surface / screen | Source | Required? | Backs | Captured shape | Notes |\n|---|---|---|---|---|---|---|\n| address | signup | design | yes | — | single free-text input | — |\n';
    assert.ok(g.crossCheck('DESIGN-INVENTORY', 'address @ signup', 'design / single input', di).ok);
    assert.equal(g.crossCheck('DESIGN-INVENTORY', 'address @ signup', 'internal / x', di).ok, false, 'wrong source enum fails');
    assert.equal(g.crossCheck('DESIGN-INVENTORY', 'ghost', 'design / x', di).ok, false, 'unknown field fails');
  });
});
