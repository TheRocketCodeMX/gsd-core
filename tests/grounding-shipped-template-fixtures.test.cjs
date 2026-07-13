// allow-test-rule: source-text-is-the-product — see TheRocketCodeMX/gsd-core#21
// Fixture oracles are built from the SHIPPED gsd-core/templates/*.md files —
// the template text IS the artifact shape the parser must accept at runtime.

/**
 * Grounding cross-check × SHIPPED templates (issue #21, P0-2).
 *
 * The beta.1 escape class: unit tests hand-wrote their fixture table headers
 * (`| Field |`), so they never exercised the header the shipped template
 * actually emits (`| Field (user-facing label/name) |`) — and the parser's
 * strict header regex could never match a real artifact, making the
 * DESIGN-INVENTORY honoring path unreachable. Every fixture here is built by
 * loading the shipped template file and filling rows, never by hand-writing
 * headers, so template ↔ parser drift fails HERE instead of in the field.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { cleanup } = require('./helpers.cjs');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATES = path.join(ROOT, 'gsd-core', 'templates');
const TOOLS = path.join(ROOT, 'gsd-core', 'bin', 'gsd-tools.cjs');
const g = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'grounding.cjs'));

function template(name) {
  return fs.readFileSync(path.join(TEMPLATES, name), 'utf8');
}

/**
 * Fill a shipped template's table: locate the line containing headerSnippet
 * (the template's REAL header row), skip its alignment row, and insert the
 * given data rows. Throws if the header is not found — that failure means the
 * shipped template changed shape and this fixture (and likely the parser)
 * must follow.
 */
function fillTable(templateText, headerSnippet, rows) {
  const lines = templateText.split('\n');
  const idx = lines.findIndex((l) => l.includes(headerSnippet));
  assert.notEqual(idx, -1, `template no longer contains the header snippet "${headerSnippet}"`);
  lines.splice(idx + 2, 0, ...rows);
  return lines.join('\n');
}

describe('DESIGN-INVENTORY × shipped template (the escaped class)', () => {
  const HEADER = '| Field (user-facing label/name) |';

  test('honoring citation passes against the shipped template header', () => {
    const inv = fillTable(template('design-inventory.md'), HEADER,
      ['| address | signup | design | yes | — | single free-text input | — |']);
    const r = g.crossCheck('DESIGN-INVENTORY', 'address @ signup', 'design / single input', inv);
    assert.ok(r.ok, `the honoring path must be reachable with the SHIPPED header: ${r.reason}`);
  });

  test('drifting citation blocks against the shipped template header', () => {
    const inv = fillTable(template('design-inventory.md'), HEADER,
      ['| address | signup | design | yes | — | single free-text input | — |']);
    assert.equal(g.crossCheck('DESIGN-INVENTORY', 'address @ signup', 'internal / x', inv).ok, false,
      'wrong source enum must still block');
    assert.equal(g.crossCheck('DESIGN-INVENTORY', 'ghost @ signup', 'design / x', inv).ok, false,
      'unknown field must still block');
  });

  test('end-to-end gate: honoring passes, drifting blocks, with the shipped template on disk', () => {
    function project(citation) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-tpl-gate-'));
      const phaseDir = path.join(dir, '.planning', 'phase');
      fs.mkdirSync(phaseDir, { recursive: true });
      fs.writeFileSync(path.join(dir, '.planning', 'PROJECT.md'), '# P\n');
      fs.writeFileSync(path.join(dir, '.planning', 'DESIGN-INVENTORY.md'),
        fillTable(template('design-inventory.md'), HEADER,
          ['| address | signup | design | yes | — | single free-text input | — |']));
      fs.writeFileSync(path.join(phaseDir, '01-01-PLAN.md'),
        `## Grounding\n${citation}\n\n## Tasks\n- build\n`);
      return { dir, phaseDir };
    }
    function gate(dir, phaseDir) {
      try { return JSON.parse(execFileSync(process.execPath, [TOOLS, 'query', 'check.grounding-plan', phaseDir], { cwd: dir, encoding: 'utf8' })); }
      catch (e) { return JSON.parse((e.stdout || '{}').trim() || '{}'); }
    }
    const honoring = project('- DESIGN-INVENTORY · address @ signup → design / single input');
    assert.equal(gate(honoring.dir, honoring.phaseDir).passed, true, 'honoring must pass end-to-end');
    cleanup(honoring.dir);
    const drifting = project('- DESIGN-INVENTORY · address @ signup → internal / four fields');
    assert.equal(gate(drifting.dir, drifting.phaseDir).passed, false, 'drift must block end-to-end');
    cleanup(drifting.dir);
  });
});

describe('ADR / DOMAIN-MODEL / TEST-STRATEGY × shipped templates', () => {
  test('ADR: shipped Axis-A header parses; rung set-equality still enforced', () => {
    const adr = fillTable(template('adr.md'), '| Subdomain | Type (from DOMAIN-MODEL) |',
      ['| pricing | Core | Domain Model + Hexagonal | second adapter |']);
    assert.ok(g.crossCheck('ADR', 'pricing', 'Domain Model + Hexagonal', adr).ok);
    assert.equal(g.crossCheck('ADR', 'pricing', 'Domain Model', adr).ok, false, 'subset must fail');
    assert.equal(g.crossCheck('ADR', 'nope', 'Domain Model', adr).ok, false, 'unknown subdomain fails');
  });

  test('DOMAIN-MODEL: shipped Subdomains header parses; Type checked', () => {
    const dm = fillTable(template('domain-model.md'), '| Subdomain | Type | Description |',
      ['| pricing | Core | computes quotes | invariants | high |']);
    assert.ok(g.crossCheck('DOMAIN-MODEL', 'pricing', 'Core', dm).ok);
    assert.equal(g.crossCheck('DOMAIN-MODEL', 'pricing', 'Generic', dm).ok, false);
  });

  test('TEST-STRATEGY: shipped level-emphasis header parses; primary level checked', () => {
    const ts = fillTable(template('test-strategy.md'), '| Subdomain | Architecture rung |',
      ['| pricing | Domain Model | small (unit, via public API) + medium for adapters | rich pure logic |']);
    assert.ok(g.crossCheck('TEST-STRATEGY', 'pricing', 'small', ts).ok, 'leading token matches');
    assert.equal(g.crossCheck('TEST-STRATEGY', 'pricing', 'medium', ts).ok, false, 'non-leading token fails');
  });
});
