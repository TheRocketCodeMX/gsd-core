'use strict';

/**
 * emitted-skill-argument-hint.test.cjs — argument-hint survives the
 * command -> SKILL conversion on codex and cursor (e2e-12 F3), asserted on the
 * LIVE converter module AND the real emitted tree.
 *
 * matrix111-b E2 (the false-green lesson): the original test drove
 * `require('../bin/install.js')`'s converter exports — but upstream #2875
 * moved the live skill conversion to the descriptor-resolved module compiled
 * at `gsd-core/bin/lib/runtime-artifact-conversion.cjs`
 * (`runtime-artifact-layout.cjs` binds `conversionExports` from there), so 29
 * assertions passed while the shipped artifact lost the field on 100% of
 * codex/cursor skills. Two layers now:
 *
 *   1. LIVE-MODULE: the same assertions against the compiled conversion
 *      module the descriptor dispatch actually resolves.
 *   2. EMITTED-TREE: a real `install()` into a temp dir (the
 *      emitted-certification-fidelity precedent), asserting the field on the
 *      emitted SKILL.md and the absence of the brand-swap corruption class
 *      (matrix111-b E3: `non-the agent`, `the agent Desktop`) on the skills
 *      path — gsd-spike's "non-Claude runtimes" sentence is the live probe.
 */

process.env.GSD_TEST_MODE = '1';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { cleanup } = require('./helpers.cjs');

const ROOT = path.join(__dirname, '..');

// The LIVE module: what runtime-artifact-layout's descriptor dispatch resolves.
const conversion = require('../gsd-core/bin/lib/runtime-artifact-conversion.cjs');
// The install.js twin keeps its patched copies for its remaining direct call
// sites; reference-identity with the live module is asserted separately below.
const install = require('../bin/install.js');

const CMD_SRC = fs.readFileSync(
  path.join(ROOT, 'commands', 'gsd', 'testing-strategy.md'),
  'utf8',
);

const LIVE_BUILDERS = [
  { name: 'codex', build: (c) => conversion.convertClaudeCommandToCodexSkill(c, 'gsd-testing-strategy') },
  { name: 'cursor', build: (c) => conversion.convertClaudeCommandToCursorSkill(c, 'gsd-testing-strategy') },
];

describe('LIVE converter module preserves argument-hint (e2e-12 F3 / matrix111-b E1)', () => {
  for (const { name, build } of LIVE_BUILDERS) {
    test(`${name}: emitted frontmatter advertises the argument-hint`, () => {
      const skill = build(CMD_SRC);
      const m = skill.match(/^argument-hint:\s*(.+)$/m);
      assert.ok(m, `${name}: SKILL.md must carry an argument-hint frontmatter field`);
      for (const flag of ['--auto', '--text', '--tune-up']) {
        assert.ok(m[1].includes(flag), `${name}: argument-hint must advertise ${flag}; got ${m[1]}`);
      }
    });

    test(`${name}: a command without argument-hint emits none`, () => {
      const bare = '---\nname: gsd:demo\ndescription: A demo command.\n---\n\nBody.\n';
      const skill = build(bare);
      assert.ok(!/^argument-hint:/m.test(skill), `${name}: must not fabricate an argument-hint when the source has none`);
    });
  }
});

describe('LIVE brand swap preserves vendor facts on the skills path (matrix111-b E3)', () => {
  test('non-Claude compounds survive (the gsd-spike:133 corruption class)', () => {
    const out = conversion.convertClaudeCommandToCodexSkill(
      '---\nname: gsd:demo\ndescription: d.\n---\n\nUse text lists instead of AskUserQuestion (for non-Claude runtimes).\n',
      'gsd-demo',
    );
    assert.ok(!out.includes('non-the agent'), 'the (?<!-) lookbehind must keep "non-Claude" intact');
    assert.ok(out.includes('non-Claude'), '"non-Claude runtimes" must survive the brand swap verbatim');
  });

  test('Claude Desktop survives as a vendor product name', () => {
    const out = conversion.convertClaudeCommandToCodexSkill(
      '---\nname: gsd:demo\ndescription: d.\n---\n\nDo you have Codex desktop, Claude Desktop, or onorca available?\n',
      'gsd-demo',
    );
    assert.ok(!out.includes('the agent Desktop'), '` Desktop` must be in the proper-noun allow-list');
    assert.ok(out.includes('Claude Desktop'), '"Claude Desktop" must survive the brand swap verbatim');
  });
});

describe('install.js twin stays in lockstep with the live module', () => {
  // The twin keeps patched copies for its remaining direct call sites. If the
  // two diverge again (the exact drift #2875 caused), this fails loudly.
  for (const fn of ['convertClaudeCommandToCodexSkill', 'convertClaudeCommandToCursorSkill']) {
    test(`${fn}: twin output matches the live module byte-for-byte`, () => {
      assert.equal(
        install[fn](CMD_SRC, 'gsd-testing-strategy'),
        conversion[fn](CMD_SRC, 'gsd-testing-strategy'),
        `${fn}: bin/install.js twin diverged from the live conversion module`,
      );
    });
  }
});

describe('EMITTED tree carries the field (real install, the fidelity-test precedent)', () => {
  test('codex --local: emitted testing-strategy SKILL.md advertises argument-hint; no brand corruption', { timeout: 300000 }, () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-arghint-emit-'));
    const prevCwd = process.cwd();
    try {
      process.chdir(tmp);
      install.install(false, 'codex');
      const skillPath = path.join(tmp, '.codex', 'skills', 'gsd-testing-strategy', 'SKILL.md');
      assert.ok(fs.existsSync(skillPath), `emitted skill missing at ${skillPath}`);
      const skill = fs.readFileSync(skillPath, 'utf8');
      const m = skill.match(/^argument-hint:\s*(.+)$/m);
      assert.ok(m, 'EMITTED codex SKILL.md must carry argument-hint (the shipped artifact, not an export)');
      assert.ok(m[1].includes('--tune-up'), `emitted argument-hint must advertise --tune-up; got ${m[1]}`);

      // The live corruption probe: gsd-spike carries "non-Claude runtimes".
      const spikePath = path.join(tmp, '.codex', 'skills', 'gsd-spike', 'SKILL.md');
      if (fs.existsSync(spikePath)) {
        const spike = fs.readFileSync(spikePath, 'utf8');
        assert.ok(!spike.includes('non-the agent'), 'emitted gsd-spike must not carry the "non-the agent" corruption');
      }
      // Fleet-wide: no emitted skill carries either corruption token.
      const skillsDir = path.join(tmp, '.codex', 'skills');
      const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.md') ? [path.join(d, e.name)] : []);
      for (const f of walk(skillsDir)) {
        const c = fs.readFileSync(f, 'utf8');
        assert.ok(!c.includes('non-the agent'), `${path.relative(tmp, f)}: "non-the agent" corruption`);
        assert.ok(!c.includes('the agent Desktop'), `${path.relative(tmp, f)}: "the agent Desktop" corruption`);
      }
    } finally {
      process.chdir(prevCwd);
      cleanup(tmp);
    }
  });
});
