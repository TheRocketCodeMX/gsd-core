'use strict';

/**
 * Task 14: Enforcement — verifier strategy set + researcher ADR path.
 *
 * Two enforcement holes found in the fork's agent audit:
 *   1. gsd-verifier's strategy-fit gate only honors FRONTEND-ARCHITECTURE.md
 *      and SECURITY-STRATEGY.md, so drift from DOMAIN-MODEL.md (subdomain
 *      classification) or TEST-STRATEGY.md (per-subdomain test levels)
 *      passes verification silently.
 *   2. gsd-phase-researcher is told to fit the ADR's architecture rung but
 *      is never given the ADR path — it can recommend a stack that
 *      contradicts the decided architecture.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('gsd-verifier.md: strategy-fit gate names all four strategy artifacts', () => {
  const content = fs.readFileSync(path.join(ROOT, 'agents', 'gsd-verifier.md'), 'utf8');

  // Window from the Strategy-fit bullet through the end of its FORK:context
  // extension (or the next bullet, whichever comes first) — tolerant of the
  // inline FORK marker comments splitting the paragraph across lines.
  function strategyFitSection() {
    const start = content.indexOf('**Strategy-fit:**');
    assert.notEqual(start, -1, 'expected a Strategy-fit gate bullet in gsd-verifier.md');
    const nextBullet = content.indexOf('\n- **', start + 1);
    const end = nextBullet === -1 ? content.length : nextBullet;
    return content.slice(start, end);
  }

  test('strategy-fit section names DOMAIN-MODEL.md, TEST-STRATEGY.md, FRONTEND-ARCHITECTURE.md, SECURITY-STRATEGY.md', () => {
    const section = strategyFitSection();
    for (const artifact of ['DOMAIN-MODEL.md', 'TEST-STRATEGY.md', 'FRONTEND-ARCHITECTURE.md', 'SECURITY-STRATEGY.md']) {
      assert.ok(section.includes(artifact), `Strategy-fit section must name ${artifact}, got:\n${section}`);
    }
  });

  test('a violation is framed as a gap, matching the verifier\'s existing severity vocabulary', () => {
    assert.match(strategyFitSection(), /gap/i);
  });
});

describe('gsd-phase-researcher.md: reads ADR + DOMAIN-MODEL.md before researching', () => {
  const content = fs.readFileSync(path.join(ROOT, 'agents', 'gsd-phase-researcher.md'), 'utf8');

  test('matches .planning/adr/ path', () => {
    assert.match(content, /\.planning\/adr\//);
  });

  test('matches DOMAIN-MODEL.md', () => {
    assert.match(content, /DOMAIN-MODEL\.md/);
  });

  test('instructs reading these BEFORE researching', () => {
    assert.match(content, /\.planning\/adr\/[^\n]*BEFORE researching|BEFORE researching[^\n]*\.planning\/adr\//s);
  });
});

/**
 * Task 16: Enforcement — deviations in SUMMARY frontmatter.
 *
 * Forward-loss flaw: executor deviations are recorded in SUMMARY.md's
 * `## Deviations from Plan` PROSE section — but under the default context
 * budget, the next phase's planner reads SUMMARY frontmatter only, so phase
 * N's deviations are invisible to phase N+1 planning. Fix: a structured
 * `deviations:` frontmatter field mirroring the prose section.
 */

describe('templates/summary.md: deviations: frontmatter field mirrors the prose section', () => {
  const content = fs.readFileSync(path.join(ROOT, 'gsd-core', 'templates', 'summary.md'), 'utf8');

  test('has a deviations: frontmatter example with rule/what/why keys', () => {
    const devBlockMatch = content.match(/deviations:[\s\S]*?\n\n/);
    assert.ok(devBlockMatch, 'expected a deviations: frontmatter example block');
    const block = devBlockMatch[0];
    for (const key of ['rule:', 'what:', 'why:']) {
      assert.ok(block.includes(key), `deviations: example must include ${key}, got:\n${block}`);
    }
  });

  test('guidance states frontmatter-only readers cannot see the prose section', () => {
    assert.match(content, /frontmatter-only readers/i);
    assert.match(content, /prose section is invisible/i);
  });
});

describe('gsd-executor.md: summary-writing instruction mirrors deviations into frontmatter', () => {
  const content = fs.readFileSync(path.join(ROOT, 'agents', 'gsd-executor.md'), 'utf8');

  test('matches deviations:/frontmatter cross-reference', () => {
    assert.match(content, /deviations:.*frontmatter|frontmatter.*deviations:/s);
  });

  test('instructs mirroring each Deviations from Plan entry into the deviations: list', () => {
    assert.match(content, /mirror every.*Deviations from Plan.*deviations:/is);
  });
});
