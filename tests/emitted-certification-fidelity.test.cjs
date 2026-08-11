'use strict';

/**
 * emitted-certification-fidelity.test.cjs — vendor-fact fidelity of the
 * emitted certification reference across the non-Claude runtime matrix
 * (e2e-12 F1 CRITICAL / F2 HIGH).
 *
 * `gsd-core/references/certification.md` is a research document whose stated
 * contract is: "Every capability claim below traces to a vendor's own page or
 * a dated live probe." The per-runtime brand-substitution transform in the
 * installer (neutralizeAgentReferences: bare `Claude` -> "the agent";
 * applyClaudeCodeBrandSwap: "Claude Code" -> "<Brand>") rewrote those vendor
 * facts into false statements about the *target* runtime:
 *
 *   - fabricated `Cursor --chrome` / `Qwen Code --chrome` flags (never existed),
 *     promoted to the CERT-1 exemplar and listed twice;
 *   - the dated onorca security-dogfood receipt re-attributed from Claude Code's
 *     settings.json to the target runtime's own settings.json (a fabricated
 *     third-party security claim);
 *   - "Claude Desktop" -> "the agent Desktop" on codex/copilot (the ` Desktop`
 *     lookahead gap), mangling the one user-facing certification question.
 *
 * FIX: certification.md is a vendor-fact reference, not agent-addressed prose;
 * it is exempt from BOTH brand transforms and emits BYTE-IDENTICAL to source on
 * every runtime. This test drives the REAL emit path (copyWithPathReplacement)
 * and asserts that fidelity — it FAILS on the pre-fix transform (proven RED by
 * stashing the install.js fix) and passes after.
 *
 * CI missed the original defect because the emitted-drift-acks only check
 * source-path byte-size, never emitted per-runtime content — so this file
 * asserts the emitted content directly.
 */

process.env.GSD_TEST_MODE = '1';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const install = require('../bin/install.js');
const { cleanup } = require('./helpers.cjs');

const CERT_SRC = path.join(__dirname, '..', 'gsd-core', 'references', 'certification.md');
const SOURCE = fs.readFileSync(CERT_SRC, 'utf8');

// The four non-Claude runtimes whose emits e2e-12 proved corrupted. codex and
// copilot hit F2 (`the agent Desktop`); cursor and qwen hit F1 (fabricated
// `<Brand> --chrome`, re-attributed onorca receipt). `claude` is the baseline —
// its emit is already verbatim, so it guards against a regression the other way.
const RUNTIMES = ['claude', 'codex', 'cursor', 'qwen', 'copilot'];

// Brand tokens the swap would substitute per runtime — used to assert NO
// fabricated `<Brand> --chrome` claim survives.
const BRAND_BY_RUNTIME = {
  codex: 'Codex',
  cursor: 'Cursor',
  qwen: 'Qwen Code',
  copilot: 'Copilot',
};

/**
 * Render certification.md exactly as a real `--<runtime> --local` install would,
 * through the shipped emit path (copyWithPathReplacement), into a throwaway dir.
 */
function emitCertification(runtime) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `cert-emit-${runtime}-`));
  // Mirror the real install source layout so the recursed srcPath is
  // `<tmp>/gsd-core/references/certification.md` — exactly what the shipped
  // installer feeds copyWithPathReplacement.
  const srcDir = path.join(tmp, 'gsd-core', 'references');
  fs.mkdirSync(srcDir, { recursive: true });
  fs.copyFileSync(CERT_SRC, path.join(srcDir, 'certification.md'));
  const destDir = path.join(tmp, 'out');
  install.copyWithPathReplacement(
    srcDir,
    destDir,
    `~/.${runtime}/gsd-core/`,
    runtime,
    /* isCommand */ false,
    /* isGlobal */ false,
    /* confinementRoot */ tmp,
  );
  const emitted = fs.readFileSync(path.join(destDir, 'certification.md'), 'utf8');
  cleanup(tmp);
  return emitted;
}

describe('emitted certification.md preserves source verbatim EXCEPT the command-namespace normalization', () => {
  for (const runtime of RUNTIMES) {
    // The vendor-fact exemption skips the brand swap and path rewrites, but the
    // `/gsd:` -> `/gsd-` command normalization is a runtime-invocation contract
    // (#3683: staged bodies must not echo the retired colon form), NOT a vendor
    // fact — it still applies. So the emit equals the source with exactly that
    // one substitution, and nothing else (no brand corruption).
    test(`${runtime}: emit === source with only /gsd: -> /gsd- normalized`, () => {
      const emitted = emitCertification(runtime);
      assert.equal(
        emitted,
        SOURCE.replace(/\/gsd:/g, '/gsd-'),
        `certification.md must emit source-identical on ${runtime} apart from the ` +
          `/gsd: -> /gsd- command normalization; any other diff is brand corruption of vendor facts.`,
      );
      // And it must carry NO retired colon command ref (the #3683 guard).
      assert.ok(
        !/\/gsd:[a-z]/.test(emitted),
        `${runtime}: emitted certification.md still contains a /gsd: colon command ref.`,
      );
    });
  }
});

describe('emitted certification.md preserves the specific vendor facts', () => {
  for (const runtime of RUNTIMES) {
    test(`${runtime}: no fabricated "<Brand> \`--chrome\`" driver claim (F1)`, () => {
      const emitted = emitCertification(runtime);
      const brand = BRAND_BY_RUNTIME[runtime];
      if (brand) {
        const fabricated = new RegExp(`\\b${brand}\\s+\`--chrome\``);
        assert.ok(
          !fabricated.test(emitted),
          `${runtime}: emitted certification.md fabricates a "${brand} \`--chrome\`" driver ` +
            `that does not exist — the source claim is about Claude Code.`,
        );
      }
      // The real vendor fact must survive verbatim.
      assert.ok(
        emitted.includes('**Claude Code `--chrome`**'),
        `${runtime}: the real "Claude Code \`--chrome\`" vendor fact was rewritten away.`,
      );
    });

    test(`${runtime}: onorca security receipt still attributes to Claude Code (F1)`, () => {
      const emitted = emitCertification(runtime);
      assert.ok(
        emitted.includes("into Claude Code's `settings.json`"),
        `${runtime}: the dated onorca dogfood receipt must attribute the 11 hook entries ` +
          `to Claude Code's settings.json, not the target runtime's.`,
      );
    });

    test(`${runtime}: no "the agent Desktop" / "non-the agent" mangling (F2)`, () => {
      const emitted = emitCertification(runtime);
      assert.ok(!emitted.includes('the agent Desktop'), `${runtime}: "Claude Desktop" was mangled to "the agent Desktop".`);
      assert.ok(!emitted.includes('non-the agent'), `${runtime}: "non-Claude" was mangled to "non-the agent".`);
      // "Claude Desktop" proper noun survives.
      assert.ok(
        emitted.includes('Claude Desktop'),
        `${runtime}: the "Claude Desktop" proper noun was rewritten away.`,
      );
    });
  }
});

// The ` Desktop` / `non-Claude` lookahead gap also mis-renders OTHER files that
// legitimately carry those tokens (verify-work.md:849 "non-Claude runtimes",
// testing-strategy.md:107 "Claude Desktop"). Guard the pure transform directly.
describe('neutralizeAgentReferences preserves proper nouns and negated compounds', () => {
  const neutralize = install.neutralizeAgentReferences;

  test('is exported', () => {
    assert.equal(typeof neutralize, 'function');
  });

  test('"non-Claude runtimes" is preserved (not "non-the agent runtimes")', () => {
    assert.equal(neutralize('required on non-Claude runtimes', 'AGENTS.md'), 'required on non-Claude runtimes');
  });

  test('"Claude Desktop" is preserved (not "the agent Desktop")', () => {
    assert.equal(neutralize('Do you have Claude Desktop available?', 'AGENTS.md'), 'Do you have Claude Desktop available?');
  });

  test('standalone "Claude" (the agent) is still neutralized', () => {
    assert.equal(neutralize('ask Claude to run the tool', 'AGENTS.md'), 'ask the agent to run the tool');
  });

  test('product/model names still preserved', () => {
    assert.equal(neutralize('Claude Code and Claude Opus', 'AGENTS.md'), 'Claude Code and Claude Opus');
  });
});
