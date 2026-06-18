'use strict';

/**
 * feat-1173: Descriptor-driven agent converter wiring.
 *
 * Verifies that the descriptor-driven install path (dispatchKindEntry) applies
 * per-runtime agent conversion when the 'agents' kind entry has a non-null
 * converter — instead of silently raw-copying.
 *
 * Behavioral assertions: invoke the staging/dispatch seam, inspect the staged
 * output files. NOT source-grep.
 *
 * TDD flow (REGRESSION-MUST-FAIL-FIRST rule):
 *   Before the fix, dispatchKindEntry ignores the converter for agents kind and
 *   raw-copies. The tests below prove conversion is applied by asserting that
 *   the staged .md contains runtime-specific frontmatter transformations absent
 *   in the raw source.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const ROOT = path.join(__dirname, '..');

const {
  resolveRuntimeArtifactLayoutFromRegistry,
} = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'runtime-artifact-layout.cjs'));

const {
  cleanupStagedSkills,
} = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'install-profiles.cjs'));

const { cleanup } = require('./helpers.cjs');

// ─── fixtures ────────────────────────────────────────────────────────────────

/**
 * Minimal Claude agent source with comma-separated tools (Claude format).
 * Copilot conversion turns tools into a JSON array (CONV-04/05).
 * Codex conversion adds <codex_agent_role> block.
 * Cursor/Windsurf/Augment/Trae/Codebuddy/Cline conversion strips color field.
 */
const CLAUDE_AGENT_SOURCE = `---
name: gsd-planner
description: A GSD planning agent.
tools: Bash, Read, Write
color: blue
---

# GSD Planner

This agent plans GSD phases using ~/.claude/skills.
`;

/**
 * Create a temp agents directory with a .gsd-source marker pointing back to it
 * (so findAgentsSourceRoot finds the fixture dir, not the real agents/ dir).
 * The .gsd-source convention expects the marker to point at a commands/gsd dir;
 * agents/ is resolved as a sibling of commands/. So we set up:
 *   <tmproot>/
 *     commands/gsd/       (empty, satisfies the sibling check)
 *     agents/
 *       gsd-planner.md
 *     .gsd-source         <- points to <tmproot>/commands/gsd
 */
function makeFixtureRoot(agentFiles) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-1173-root-'));
  const commandsDir = path.join(root, 'commands', 'gsd');
  const agentsDir = path.join(root, 'agents');
  fs.mkdirSync(commandsDir, { recursive: true });
  fs.mkdirSync(agentsDir, { recursive: true });
  // .gsd-source marker must point to commands/gsd so that agentsSourceRoot resolves to agents/
  fs.writeFileSync(path.join(root, '.gsd-source'), commandsDir + '\n', 'utf8');
  for (const { name, content } of agentFiles) {
    fs.writeFileSync(path.join(agentsDir, name), content, 'utf8');
  }
  return root;
}

function makeSyntheticRegistry(converterName) {
  return {
    runtimes: {
      testruntime: {
        runtime: {
          artifactLayout: {
            global: [
              {
                kind: 'agents',
                destSubpath: 'agents',
                prefix: 'gsd-',
                nesting: 'flat',
                recursive: false,
                converter: converterName,
              },
            ],
            local: [],
          },
        },
      },
    },
  };
}

// ─── stageAgentsForRuntimeWithConverter unit tests ────────────────────────────

describe('feat-1173: stageAgentsForRuntimeWithConverter', () => {
  test('is exported from install-profiles', () => {
    const installProfiles = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'install-profiles.cjs'));
    assert.strictEqual(
      typeof installProfiles.stageAgentsForRuntimeWithConverter,
      'function',
      'stageAgentsForRuntimeWithConverter must be exported',
    );
  });

  test('applies converter to each staged agent file', (t) => {
    const { stageAgentsForRuntimeWithConverter } = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'install-profiles.cjs'));

    const agentsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-1173-agents-'));
    fs.writeFileSync(path.join(agentsDir, 'gsd-planner.md'), CLAUDE_AGENT_SOURCE, 'utf8');
    fs.writeFileSync(path.join(agentsDir, 'gsd-executor.md'), CLAUDE_AGENT_SOURCE.replace('gsd-planner', 'gsd-executor'), 'utf8');

    t.after(() => {
      cleanup(agentsDir);
      cleanupStagedSkills();
    });

    const calls = [];
    const converter = (content) => {
      calls.push(content);
      return content.replace('~/.claude/', '~/.copilot/');
    };

    const resolvedProfile = { name: 'full', skills: '*', agents: new Set() };
    const stagedDir = stageAgentsForRuntimeWithConverter(agentsDir, resolvedProfile, converter);

    assert.strictEqual(calls.length, 2, 'converter called for each agent file');
    const stagedFiles = fs.readdirSync(stagedDir).sort();
    assert.deepStrictEqual(stagedFiles, ['gsd-executor.md', 'gsd-planner.md']);

    // Converter replaced ~/.claude/ with ~/.copilot/ in all staged files
    for (const file of stagedFiles) {
      const content = fs.readFileSync(path.join(stagedDir, file), 'utf8');
      assert.ok(!content.includes('~/.claude/'), `${file}: converter must have replaced ~/.claude/`);
      assert.ok(content.includes('~/.copilot/'), `${file}: converter must have injected ~/.copilot/`);
    }
  });

  test('non-existent srcAgentsDir returns srcAgentsDir unchanged', () => {
    const { stageAgentsForRuntimeWithConverter } = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'install-profiles.cjs'));
    const ghost = path.join(os.tmpdir(), 'gsd-1173-no-exist-' + Date.now());
    const converter = (c) => c;
    const result = stageAgentsForRuntimeWithConverter(ghost, { name: 'full', skills: '*', agents: new Set() }, converter);
    assert.strictEqual(result, ghost, 'must return srcAgentsDir unchanged for non-existent dir');
  });

  test('only copies .md files (ignores non-.md)', (t) => {
    const { stageAgentsForRuntimeWithConverter } = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'install-profiles.cjs'));
    const agentsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-1173-agents-'));
    fs.writeFileSync(path.join(agentsDir, 'gsd-planner.md'), CLAUDE_AGENT_SOURCE, 'utf8');
    fs.writeFileSync(path.join(agentsDir, 'README.txt'), 'not an agent', 'utf8');

    t.after(() => {
      cleanup(agentsDir);
      cleanupStagedSkills();
    });

    const converter = (c) => c;
    const resolvedProfile = { name: 'full', skills: '*', agents: new Set() };
    const stagedDir = stageAgentsForRuntimeWithConverter(agentsDir, resolvedProfile, converter);
    const stagedFiles = fs.readdirSync(stagedDir);
    assert.deepStrictEqual(stagedFiles, ['gsd-planner.md'], 'only .md files should be staged');
  });
});

// ─── dispatchKindEntry wiring tests ──────────────────────────────────────────

describe('feat-1173: dispatchKindEntry agents converter wiring', () => {
  test('agents kind with convertClaudeAgentToCopilotAgent converter applies copilot conversion', (t) => {
    const fixtureRoot = makeFixtureRoot([{ name: 'gsd-planner.md', content: CLAUDE_AGENT_SOURCE }]);
    t.after(() => {
      cleanup(fixtureRoot);
      cleanupStagedSkills();
    });

    const registry = makeSyntheticRegistry('convertClaudeAgentToCopilotAgent');
    const layout = resolveRuntimeArtifactLayoutFromRegistry(
      registry, 'testruntime', fixtureRoot, 'global',
    );

    assert.strictEqual(layout.kinds.length, 1);
    const agentKind = layout.kinds[0];
    assert.strictEqual(agentKind.kind, 'agents');

    const resolvedProfile = { name: 'full', skills: '*', agents: new Set() };
    const stagedDir = agentKind.stage(resolvedProfile);

    const stagedFile = path.join(stagedDir, 'gsd-planner.md');
    assert.ok(fs.existsSync(stagedFile), `staged file must exist: ${stagedFile}`);

    const stagedContent = fs.readFileSync(stagedFile, 'utf8');

    // Copilot CONV-04/05: tools converted from "Bash, Read, Write" to JSON array "['bash', 'read', 'write']"
    // Raw copy would keep the original comma-separated "tools: Bash, Read, Write" line.
    assert.notStrictEqual(stagedContent, CLAUDE_AGENT_SOURCE, 'converter must have transformed the content');
    assert.ok(
      stagedContent.includes("tools: ['") || stagedContent.includes('tools: ['),
      `Copilot conversion must produce JSON array tools. Got:\n${stagedContent.slice(0, 300)}`,
    );
  });

  test('agents kind with convertClaudeAgentToCodexAgent converter applies codex conversion', (t) => {
    const fixtureRoot = makeFixtureRoot([{ name: 'gsd-planner.md', content: CLAUDE_AGENT_SOURCE }]);
    t.after(() => {
      cleanup(fixtureRoot);
      cleanupStagedSkills();
    });

    const registry = makeSyntheticRegistry('convertClaudeAgentToCodexAgent');
    const layout = resolveRuntimeArtifactLayoutFromRegistry(
      registry, 'testruntime', fixtureRoot, 'global',
    );

    const agentKind = layout.kinds[0];
    const resolvedProfile = { name: 'full', skills: '*', agents: new Set() };
    const stagedDir = agentKind.stage(resolvedProfile);

    const stagedContent = fs.readFileSync(path.join(stagedDir, 'gsd-planner.md'), 'utf8');

    // Codex conversion adds <codex_agent_role> block
    assert.notStrictEqual(stagedContent, CLAUDE_AGENT_SOURCE, 'converter must have transformed the content');
    assert.ok(
      stagedContent.includes('<codex_agent_role>'),
      `Codex conversion must add <codex_agent_role>. Got:\n${stagedContent.slice(0, 300)}`,
    );
  });

  test('agents kind with convertClaudeAgentToCursorAgent converter applies cursor conversion', (t) => {
    const fixtureRoot = makeFixtureRoot([{ name: 'gsd-planner.md', content: CLAUDE_AGENT_SOURCE }]);
    t.after(() => {
      cleanup(fixtureRoot);
      cleanupStagedSkills();
    });

    const registry = makeSyntheticRegistry('convertClaudeAgentToCursorAgent');
    const layout = resolveRuntimeArtifactLayoutFromRegistry(
      registry, 'testruntime', fixtureRoot, 'global',
    );

    const agentKind = layout.kinds[0];
    const resolvedProfile = { name: 'full', skills: '*', agents: new Set() };
    const stagedDir = agentKind.stage(resolvedProfile);

    const stagedContent = fs.readFileSync(path.join(stagedDir, 'gsd-planner.md'), 'utf8');

    // Cursor conversion strips color field and rewrites ~/.claude/ paths
    assert.notStrictEqual(stagedContent, CLAUDE_AGENT_SOURCE, 'converter must have transformed the content');
    assert.ok(
      !stagedContent.includes('color:'),
      `Cursor agent conversion should strip the color field. Got:\n${stagedContent.slice(0, 300)}`,
    );
  });

  test('agents kind with converter=null still raw-copies (backward compat for claude)', (t) => {
    const fixtureRoot = makeFixtureRoot([{ name: 'gsd-planner.md', content: CLAUDE_AGENT_SOURCE }]);
    t.after(() => {
      cleanup(fixtureRoot);
      cleanupStagedSkills();
    });

    const registry = makeSyntheticRegistry(null);
    const layout = resolveRuntimeArtifactLayoutFromRegistry(
      registry, 'testruntime', fixtureRoot, 'global',
    );

    const agentKind = layout.kinds[0];
    const resolvedProfile = { name: 'full', skills: '*', agents: new Set() };
    const stagedDir = agentKind.stage(resolvedProfile);

    // converter=null: stageAgentsForProfile with skills='*' returns srcAgentsDir unchanged
    // (no staging dir is created; the source dir IS the staged dir, a passthrough)
    const stagedContent = fs.readFileSync(path.join(stagedDir, 'gsd-planner.md'), 'utf8');
    assert.strictEqual(stagedContent, CLAUDE_AGENT_SOURCE, 'converter=null must raw-copy the agent content');
  });
});

// ─── real registry: claude agents kind has converter=null ────────────────────

describe('feat-1173: real registry claude agents kind has converter=null (backward compat)', () => {
  test('claude local artifacts layout has agents entry with converter=null', () => {
    const registry = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'capability-registry.cjs'));
    const claudeDesc = registry.runtimes?.claude?.runtime?.artifactLayout?.local ?? [];
    const agentsEntry = claudeDesc.find((e) => e.kind === 'agents');
    assert.ok(agentsEntry, 'claude local artifactLayout must have an agents entry');
    assert.strictEqual(agentsEntry.converter, null, 'claude agents entry must have converter=null');
  });
});

// ─── feat-1173: real-registry wiring for the 8 runtimes ───────────────────────
// The synthetic-descriptor tests above prove the dispatch SEAM exists. These
// prove the actual deliverable: each of the 8 runtimes' capability.json now
// declares the correct agent converter, the descriptor path APPLIES it (not a
// raw copy), and the install scope is threaded so scope-aware converters
// (copilot/antigravity) choose global- vs workspace-relative paths. These fail
// on pristine `next`, where these runtimes have no agents kind (silent raw copy).
describe('feat-1173: real-registry agent converter wiring (8 runtimes)', () => {
  const conv = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'runtime-artifact-conversion.cjs'));
  const layout = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'runtime-artifact-layout.cjs'));
  const registry = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'capability-registry.cjs'));

  // runtime → its agent converter + the scopes whose descriptor carries an agents kind.
  // cline is global-only (its local artifactLayout is empty), so it wires global only.
  const WIRED = [
    { runtime: 'copilot',     converter: 'convertClaudeAgentToCopilotAgent',     scopeAware: true,  scopes: ['global', 'local'] },
    { runtime: 'antigravity', converter: 'convertClaudeAgentToAntigravityAgent', scopeAware: true,  scopes: ['global', 'local'] },
    { runtime: 'cursor',      converter: 'convertClaudeAgentToCursorAgent',      scopeAware: false, scopes: ['global', 'local'] },
    { runtime: 'windsurf',    converter: 'convertClaudeAgentToWindsurfAgent',    scopeAware: false, scopes: ['global', 'local'] },
    { runtime: 'augment',     converter: 'convertClaudeAgentToAugmentAgent',     scopeAware: false, scopes: ['global', 'local'] },
    { runtime: 'trae',        converter: 'convertClaudeAgentToTraeAgent',        scopeAware: false, scopes: ['global', 'local'] },
    { runtime: 'codebuddy',   converter: 'convertClaudeAgentToCodebuddyAgent',   scopeAware: false, scopes: ['global', 'local'] },
    { runtime: 'cline',       converter: 'convertClaudeAgentToClineAgent',       scopeAware: false, scopes: ['global'] },
  ];

  for (const { runtime, converter, scopeAware, scopes } of WIRED) {
    test(`${runtime}: capability descriptor declares ${converter} for ${scopes.join('+')}`, () => {
      const al = registry.runtimes[runtime].runtime.artifactLayout;
      for (const scope of scopes) {
        const entry = (al[scope] || []).find((e) => e.kind === 'agents');
        assert.ok(entry, `${runtime} ${scope} must declare an agents kind`);
        assert.strictEqual(entry.converter, converter, `${runtime} ${scope} agents converter`);
      }
      if (!scopes.includes('local')) {
        assert.ok(!(al.local || []).some((e) => e.kind === 'agents'),
          `${runtime} local must NOT declare an agents kind (global-only runtime)`);
      }
    });

    test(`${runtime}: descriptor staging applies ${converter} with scope threading`, (t) => {
      const fixtureRoot = makeFixtureRoot([{ name: 'gsd-planner.md', content: CLAUDE_AGENT_SOURCE }]);
      t.after(() => { cleanup(fixtureRoot); cleanupStagedSkills(); });
      const profile = { name: 'full', skills: '*', agents: new Set() };

      for (const scope of scopes) {
        const lay = layout.resolveRuntimeArtifactLayout(runtime, fixtureRoot, scope);
        const agentsKind = lay.kinds.find((k) => k.kind === 'agents');
        assert.ok(agentsKind, `${runtime} ${scope} layout must include an agents kind`);
        const stagedDir = agentsKind.stage(profile);
        const staged = fs.readFileSync(path.join(stagedDir, 'gsd-planner.md'), 'utf8');

        // Conversion actually happened (guards against the raw-copy regression).
        assert.notStrictEqual(staged, CLAUDE_AGENT_SOURCE,
          `${runtime} ${scope}: descriptor must convert, not raw-copy`);
        // Routed to the correct converter, with isGlobal threaded from the scope.
        const expected = conv[converter](CLAUDE_AGENT_SOURCE, scope === 'global');
        assert.strictEqual(staged, expected,
          `${runtime} ${scope}: staged must equal ${converter}(src, isGlobal=${scope === 'global'})`);
      }

      // Scope-aware converters must differ by scope — proves the isGlobal thread is
      // real (a broken/constant thread would make global and local identical).
      if (scopeAware) {
        assert.notStrictEqual(
          conv[converter](CLAUDE_AGENT_SOURCE, true),
          conv[converter](CLAUDE_AGENT_SOURCE, false),
          `${runtime}: global vs local conversion must differ (scope threading observable)`);
      }
    });
  }
});
