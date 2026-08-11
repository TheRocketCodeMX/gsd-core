'use strict';

/**
 * emitted-skill-argument-hint.test.cjs — argument-hint survives the
 * command -> SKILL conversion on codex and cursor (e2e-12 F3).
 *
 * The Claude command `commands/gsd/testing-strategy.md` advertises
 * `argument-hint: "[--auto] [--text] [--tune-up]"`. Copilot and qwen preserve
 * it in the emitted SKILL frontmatter; codex and cursor dropped it, so
 * `--tune-up` (and the other modifiers) became undiscoverable from the skill
 * signature on those two runtimes — even though the body still handles them.
 * This restores it at the invocation surface, matching the copilot/qwen shape.
 */

process.env.GSD_TEST_MODE = '1';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const install = require('../bin/install.js');

const CMD_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'commands', 'gsd', 'testing-strategy.md'),
  'utf8',
);

const BUILDERS = [
  { name: 'codex', build: (c) => install.convertClaudeCommandToCodexSkill(c, 'gsd-testing-strategy') },
  { name: 'cursor', build: (c) => install.convertClaudeCommandToCursorSkill(c, 'gsd-testing-strategy') },
];

describe('codex/cursor SKILL emit preserves argument-hint (e2e-12 F3)', () => {
  for (const { name, build } of BUILDERS) {
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
