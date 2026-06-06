'use strict';

process.env.GSD_TEST_MODE = '1';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { cleanup } = require('./helpers.cjs');
const { installerEnv } = require('./helpers/install-shared.cjs');

const ROOT = path.join(__dirname, '..');
const INSTALL_SCRIPT = path.join(ROOT, 'bin', 'install.js');

const {
  getGlobalConfigDir,
  getGlobalSkillsBase,
  getGlobalSkillDir,
} = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'runtime-homes.cjs'));
const {
  resolveRuntimeArtifactLayout,
} = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'runtime-artifact-layout.cjs'));
const {
  getGlobalDir,
  getConfigDirFromHome,
} = require('../bin/install.js');

function withEnv(updates, fn) {
  const saved = {};
  for (const key of Object.keys(updates)) {
    saved[key] = process.env[key];
    const value = updates[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(updates)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

describe('Kimi runtime homes', () => {
  test('canonical global skills base is ~/.config/agents/skills, not ~/.kimi/skills', () => {
    withEnv({ KIMI_CONFIG_DIR: undefined, XDG_CONFIG_HOME: undefined }, () => {
      assert.strictEqual(
        getGlobalConfigDir('kimi'),
        path.join(os.homedir(), '.config', 'agents'),
      );
      assert.strictEqual(
        getGlobalSkillsBase('kimi'),
        path.join(os.homedir(), '.config', 'agents', 'skills'),
      );
      assert.strictEqual(
        getGlobalSkillDir('kimi', 'gsd-help'),
        path.join(os.homedir(), '.config', 'agents', 'skills', 'gsd-help'),
      );
      assert.notStrictEqual(
        getGlobalSkillsBase('kimi'),
        path.join(os.homedir(), '.kimi', 'skills'),
      );
    });
  });

  test('KIMI_CONFIG_DIR overrides the Kimi generic agents config root', () => {
    withEnv({ KIMI_CONFIG_DIR: '/tmp/custom-kimi-agents', XDG_CONFIG_HOME: undefined }, () => {
      assert.strictEqual(getGlobalConfigDir('kimi'), '/tmp/custom-kimi-agents');
      assert.strictEqual(
        getGlobalSkillsBase('kimi'),
        path.join('/tmp/custom-kimi-agents', 'skills'),
      );
      assert.strictEqual(getGlobalDir('kimi'), '/tmp/custom-kimi-agents');
    });
  });

  test('XDG_CONFIG_HOME participates in the default Kimi generic agents path', () => {
    withEnv({ KIMI_CONFIG_DIR: undefined, XDG_CONFIG_HOME: '/tmp/xdg-home' }, () => {
      assert.strictEqual(
        getGlobalConfigDir('kimi'),
        path.join('/tmp/xdg-home', 'agents'),
      );
      assert.strictEqual(
        getConfigDirFromHome('kimi', true),
        "'.config', 'agents'",
      );
    });
  });
});

describe('Kimi runtime artifact layout', () => {
  test('global layout stages Kimi skills and agents while local layout remains guarded', () => {
    const globalLayout = resolveRuntimeArtifactLayout('kimi', '/tmp/kimi-config', 'global');
    assert.strictEqual(globalLayout.runtime, 'kimi');
    assert.strictEqual(globalLayout.configDir, '/tmp/kimi-config');
    assert.strictEqual(globalLayout.kinds.length, 2);
    assert.strictEqual(globalLayout.kinds[0].kind, 'skills');
    assert.strictEqual(globalLayout.kinds[0].destSubpath, 'skills');
    assert.strictEqual(globalLayout.kinds[0].prefix, 'gsd-');
    assert.strictEqual(typeof globalLayout.kinds[0].stage, 'function');
    assert.strictEqual(globalLayout.kinds[1].kind, 'kimi-agents');
    assert.strictEqual(globalLayout.kinds[1].destSubpath, 'agents');
    assert.strictEqual(globalLayout.kinds[1].prefix, 'gsd');
    assert.strictEqual(typeof globalLayout.kinds[1].stage, 'function');

    const localLayout = resolveRuntimeArtifactLayout('kimi', '/tmp/kimi-config', 'local');
    assert.strictEqual(localLayout.runtime, 'kimi');
    assert.deepStrictEqual(localLayout.kinds, []);
  });
});

describe('Kimi local install guard', () => {
  test('--kimi --local exits successfully without writing local Kimi project artifacts', () => {
    const tmpProject = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-kimi-local-project-'));
    const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-kimi-local-home-'));
    try {
      const result = spawnSync(
        process.execPath,
        [INSTALL_SCRIPT, '--kimi', '--local', '--no-sdk'],
        {
          cwd: tmpProject,
          encoding: 'utf8',
          env: installerEnv({ HOME: tmpHome, USERPROFILE: tmpHome }),
        },
      );

      assert.strictEqual(
        result.status,
        0,
        `expected --kimi --local guard to no-op successfully\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
      );
      const combined = `${result.stdout}\n${result.stderr}`;
      assert.match(combined, /Kimi local install/i);
      assert.match(combined, /deferred/i);

      assert.ok(!fs.existsSync(path.join(tmpProject, '.kimi')), 'must not create .kimi/');
      assert.ok(!fs.existsSync(path.join(tmpProject, '.agents')), 'must not create .agents/');
      assert.ok(!fs.existsSync(path.join(tmpProject, '.claude')), 'must not fall back to Claude local install');
    } finally {
      cleanup(tmpProject);
      cleanup(tmpHome);
    }
  });

  test('--kimi --global writes converted Kimi skills and agent artifacts', () => {
    const tmpProject = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-kimi-global-project-'));
    const tmpConfig = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-kimi-global-config-'));
    const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-kimi-global-home-'));
    try {
      const result = spawnSync(
        process.execPath,
        [INSTALL_SCRIPT, '--kimi', '--global', '--config-dir', tmpConfig, '--no-sdk'],
        {
          cwd: tmpProject,
          encoding: 'utf8',
          env: installerEnv({ HOME: tmpHome, USERPROFILE: tmpHome }),
        },
      );

      assert.strictEqual(
        result.status,
        0,
        `expected --kimi --global to install Kimi skills successfully\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
      );
      const combined = `${result.stdout}\n${result.stderr}`;
      assert.match(combined, /Installing for .*Kimi/i);
      assert.match(combined, /Installed \d+ skills to skills\//i);
      assert.match(combined, /Generated Kimi root agent: .*agents.*gsd\.yaml/i);
      assert.match(combined, /kimi --agent-file/i);

      const skillFile = path.join(tmpConfig, 'skills', 'gsd-new-project', 'SKILL.md');
      assert.ok(fs.existsSync(skillFile), 'must write gsd-new-project/SKILL.md');
      const skillContent = fs.readFileSync(skillFile, 'utf8');
      assert.match(skillContent, /^name: gsd-new-project$/m);
      assert.match(skillContent, /\/skill:gsd-new-project/);
      assert.doesNotMatch(skillContent, /kimi_cli\.tools|system_prompt_path|^version: 1$/m);

      const rootYaml = path.join(tmpConfig, 'agents', 'gsd.yaml');
      const rootPrompt = path.join(tmpConfig, 'agents', 'gsd.md');
      const executorYaml = path.join(tmpConfig, 'agents', 'subagents', 'gsd-executor.yaml');
      const executorPrompt = path.join(tmpConfig, 'agents', 'subagents', 'gsd-executor.md');
      assert.ok(fs.existsSync(rootYaml), 'must write agents/gsd.yaml');
      assert.ok(fs.existsSync(rootPrompt), 'must write agents/gsd.md');
      assert.ok(fs.existsSync(executorYaml), 'must write agents/subagents/gsd-executor.yaml');
      assert.ok(fs.existsSync(executorPrompt), 'must write agents/subagents/gsd-executor.md');

      const rootYamlContent = fs.readFileSync(rootYaml, 'utf8');
      assert.match(rootYamlContent, /^version: 1$/m);
      assert.match(rootYamlContent, /^agent:$/m);
      assert.match(rootYamlContent, /extend: default/);
      assert.match(rootYamlContent, /system_prompt_path: \.\/gsd\.md/);
      assert.match(rootYamlContent, /tools:/);
      assert.match(rootYamlContent, /subagents:/);
      assert.match(rootYamlContent, /kimi_cli\.tools\./);
      assert.doesNotMatch(rootYamlContent, /mcp__/);

      const executorYamlContent = fs.readFileSync(executorYaml, 'utf8');
      assert.match(executorYamlContent, /system_prompt_path: \.\/gsd-executor\.md/);
      assert.match(executorYamlContent, /kimi_cli\.tools\./);
      assert.doesNotMatch(executorYamlContent, /mcp__/);

      assert.ok(!fs.existsSync(path.join(tmpConfig, 'gsd-core')), 'must not write workflow payloads as Kimi artifacts');
      assert.ok(!fs.existsSync(path.join(tmpConfig, 'hooks')), 'must not write hooks under the Kimi root');
    } finally {
      cleanup(tmpProject);
      cleanup(tmpConfig);
      cleanup(tmpHome);
    }
  });
});
