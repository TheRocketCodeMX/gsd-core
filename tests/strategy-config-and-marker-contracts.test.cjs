'use strict';

/**
 * Durability contracts for the strategy-chain wiring (Waves 0–5 expansion).
 *
 * These pin two runtime contracts that a green suite previously did NOT catch,
 * so the bugs only surfaced in a manual audit:
 *
 *  1. config-SET key validity — `config-set` is STRICT (validates against the
 *     schema and ABORTS the step on an unknown key), unlike `config-get` which
 *     is lenient (returns not-found/default). The security-strategy workflow
 *     shipped a `config-set security_asvs_level` (bare) where the schema only
 *     registers `workflow.security_asvs_level`, so the write silently aborted.
 *     This scanner asserts every literal `config-set <key>` a workflow issues
 *     uses a key that passes isValidConfigKey.
 *
 *  2. Roadmap-elaboration idempotency marker — plan-phase greps ROADMAP.md for
 *     a literal string to decide whether the once-per-milestone elaboration has
 *     run; gsd-roadmapper writes that marker. If the two strings drift, the gate
 *     either never fires or fires forever. This pins the grep literal as a
 *     substring of the marker the roadmapper writes.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WORKFLOWS_DIR = path.join(ROOT, 'gsd-core', 'workflows');
const AGENTS_DIR = path.join(ROOT, 'agents');
const { isValidConfigKey } = require('../gsd-core/bin/lib/config-schema.cjs');

function workflowFiles() {
  return fs.readdirSync(WORKFLOWS_DIR).filter((f) => f.endsWith('.md'));
}

describe('CONFIG: workflows only config-set valid keys (#security_asvs_level regression)', () => {
  // A literal key looks like `a.b_c`. We deliberately SKIP:
  //  - keys ending in '.' — a truncated dynamic key where a $VAR/placeholder
  //    follows (e.g. `config-set agent_skills.$AGENT`), validated by pattern at runtime.
  //  - anything containing uppercase / '$' / '<' / '{' — a placeholder, not a literal key.
  const LITERAL_KEY = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$|^[a-z][a-z0-9_]*$/;

  for (const file of workflowFiles()) {
    const content = fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf8');
    const matches = [...content.matchAll(/config-set\s+([^\s]+)/g)];
    if (matches.length === 0) continue;

    test(`${file}: every config-set key is schema-valid`, () => {
      for (const m of matches) {
        const key = m[1];
        // Skip placeholders and truncated dynamic keys.
        if (key.endsWith('.')) continue;
        if (/[A-Z$<{]/.test(key)) continue;
        if (!LITERAL_KEY.test(key)) continue;
        assert.ok(
          isValidConfigKey(key),
          `${file} issues \`config-set ${key}\` but ${key} is not a valid config key. ` +
            `config-set is STRICT — this aborts the step at runtime. ` +
            `Register it in config-schema.manifest.json or fix the key (e.g. namespace it under workflow.*).`
        );
      }
    });
  }
});

describe('MARKER: roadmap-elaboration idempotency contract (plan-phase ⇄ gsd-roadmapper)', () => {
  const planPhase = fs.readFileSync(path.join(WORKFLOWS_DIR, 'plan-phase.md'), 'utf8');
  const roadmapper = fs.readFileSync(path.join(AGENTS_DIR, 'gsd-roadmapper.md'), 'utf8');

  test('plan-phase greps for the elaboration marker', () => {
    const grep = planPhase.match(/grep -q '([^']*Elaborated[^']*)'/);
    assert.ok(grep, 'plan-phase.md must grep ROADMAP.md for the elaboration marker literal');
  });

  test('the grep literal is a substring of the marker gsd-roadmapper writes', () => {
    const grep = planPhase.match(/grep -q '([^']*Elaborated[^']*)'/);
    const literal = grep[1];
    assert.ok(
      roadmapper.includes(literal),
      `plan-phase greps '${literal}' but gsd-roadmapper.md never writes that exact string — ` +
        `the once-per-milestone elaboration gate would never become idempotent. ` +
        `Keep the marker string identical in both files.`
    );
  });
});
