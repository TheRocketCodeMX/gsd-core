'use strict';

/**
 * testing-certification.test.cjs — the load-bearing structures of the
 * certification & suite-health redesign of `/gsd:testing-strategy` (Wave 1,
 * strategy side — docs/superpowers/specs/2026-08-10-testing-certification-design.md).
 *
 * ## Why this file exists
 *
 * Same law the cicd-rung-ladder contract enforces: tables beat prose. The
 * defect this redesign fixes was that the top of the pyramid had exactly ONE
 * job (a scripted smoke suite in CI) and nothing anywhere said that a hermetic
 * ephemeral-environment run is not a validation of the app in the world. So
 * the things worth pinning are structures, not wording:
 *
 *   - the CERT-0 → CERT-2 certification ladder exists in the reference, with
 *     the CERT-1 (limited) tier between 0 and 1 (partial-capability environments);
 *   - capability detection PROBES (5-command live probe, per-operation
 *     verdicts) instead of merely finding binaries, and asks exactly ONE
 *     question for what nothing observable answers;
 *   - the trust doctrine is sandbox-first WITH its receipts (the onorca
 *     first-launch codex instrumentation finding);
 *   - the substrate is four named policies with the vendor-honesty tables
 *     (email modes differ in kind; Resend has none);
 *   - suite health is born-fast defaults + four triggers + a four-pass
 *     tune-up flow, with NO invented per-test budgets;
 *   - the template materializes rows from decisions — no pre-printed
 *     driver/capability rows.
 *
 * A `describe('citation honesty')` block guards the claims the research pass
 * deliberately refused to ship (agentic-qa-research.md, excluded-claims
 * appendix) — the ones a future edit is most likely to "helpfully" restore.
 * The OSWorld ban there is POLICY, not an accident: even a correctly-dated,
 * caveated citation stays out of shipped doctrine — benchmark numbers live in
 * the research digest only.
 *
 * Wording pins are alternation-based on purpose: a legitimate copy-edit must
 * survive; only the two verbatim VENDOR quotes ("not suited for CI usage",
 * "not be fully deterministic") are pinned byte-exact.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const WORKFLOW = 'gsd-core/workflows/testing-strategy.md';
const ADDTESTS = 'gsd-core/workflows/add-tests.md';
const CERT_REF = 'gsd-core/references/certification.md';
const TEST_REF = 'gsd-core/references/test-strategy.md';
const TEMPLATE = 'gsd-core/templates/test-strategy.md';
const USER_SETUP = 'gsd-core/templates/user-setup.md';

/**
 * Data rows of the first markdown table after `heading` (substring of the
 * heading line). Header + separator dropped — the count is the count of
 * decisions the table encodes. (Same helper as cicd-rung-ladder.test.cjs.)
 */
function tableRowsAfter(text, heading) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.includes(heading));
  assert.notEqual(start, -1, `heading not found: ${heading}`);
  const rows = [];
  let seenTable = false;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith('|')) {
      seenTable = true;
      if (/^\|[\s|:-]+\|$/.test(line)) continue; // separator
      rows.push(line);
    } else if (seenTable && line !== '') {
      break;
    }
  }
  assert.ok(seenTable, `no table found after: ${heading}`);
  return rows.slice(1); // drop the header row
}

/** The section body from `heading` up to the next heading of same-or-higher level. */
function section(text, heading) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.trim().startsWith('#') && l.includes(heading));
  assert.notEqual(start, -1, `section not found: ${heading}`);
  const level = (lines[start].match(/^#+/) || ['#'])[0].length;
  const body = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const m = lines[i].match(/^(#+)\s/);
    if (m && m[1].length <= level) break;
    body.push(lines[i]);
  }
  return body.join('\n');
}

describe('the certification ladder (reference)', () => {
  test('the reference ships a CERT ladder with all four tiers, one row each', () => {
    const ref = read(CERT_REF);
    const rows = tableRowsAfter(ref, 'The certification ladder');
    for (const tier of ['CERT-2', 'CERT-1', 'CERT-1 (limited)', 'CERT-0']) {
      assert.ok(
        rows.some((r) => r.includes(`**${tier}**`)),
        `tier ${tier} missing from the certification ladder table`,
      );
    }
  });

  test('every ladder row is substantive (tier · what · examples)', () => {
    const ref = read(CERT_REF);
    const rows = tableRowsAfter(ref, 'The certification ladder');
    for (const row of rows) {
      const cells = row.split('|').map((c) => c.trim()).filter(Boolean);
      assert.ok(cells.length >= 3, `ladder row must carry what + examples cells: ${row}`);
      assert.ok(cells[1].length > 20, `ladder "what" cell must be substantive: ${row}`);
    }
  });

  test('CERT-0 is the honest floor: human UAT + the scripted gate, stated as fallback, not the strategy', () => {
    const ref = read(CERT_REF);
    const rows = tableRowsAfter(ref, 'The certification ladder');
    const c0 = rows.find((r) => r.includes('**CERT-0**'));
    assert.match(c0, /human UAT/i, 'CERT-0 must name human UAT');
    assert.match(c0, /fallback/i, 'CERT-0 is the fallback, and says so');
  });

  test('the dogfood tier survives: CERT-1 (limited) is inspection-grade, click-through/screenshot excluded', () => {
    const ref = read(CERT_REF);
    const rows = tableRowsAfter(ref, 'The certification ladder');
    const limited = rows.find((r) => r.includes('CERT-1 (limited)'));
    assert.match(limited, /inspection/i, 'the limited tier is inspection-grade only');
    for (const capable of [/navigate|goto/i, /snapshot/i]) {
      assert.match(limited, capable, `the limited tier names what DOES work: ${capable}`);
    }
    assert.match(limited, /click|screenshot/i, 'the limited tier names what does NOT work');
  });

  test('builder ≠ certifier is doctrine, with the project-fact framing', () => {
    const ref = read(CERT_REF);
    assert.match(ref, /[Bb]uilder ≠ certifier/, 'the separation doctrine must be named');
    assert.match(ref, /different model family/i, 'fresh eyes = a different model family, no shared blind spots');
    assert.match(ref, /project([- ]level)? fact/i, 'capability is a fact about the project…');
    assert.match(ref, /machine fact|another machine/i, '…not about the machine in front of you');
  });

  test('ladder order is doctrine: CERT-2 → CERT-1 → CERT-1 (limited) → CERT-0', () => {
    const ref = read(CERT_REF);
    const rows = tableRowsAfter(ref, 'The certification ladder');
    const idx = (tier) => rows.findIndex((r) => r.includes(`**${tier}**`));
    assert.ok(idx('CERT-2') < idx('CERT-1'), 'CERT-2 leads the ladder');
    assert.ok(idx('CERT-1') < idx('CERT-1 (limited)'), 'the limited tier sits below full CERT-1');
    assert.ok(idx('CERT-1 (limited)') < idx('CERT-0'), 'the limited tier sits above the CERT-0 floor');
  });

  test('the Claude Desktop capability claim ships with its vendor status, dated', () => {
    const ref = read(CERT_REF);
    assert.match(ref, /Claude Desktop[^\n]*research preview|research preview[^\n]*Claude Desktop/i,
      'the vendor\'s own release status rides with the claim — never bare marketing');
  });
});

describe('the probe (reference + workflow)', () => {
  test('detection probes — it never merely finds binaries', () => {
    const ref = read(CERT_REF);
    const s = section(ref, 'The probe');
    assert.match(s, /binary[^.\n]{0,80}(lead|not a capability|says nothing)/i,
      'the "a binary is a lead, not a capability" doctrine');
    for (const op of [/goto|navigate/i, /snapshot/i, /fill/i, /click/i, /screenshot/i]) {
      assert.match(s, op, `the 5-command live probe must include ${op}`);
    }
    // Validation A F3: the probe must run fill BEFORE the click round-trip —
    // click-after-fill is the failure mode that defines CERT-1 (limited), and a
    // probe that never fills structurally cannot measure it.
    const fillAt = s.search(/\bfill\b/i);
    const clickAt = s.search(/click round-trip|click.*round.?trip/i);
    assert.ok(fillAt !== -1 && clickAt !== -1 && fillAt < clickAt,
      'fill precedes the click round-trip so the probe reproduces click-after-fill');
    assert.match(s, /per-operation|per-op/i, 'per-operation verdicts are recorded');
    assert.match(s, /throwaway (page|app|fixture)|never the real app/i,
      'the probe runs against a throwaway page, never the real app');
    // The workflow mirror carries the same ordering — pin it there too.
    const wf = read(WORKFLOW);
    const wfFill = wf.search(/goto → snapshot → fill/);
    assert.ok(wfFill !== -1,
      'workflows/testing-strategy.md Step 5.5 keeps fill before the click round-trip');
  });

  test('a click that reports success but never lands demotes the tier', () => {
    const ref = read(CERT_REF);
    const s = section(ref, 'The probe');
    assert.match(s, /round-trip|state change|actually land/i,
      'click is verified by its effect, not its return value (the WSL2 dogfood failure mode)');
  });

  test('exactly ONE question covers what is undetectable (desktop certifier apps)', () => {
    const ref = read(CERT_REF);
    const s = section(ref, 'The probe');
    assert.match(s, /one question/i);
    for (const app of [/Codex desktop/i, /Claude Desktop/i, /onorca/i]) {
      assert.match(s, app, `the question must name ${app}`);
    }
  });

  test('the workflow runs observable checks before any question', () => {
    const wf = read(WORKFLOW);
    assert.match(wf, /command -v ("?\$tool"?|codex|orca)/, 'binary detection is a shell command, not an interview');
    assert.match(wf, /gsd-cert-sandbox/, 'discovery also looks in the trust-doctrine sandbox HOME, not only PATH (greenfield F5)');
    assert.match(wf, /missing[^.\n]{0,40}not[^.\n]{0,20}absent/i, 'a sandbox/off-machine certifier is not CERT-0 just because PATH misses it');
    assert.match(wf, /playwright\.config/, 'playwright config presence is an observable check');
    assert.match(wf, /mcp__playwright__/, 'MCP browser tools are an observable runtime fact');
    assert.match(wf, /wsl/i, 'WSL/headless detection gates the display-bound drivers');
  });

  test('the workflow probes any driver found and records per-operation results', () => {
    const wf = read(WORKFLOW);
    assert.match(wf, /5-command|five-command/i, 'the live probe is named in the workflow');
    assert.doesNotMatch(wf, /4-command|four-command/i, 'the probe is 5 commands now — fill is load-bearing (validation A F3)');
    assert.match(wf, /per-operation|per-op/i, 'per-operation verdicts recorded in TEST-STRATEGY');
    assert.match(wf, /lead is not a capability|binary[^.\n]{0,80}(lead|not a capability)/i,
      'the lead-is-not-a-capability doctrine reaches the workflow');
    // Surface-typed probe (non-web design extension, e2e-11): the probe branches by surface.
    assert.match(wf, /surface type/i, 'surface type is recorded before the probe');
    for (const surface of [/\bcli\b/i, /\bapi\b/i, /\blibrary\b/i]) {
      assert.match(wf, surface, `the probe names the ${surface} non-browser surface`);
    }
    assert.match(wf, /runnable cli\/api surface is CERT-1|cli\/api[^.\n]{0,40}CERT-1/i,
      'a runnable CLI/API surface is CERT-1, not CERT-0 (e2e-11 F2)');
  });
});

describe('trust doctrine (sandbox-first, with receipts)', () => {
  test('first launch happens in an isolated HOME, then an instrumentation audit', () => {
    const ref = read(CERT_REF);
    const s = section(ref, 'trust doctrine');
    assert.match(s, /isolated HOME/i);
    assert.match(s, /instrumentation audit/i);
    assert.match(s, /what did it write/i, 'the audit questions are spelled out');
    assert.match(s, /which agent CLIs/i);
  });

  test('the trust gate precedes the probe — a first launch is never the probe', () => {
    const ref = read(CERT_REF);
    const trustAt = ref.search(/^##[^\n]*trust doctrine/im);
    const probeAt = ref.search(/^##[^\n]*The probe/im);
    assert.ok(trustAt !== -1 && probeAt !== -1, 'both sections exist');
    assert.ok(trustAt < probeAt,
      'sandbox-first must be read BEFORE the probe instruction — the dogfood showed a bare --version instruments the environment');
    const wfStep = section(read(WORKFLOW), 'Step 5.5');
    const wfTrust = wfStep.search(/isolated HOME/i);
    const wfProbe = wfStep.search(/5-command|five-command/i);
    assert.ok(wfTrust !== -1 && wfProbe !== -1 && wfTrust < wfProbe,
      'the workflow orders the trust gate ahead of the probe');
  });

  test('the gate covers ANY first launch in this environment — not just newly-acquired tools', () => {
    const ref = read(CERT_REF);
    const s = section(ref, 'trust doctrine');
    assert.match(s, /in this environment/i, 'installed-but-never-launched-here is the realistic case');
    assert.match(s, /--version/, 'even a bare --version launch counts (the empirical finding)');
    const wf = read(WORKFLOW);
    assert.doesNotMatch(wf, /newly[- ]acquired/i,
      '"newly-acquired" under-scopes the gate: command -v finds tools that never launched in this HOME');
  });

  test('the onorca receipts justify the doctrine (empirical, dated)', () => {
    const ref = read(CERT_REF);
    const s = section(ref, 'trust doctrine');
    assert.match(s, /8 hook|eight hook/i, 'the codex hooks.json instrumentation finding');
    assert.match(s, /trust/i, 'the self-granted trust entries');
    assert.match(s, /consent/i, 'zero consent UI is the point');
  });

  test('tool stance is point-don\'t-prescribe', () => {
    const ref = read(CERT_REF);
    assert.match(ref, /[Pp]oint, don'?t prescribe/, 'named options with caveats; no install prescriptions');
  });

  test('orca headless semantics are shipped as undocumented-but-observed, never as vendor fact', () => {
    const ref = read(CERT_REF);
    assert.match(ref, /undocumented/i,
      'browser-under-serve is verified empirically — the vendor documents none of it');
  });
});

describe('the certification brief', () => {
  test('the brief is the canonical artifact; a starter script is an accelerant, never canonical', () => {
    const ref = read(CERT_REF);
    const s = section(ref, 'certification brief');
    assert.match(s, /What Done Looks Like/, 'brief derives from UAT items + the capsule');
    assert.match(s, /certifier-agnostic/i);
    assert.match(s, /never canonical|accelerant/i, 'the script is derived FROM the brief');
  });

  test('acceptance is human-anchored, never the driver\'s own narration (ai-test-quality applies in full force)', () => {
    const ref = read(CERT_REF);
    const s = section(ref, 'certification brief');
    assert.match(s, /narration/i, 'agent-authored evidence about agent-authored code needs an independent anchor');
  });
});

describe('vendor honesty — auth', () => {
  test('the provider table records verified stories: Clerk, Auth0, Firebase, Supabase', () => {
    const ref = read(CERT_REF);
    const rows = tableRowsAfter(ref, 'Auth for certification');
    for (const vendor of ['Clerk', 'Auth0', 'Firebase', 'Supabase']) {
      assert.ok(rows.some((r) => r.includes(vendor)), `auth table missing ${vendor}`);
    }
    const clerk = rows.find((r) => r.includes('Clerk'));
    assert.match(clerk, /Testing Token/i, 'Clerk Testing Tokens exist precisely for bot detection');
    assert.match(clerk, /424242/, 'the fixed test verification code');
    const auth0 = rows.find((r) => r.includes('Auth0'));
    assert.match(auth0, /browser automation|no first-party/i,
      'Auth0 itself says browser automation is the only way — the citation that makes auth-once honest');
  });

  test('one-time human auth + persisted session is a first-class honest answer, with hygiene', () => {
    const ref = read(CERT_REF);
    const s = section(ref, 'Auth for certification');
    assert.match(s, /auth(enticate)? once|one-time human auth/i);
    assert.match(s, /gitignore/i, 'the storage-state file is never committed');
    assert.match(s, /impersonate/i, 'Playwright\'s own warning ships alongside the pattern');
  });
});

describe('vendor honesty — email', () => {
  test('the enforcement point is the transport: sandbox catcher by default', () => {
    const ref = read(CERT_REF);
    const s = section(ref, 'Email safety');
    assert.match(s, /Mailpit/, 'the catcher class is named');
    assert.match(s, /transport/i, 'the one reliable enforcement point');
    assert.match(s, /plus-address/i, 'plus-addressing is matching, not delivery safety');
  });

  test('the vendor mode table: modes differ in kind — Resend has none, Mailgun still bills', () => {
    const ref = read(CERT_REF);
    const rows = tableRowsAfter(ref, 'Email safety');
    for (const vendor of ['SendGrid', 'Mailgun', 'Postmark', 'Resend']) {
      assert.ok(rows.some((r) => r.includes(vendor)), `email table missing ${vendor}`);
    }
    const resend = rows.find((r) => r.includes('Resend'));
    assert.match(resend, /none|no test mode/i, '"Resend has none" — magic recipients only');
    assert.match(resend, /magic recipient|resend\.dev/i);
    const mailgun = rows.find((r) => r.includes('Mailgun'));
    assert.match(mailgun, /charge|bill/i, 'Mailgun test mode still bills — the honesty the table exists for');
  });

  test('real recipients only when deliverability IS the feature, recorded as such', () => {
    const ref = read(CERT_REF);
    const s = section(ref, 'Email safety');
    assert.match(s, /deliverability[^.\n]{0,30}(feature|under test)/i);
  });
});

describe('LLM integrations under certification', () => {
  test('real calls when the integration is the thing under test — spend-capped, pinned, transcript-evidenced', () => {
    const ref = read(CERT_REF);
    const s = section(ref, 'LLM integrations');
    assert.match(s, /the (integration is the )?thing under test/i);
    assert.match(s, /spend (cap|limit)/i, 'a HARD cap on a dedicated test key');
    assert.match(s, /pinned/i, 'cheap-but-representative pinned snapshot');
    assert.match(s, /transcript/i, 'the transcript is the evidence');
  });

  test('assertions on shape, never content — with Anthropic\'s own determinism disclaimer', () => {
    const ref = read(CERT_REF);
    const s = section(ref, 'LLM integrations');
    assert.match(s, /shape,? (never|not) content|shape[- ]not[- ]content/i);
    assert.match(s, /not be fully deterministic/,
      'the verbatim Anthropic quote: even temperature 0.0 is not fully deterministic');
  });

  test('stubs remain correct in named cases (not a blanket real-calls mandate)', () => {
    const ref = read(CERT_REF);
    const s = section(ref, 'LLM integrations');
    assert.match(s, /[Ss]tubs (remain|stay|are still)/, 'rate-limited vendors + deterministic tiers keep stubs');
  });
});

describe('suite health (the existing testing reference)', () => {
  test('born-fast defaults are class-based, explicitly non-exhaustive, with CURRENT APIs', () => {
    const ref = read(TEST_REF);
    const s = section(ref, 'Suite health');
    assert.match(s, /non-exhaustive/i, 'the checklist names classes, not a closed tool list');
    assert.match(s, /maxWorkers/, 'vitest 4: top-level options');
    // poolOptions was REMOVED in vitest 4: it may appear only as the removal
    // warning, never as a recipe (`poolOptions.threads.singleThread` is the
    // most-copied dead snippet on the internet).
    for (const line of s.split('\n').filter((l) => l.includes('poolOptions'))) {
      assert.match(line, /removed/i, `poolOptions cited outside the removal warning: ${line}`);
    }
    assert.doesNotMatch(s, /poolOptions\.\w/, 'a dotted poolOptions path is a recipe against a removed API');
    assert.match(s, /nextest/, 'rust: cargo-nextest');
    assert.match(s, /pytest-xdist/, 'python: pytest-xdist');
  });

  test('testcontainers reuse is LOCAL-ONLY, with the verbatim disqualifier', () => {
    const ref = read(TEST_REF);
    const s = section(ref, 'Suite health');
    assert.match(s, /not suited for CI usage/,
      'the verbatim Testcontainers quote — the single most decision-changing finding');
    assert.match(s, /local/i, 'reuse belongs to the local dev loop only');
  });

  test('no per-test budgets — none exist in primary sources; our thresholds are labelled ours', () => {
    const ref = read(TEST_REF);
    const s = section(ref, 'Suite health');
    assert.match(s, /[Nn]o primary source publishes a per-test/, 'the absence is itself the finding');
    assert.match(s, /GSD'?s own/i, 'the trigger thresholds are GSD heuristics, labelled as such');
  });

  test('the four triggers T1–T4 exist as a table, T1 fires immediately', () => {
    const ref = read(TEST_REF);
    const rows = tableRowsAfter(ref, 'four triggers');
    for (const t of ['T1', 'T2', 'T3', 'T4']) {
      assert.ok(rows.some((r) => r.includes(`**${t}`)), `trigger ${t} missing`);
    }
    const t1 = rows.find((r) => r.includes('**T1'));
    assert.match(t1, /immediate/i, 'a budget breach is a TDD-ergonomics emergency');
    assert.match(t1, /10 min/, 'the PR-gate number is shared with cicd C1-a, never reinvented');
  });

  test('volume vs regression: flat ms/test + rising total is tiering work, not tuning work', () => {
    const ref = read(TEST_REF);
    const s = section(ref, 'Suite health');
    assert.match(s, /volume, (not|rather than) (a )?regression/i);
    assert.match(s, /tiering|sharding/i, 'the remedy for volume is C1, not a tune-up');
  });

  test('the tune-up flow is four ordered passes; order is doctrine', () => {
    const ref = read(TEST_REF);
    const s = section(ref, 'tune-up');
    for (const pass of [/[Pp]rofile/, /[Cc]onfig\/cache/, /audit against the strategy/i, /[Rr]e-baseline/]) {
      assert.match(s, pass, `tune-up pass missing: ${pass}`);
    }
    assert.match(s, /config (pass )?(before|precedes) tests/i, 'the predictable half comes first');
    assert.match(s, /fix-class/i, 'config-drift vs test-debt is recorded so the strategy learns');
    assert.match(s, /config-drift/i);
    assert.match(s, /test-debt/i);
  });

  test('the missing claim now exists: a hermetic run is not real-conditions validation', () => {
    const ref = read(TEST_REF);
    assert.match(ref, /regression check, not a validation/i,
      'the claim the whole corpus lacked (audit §1.3) must live in the reference');
    assert.match(ref, /certification\.md/, 'the testing reference links the certification reference');
  });
});

describe('the workflow: two jobs at the top', () => {
  test('the doctrine is stated: gate (scripts, CI) vs certify (agentic, never CI)', () => {
    const wf = read(WORKFLOW);
    assert.match(wf, /two different jobs/i);
    assert.match(wf, /[Ss]cripts gate/);
    assert.match(wf, /[Nn]ever (a )?CI/, 'certification is never a CI gate');
  });

  test('the gate keeps its shape: 3–7 flows, agent-authored and agent-healed', () => {
    const wf = read(WORKFLOW);
    assert.match(wf, /3–7/, 'the persistent smoke count is unchanged');
    assert.match(wf, /planner/i);
    assert.match(wf, /generator/i);
    assert.match(wf, /healer/i, 'the vendor-converged maintenance loop is named');
    assert.match(wf, /(genuinely|actually|truly) broken/i,
      'the healer guardrail: refuse to "fix" a test when the app is actually broken');
    assert.match(wf, /[Hh]and-maintained/, 'the no-authoring-agent fallback is stated');
  });

  test('the substrate step decides four policies and infers before asking', () => {
    const wf = read(WORKFLOW);
    for (const policy of [/[Ss]eed test accounts/, /[Ee]mail safety/, /LLM/, /OAuth/]) {
      assert.match(wf, policy, `substrate policy missing: ${policy}`);
    }
    assert.match(wf, /SECURITY-STRATEGY\.md/, 'data classification / secrets floor answered upstream');
    assert.match(wf, /INFRA-STRATEGY\.md/, 'environments / vendors answered upstream');
    assert.match(wf, /never real user data/i, 'real seeded accounts, never real user data');
  });

  test('born-fast defaults + the suite-health baseline are seeded at strategy time', () => {
    const wf = read(WORKFLOW);
    assert.match(wf, /[Bb]orn fast/);
    assert.match(wf, /unmeasured/i, 'greenfield records unmeasured, never a guess');
    assert.match(wf, /T1/, 'the immediate trigger reaches the workflow');
    assert.match(wf, /milestone close/i, 'T2–T4 schedule at milestone close');
  });

  test('the untouched core survives verbatim (must-NOT-break list)', () => {
    const wf = read(WORKFLOW);
    assert.match(wf, /Shape follows architecture/i);
    assert.match(wf, /Coverage is a floor, not a target/i);
    assert.match(wf, /ice-cream cone/, 'the e2e-tiering discipline stays');
    assert.match(wf, /<5 min/, 'the smoke budget stays');
    assert.match(wf, /Behavior over implementation/i);
  });

  test('the FORK:context discussion-log block survives the rewrite', () => {
    const wf = read(WORKFLOW);
    assert.match(wf, /<!-- FORK:context BEGIN -->/);
    assert.match(wf, /<!-- FORK:context END -->/);
    assert.match(wf, /PROJECT-DISCUSSION-LOG\.md/);
  });

  test('critical rules carry the new invariants', () => {
    const wf = read(WORKFLOW);
    const rules = wf.slice(wf.indexOf('<critical_rules>'), wf.indexOf('</critical_rules>'));
    assert.match(rules, /certif/i, 'certification is a critical rule, not a step detail');
    assert.match(rules, /[Pp]robe/, 'probe capability, never merely find binaries');
    assert.match(rules, /[Bb]orn fast/);
  });
});

describe('the template materializes rows from decisions', () => {
  test('## Certification records tier + probe results + mechanism + brief pointer', () => {
    const tpl = read(TEMPLATE);
    const s = section(tpl, 'Certification');
    assert.match(s, /Tier:/i);
    assert.match(s, /CERT-/, 'the tier vocabulary is the ladder\'s');
    assert.match(s, /[Pp]robe/);
    assert.match(s, /Mechanism:/i);
    assert.match(s, /[Bb]rief/);
  });

  test('deferred certification capability carries its promotion trigger', () => {
    const tpl = read(TEMPLATE);
    const s = section(tpl, 'Certification');
    assert.match(s, /Deferred/i);
    assert.match(s, /promotes|re-probe/i, 'a deferred row names the observable fact that promotes it');
  });

  test('NO pre-printed driver/capability rows — rows materialize from the probe', () => {
    const tpl = read(TEMPLATE);
    const s = section(tpl, 'Certification');
    // A tool name in a table row is an instruction to fill it — the exact
    // mechanism the cicd redesign removed (a pre-printed Nightly row).
    for (const line of s.split('\n')) {
      if (!line.trim().startsWith('|')) continue;
      assert.doesNotMatch(line, /\b(orca|codex|playwright|claude|cursor)\b/i,
        `pre-printed driver row in the template: ${line}`);
    }
    assert.match(s, /materiali[sz]e|never pre-print|do not pre-print/i,
      'the template says why the rows are absent');
  });

  test('## Certification substrate carries the four policies', () => {
    const tpl = read(TEMPLATE);
    const s = section(tpl, 'Certification substrate');
    for (const policy of [/[Ss]eed test accounts/, /[Ee]mail safety/, /LLM/, /OAuth|auth/]) {
      assert.match(s, policy, `substrate policy missing from template: ${policy}`);
    }
  });

  // Round 4 (r4-b): the coverage-gap feedback loop must close mechanically, not
  // hand off, and the "seed accounts" substrate policy must have a real section.
  test('r4: certification.md carries an authoritative ## Seed accounts section and no dangling ref to it', () => {
    const ref = read(CERT_REF);
    assert.match(ref, /^## Seed accounts$/m, 'a ## Seed accounts substrate policy section exists');
    const s = section(ref, 'Seed accounts');
    assert.match(s, /idempotent/i, 'the seed script is idempotent (create-or-update, never duplicate)');
    assert.match(s, /role-tagged|by role|role/i, 'accounts are role-tagged and documented in TEST-STRATEGY');
    assert.match(s, /env(ironment)?|secret store|secret manager/i, 'credentials live in the env/secret store');
    assert.match(s, /never (in the |committed|in a URL)/i, 'never in the repo / never in a URL');
  });

  test('r4: add-tests reads the ## Coverage debt ledger and closes the rows it resolves (Status lifecycle)', () => {
    const at = read(ADDTESTS);
    assert.match(at, /## Coverage debt/, 'add-tests reads the coverage-debt ledger');
    assert.match(at, /open/, 'it selects open rows');
    assert.match(at, /first-class inputs|not re-derived|prioriti/i, 'named gaps are prioritized inputs, not re-derived');
    assert.match(at, /open\s*(→|->)\s*closed|transition that row `?open/i,
      'a resolved row transitions open -> closed');
    assert.match(at, /closing test|test (path|ref)|closed (→|->)/i, 'the closing test ref is recorded');
  });

  test('## Suite health ships the baseline table with the four measured columns — ms/test is derived, never recorded', () => {
    const tpl = read(TEMPLATE);
    const s = section(tpl, 'Suite health');
    const header = s.split('\n').find((l) => l.includes('test_count'));
    assert.ok(header, 'the baseline table header exists');
    for (const col of ['test_count', 'wall_clock', 'containers_started', 'fix-class']) {
      assert.ok(header.includes(col), `baseline column missing: ${col}`);
    }
    // Validation B F5: summary.md forbids recording a derived value ("recording a
    // derived value invites drift") — the strategy table obeys the same rule.
    assert.ok(!header.includes('ms/test'), 'ms/test is derived at compare time, never a recorded column');
    assert.match(s, /derive/i, 'the section says where ms/test comes from instead');
    const rows = tableRowsAfter(tpl, 'Suite health');
    assert.equal(rows.length, 1, 'exactly one baseline row — milestones append, the template never pre-asserts history');
  });

  test('wall_clock is integer milliseconds everywhere — no m:ss, no second-resolution shadow (round 2)', () => {
    // Floored seconds fixed the 0:00 divide-by-zero but blinded T2 below one
    // second (267 ms and 604 ms both read 1 s). The recorded unit is now the
    // true millisecond bracket, in every artifact.
    for (const f of [TEMPLATE, SUMMARY_TEMPLATE, TUNE_UP, POST_MERGE_GATE, EXECUTE_PLAN, TRANSITION]) {
      assert.doesNotMatch(read(f), /m:ss/, `${f} still records wall_clock as m:ss`);
    }
    assert.match(suiteMetricsBlock(read(SUMMARY_TEMPLATE)), /wall_clock_ms:[^\n]*millisecond/i,
      'the SUMMARY schema names milliseconds as the unit');
  });

  test('the CI execution map survives unchanged in shape (cicd reads it)', () => {
    const tpl = read(TEMPLATE);
    const rows = tableRowsAfter(tpl, 'CI execution map');
    for (const row of rows) {
      assert.doesNotMatch(row, /nightly/i, 'a nightly row here becomes a "fact" downstream');
    }
    assert.match(tpl, /C1\/C2|C1 \/ C2/, 'the map still points at cicd-strategy\'s triggers');
  });

  test('certification never rides the C1 input field — it gets its own labelled line', () => {
    const tpl = read(TEMPLATE);
    const c1Field = tpl.split('\n').find((l) => l.includes("Doesn't fit the PR gate"));
    assert.ok(c1Field, 'the C1 input field exists');
    // cicd-strategy maps this field rule-driven into a post-merge stage; a
    // certification mention here is an instruction to schedule the thing the
    // doctrine forbids from CI.
    assert.doesNotMatch(c1Field, /certif/i,
      'certification must not appear in the field cicd maps to CI stages');
    assert.match(tpl, /[Nn]ot a pipeline tier/,
      'the non-CI status lives on its own line, structurally unmappable');
    const wf = read(WORKFLOW);
    assert.match(wf, /[Nn]ot a pipeline tier/,
      'the workflow render instruction mirrors the template split');
  });
});

describe('user-setup: the operational substrate has its artifact', () => {
  test('seed accounts, mail catcher, and auth-session entries exist as setup material', () => {
    const us = read(USER_SETUP);
    assert.match(us, /[Ss]eed/, 'seed test accounts reach USER-SETUP');
    assert.match(us, /Mailpit|catcher/i, 'the mail catcher reaches USER-SETUP');
    assert.match(us, /persisted session|storage[- ]state|storageState/i,
      'the one-time-auth persisted session is a setup item');
    assert.match(us, /certification/i, 'the entries are tied to certification substrate');
  });
});

describe('citation honesty', () => {
  const SHIPPED = [WORKFLOW, CERT_REF, TEST_REF, TEMPLATE, USER_SETUP];

  test('no stale benchmark numbers ship (excluded-claims appendix)', () => {
    for (const file of SHIPPED) {
      const text = read(file);
      // OSWorld-2024's 12.24%/72.36% is the most-misquoted-as-current number in
      // the field; no benchmark headline ships at all (X1–X5).
      assert.doesNotMatch(text, /OSWorld/i, `${file}: no OSWorld citation ships`);
      assert.doesNotMatch(text, /12\.24|72\.36|87\.4|Odysseys/i, `${file}: excluded benchmark number`);
      // Vendor self-reports with no methodology (X17, X18) — including the
      // spelled-out "3–4 times faster" shape of the Testcontainers Cloud claim.
      assert.doesNotMatch(text, /\b3\s*[-–—]?\s*4\s*(×|x|times)\s*(faster|speed)|\b3\s*(×|x|times)\s*(faster|speed)/i,
        `${file}: unmethodized speed headline`);
    }
  });

  test('no invented per-test budget ships anywhere', () => {
    for (const file of SHIPPED) {
      const text = read(file);
      // Any "tests … under N ms/s" sentence shape, not just one phrasing.
      assert.doesNotMatch(text, /(unit )?tests?[^.\n]{0,40}\b(must|should)\b[^.\n]{0,40}(under|below|less than|<)\s*\d+\s*(ms|milliseconds?|seconds?)\b/i,
        `${file}: no primary source publishes a per-test budget (X16)`);
    }
  });

  test('the 60-second Google number never ships as a budget (X15)', () => {
    for (const file of SHIPPED) {
      const text = read(file);
      assert.doesNotMatch(text, /tests?[^.\n]{0,60}\b(in|under|within|less than)\s*60\s*s(econds)?\b/i,
        `${file}: the 60s figure is a kill threshold with unresolved scope, not a budget`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 2 — certification in the loop (spec §5) and the feedback loop (spec §7).
//
// Wave 1 pinned the STRATEGY side: what the ladder is, how capability is
// probed, what the substrate policies are. Wave 2 pins the LOOP side: that a
// decision recorded in TEST-STRATEGY actually changes what `verify-work` does
// before UAT, that agentic evidence has a first-class kind the deterministic
// classifier can auto-pass, and that a certification failure has somewhere to
// go besides a code fix.
//
// Same discipline as above: structural anchors and alternations, never GSD
// prose verbatim (Wave 1 review N8). The things pinned here are the ones whose
// loss would silently re-open a hole:
//
//   - the section runs BEFORE the UAT checkpoint machinery (ordering, by index);
//   - the trust gate precedes any launch/probe in the step file (ordering);
//   - the brief is canonical and the script is an accelerant (never inverted);
//   - a skip is RECORDED, never silent (the CTO's explicit decision);
//   - builder ≠ certifier survives;
//   - `agentic_certification` exists in BOTH summary.md locations, the
//     execute-plan ref examples, and the classifier's enum — a partial landing
//     is the failure mode (the classifier rejects what the template invites);
//   - the deterministic auto-pass contract is NOT weakened to let it in.
// ─────────────────────────────────────────────────────────────────────────────

const VERIFY_WORK = 'gsd-core/workflows/verify-work.md';
const CERT_STEP = 'gsd-core/workflows/verify-work/steps/agentic-certification.md';
const SUMMARY_TPL = 'gsd-core/templates/summary.md';
const EXECUTE_PLAN = 'gsd-core/workflows/execute-plan.md';
const STRATEGY_CAP = 'capabilities/strategy/capability.json';
const COVERAGE_CTS = 'src/coverage.cts';
const PLANNING_CONFIG = 'gsd-core/references/planning-config.md';

/** Index of the first match of `re` in `text`, or -1. Used for ORDER assertions. */
function at(text, re) {
  const m = text.match(re);
  return m ? m.index : -1;
}

describe('certification in the loop — the verify-work dispatch', () => {
  test('verify-work dispatches the certification step file unconditionally', () => {
    const text = read(VERIFY_WORK);
    assert.match(
      text,
      /Read and execute `gsd-core\/workflows\/verify-work\/steps\/agentic-certification\.md`/,
      'the dispatch must use the plain unconditional step-file form'
    );
  });

  test('the dispatch is NOT a gsd:section — there is no configuration that skips it', () => {
    // Wave 2 review N1: a section wrapper puts a written-down silent-skip branch
    // ("Otherwise skip — do not read the file") on disk in the one step whose
    // whole contract is "recorded, never silent". The opt-out belongs inside the
    // step, which resolves `workflow.certification: off` and records it.
    const text = read(VERIFY_WORK);
    assert.doesNotMatch(
      text,
      /gsd:section\s+id="agentic-certification"/,
      'the certification dispatch must not be wrapped in a section gate'
    );
    const manifest = JSON.parse(read('gsd-core/workflows/section-manifest.json'));
    assert.ok(
      !JSON.stringify(manifest).includes('agentic-certification'),
      'and the generated section manifest must carry no entry for it'
    );
  });

  test('it uses the same unconditional form as execute-phase\'s post-merge gate', () => {
    const cert = read(VERIFY_WORK).match(/Read and execute `gsd-core\/workflows\/verify-work\/steps\/agentic-certification\.md`\./);
    const gate = read('gsd-core/workflows/execute-phase.md').match(/Read and execute `gsd-core\/workflows\/execute-phase\/steps\/post-merge-gate\.md`\./);
    assert.ok(cert && gate, 'both dispatches exist in the same corpus form');
  });

  test('certification runs AFTER the checkpoint set exists and BEFORE any checkpoint is presented', () => {
    // Both halves matter. Before `extract_tests` there is no `present[]` set to
    // build a brief from (and UAT.md does not exist yet either); after
    // `present_test` the human has already done the work certification exists to
    // take over. The window is exactly extract_tests → create_uat_file.
    const text = read(VERIFY_WORK);
    const gate = at(text, /verify-work\/steps\/agentic-certification\.md/);
    const extract = at(text, /<step name="extract_tests">/);
    const create = at(text, /<step name="create_uat_file">/);
    const present = at(text, /<step name="present_test">/);
    assert.ok(gate > -1 && extract > -1 && create > -1 && present > -1);
    assert.ok(extract < gate, 'the certification gate must FOLLOW extract_tests — present[] is its brief source');
    assert.ok(gate < create, 'the certification gate must precede create_uat_file — that step writes its results');
    assert.ok(gate < present, 'the certification gate must precede present_test');
  });

  test('create_uat_file knows how to write certified entries and the outcome line', () => {
    const text = read(VERIFY_WORK);
    const create = text.slice(at(text, /<step name="create_uat_file">/), at(text, /<step name="present_test">/));
    assert.match(create, /source:\s*agentic/, 'the pre-resolved certified entry shape');
    assert.match(create, /certification:\s*human\s*\(CERT-0\)/, 'the outcome line is recorded into UAT.md');
    assert.match(create, /byte-identical|unchanged/i, 'with the section off, the file is what it always was');
  });

  test('the step file exists and is a well-formed workflow step', () => {
    const text = read(CERT_STEP);
    assert.match(text, /<step name="agentic_certification">/);
    assert.match(text, /<\/step>/);
  });
});

describe('the certification step: detect → auto-resolve → escalate', () => {
  const text = () => read(CERT_STEP);

  test('it reads the TEST-STRATEGY certification decision, not tool presence', () => {
    const t = text();
    assert.match(t, /TEST-STRATEGY/, 'the recorded project decision is the input');
    assert.match(t, /##\s*Certification\b/, 'it consumes the `## Certification` section');
    assert.match(t, /##\s*Certification substrate/, 'it consumes the substrate section');
  });

  test('it honors the workflow.certification config key', () => {
    assert.match(text(), /workflow\.certification/);
    assert.match(text(), /\brequired\b[\s\S]{0,80}\boffer\b[\s\S]{0,80}\boff\b/, 'all three modes are handled');
  });

  test('it re-checks the recorded driver at runtime instead of trusting the strategy-time probe', () => {
    const t = text();
    assert.match(
      t,
      /re-?(check|probe|verif)|verify (the )?driver|still (capable|available)/i,
      'a strategy-time probe is a lead, not a live capability'
    );
  });

  test('the trust gate SECTION precedes the capability-re-check SECTION', () => {
    // Wave 2 review M1: the previous form anchored on prose that all lived
    // inside §3, 60 bytes apart, so swapping §3 and §4 still passed. Anchor on
    // the section HEADINGS — that is the ordering the Wave 1 M2 defect was.
    const t = text();
    const trust = at(t, /^##\s*\d+\.\s*Trust gate/im);
    const recheck = at(t, /^##\s*\d+\.\s*Re-check the recorded capability/im);
    assert.ok(trust > -1, 'the step must carry a numbered Trust gate section');
    assert.ok(recheck > -1, 'the step must carry a numbered capability re-check section');
    assert.ok(trust < recheck, 'the trust gate must precede the capability re-check (references/certification.md is the authority)');
  });

  test('the trust gate itself claims the re-check — the gate covers the re-probe too', () => {
    const t = text();
    const gate = t.slice(at(t, /^##\s*\d+\.\s*Trust gate/im), at(t, /^##\s*\d+\.\s*Re-check the recorded capability/im));
    assert.match(
      gate,
      /including the capability re-check|covers the re-check|the re-check below/i,
      'the doctrine "a re-probe is also a first launch" must be pinned separately from the ordering'
    );
    assert.match(gate, /isolated HOME|sandbox-first|sandbox HOME/i, 'and the gate is the sandbox-first one');
  });

  test('the brief is canonical and any script is an accelerant', () => {
    const t = text();
    assert.match(t, /brief/i);
    assert.match(t, /canonical/i);
    assert.match(t, /accelerant|never canonical|derived from the brief/i, 'a starter script is never the canonical artifact');
    // Sourced from the UAT present[] set + the capsule's observable acceptance.
    assert.match(t, /present\[\]|present\b[^\n]{0,40}checkpoint/i, 'the brief is built from the UAT present[] checkpoints');
    assert.match(t, /What Done Looks Like/, "the capsule's observable acceptance signals feed the brief");
    assert.match(t, /certifier-agnostic|human-readable/i, 'the brief is not tied to one certifier');
  });

  test('results write back as auto-verified UAT entries with source: agentic', () => {
    const t = text();
    assert.match(t, /source:\s*agentic/, 'the `source: automated` precedent extends, it is not replaced');
    assert.match(t, /result:\s*pass/, 'certified checkpoints are written pre-resolved');
    assert.match(t, /transcript/i, 'evidence refs are attached');
    assert.match(t, /screenshot|console|network/i, 'evidence includes what the probe said the driver can capture');
  });

  test('judgment, auth and CAPTCHA always escalate to the human', () => {
    const t = text();
    assert.match(t, /CAPTCHA/i);
    assert.match(t, /auth/i);
    assert.match(t, /human[\s\S]{0,60}(judgment|judgement)|judgment[\s\S]{0,60}human/i);
    assert.match(t, /escalat/i);
  });

  test('CERT-0 degrades to human UAT with a recorded certification line', () => {
    const t = text();
    assert.match(t, /CERT-0/);
    assert.match(t, /certification:\s*human\s*\(CERT-0\)/, 'the CERT-0 outcome is recorded, not inferred');
    assert.match(t, /unchanged (from )?today|behavior is unchanged/i, "today's UAT flow is untouched on CERT-0");
  });

  test('a no-user-facing-surface phase skips with a RECORDED N/A — never silently', () => {
    const t = text();
    assert.match(t, /certification:\s*N\/A\s*—\s*no user-facing change/, 'the exact recorded skip line');
    assert.match(t, /never silent|not silent|never a silent/i, 'the skip is explicitly non-silent');
  });

  test('builder ≠ certifier is stated AND has a per-mechanism separation story', () => {
    const t = text();
    assert.match(t, /builder\s*(≠|!=|is not|must not be)\s*(the )?certifi/i);
    assert.match(t, /CERT-2/, 'the tool-boundary mechanism');
    assert.match(t, /CERT-1/, 'the weaker same-session mechanism needs its own answer');
    assert.match(t, /fresh (eyes|session|context)|different (model|session)|not the session that built/i);
  });

  test('it degrades to today’s behavior when nothing is available', () => {
    // Wave 2 review T2: asserted against the whole 15 KB file this passed on any
    // of ~6 unrelated sentences. Scope it to the §8 outcome block, which is where
    // the CERT-0 fallback promise actually lives.
    const t = text();
    const outcome = t.slice(at(t, /^##\s*\d+\.\s*Record the outcome/im));
    assert.ok(outcome.length > 0, 'the outcome section must exist');
    assert.match(outcome, /unchanged|falls? back/i, 'the CERT-0 path is today’s UAT, unchanged');
    assert.match(outcome, /CERT-0/, 'and it is named as such');
  });
});

describe('evidence schema — kind: agentic_certification', () => {
  test('the SUMMARY template carries the new kind in BOTH enum locations', () => {
    const text = read(SUMMARY_TPL);
    const hits = [...text.matchAll(/agentic_certification/g)];
    assert.ok(hits.length >= 2, `expected the kind in both the inline enum and the field-semantics table, found ${hits.length}`);
    // The inline enum comment and the `verification[].kind` table row are the
    // two places a downstream author actually reads.
    assert.match(text, /kind:\s*unit\s+#[^\n]*agentic_certification/, 'the inline enum comment lists it');
    assert.match(text, /`verification\[\]\.kind`[^\n]*agentic_certification/, 'the field-semantics table lists it');
  });

  test('execute-plan’s evidence-ref guidance knows the certification ref shape', () => {
    const text = read(EXECUTE_PLAN);
    assert.match(text, /agentic_certification/);
    assert.match(text, /transcript/i, 'the ref for a certification run is its transcript/evidence bundle');
  });

  test('the classifier enum accepts it', () => {
    assert.match(read(COVERAGE_CTS), /'agentic_certification'/);
  });

  test('EVERY documented enum surface carries it — a partial landing is the failure mode', () => {
    // Wave 2 review M3: the enum landed in 2 of 4 surfaces, so CONTEXT.md — the
    // one an agent consults as ground truth before authoring a coverage: block —
    // still told it `agentic_certification` was invalid. Sweep them all.
    // examples/dynamic-context-management/CONTEXT-INDEX.json is a frozen example
    // fixture and is deliberately NOT in this list.
    const surfaces = [
      'gsd-core/templates/summary.md',
      'docs/COMMANDS.md',
      'CONTEXT.md',
      'docs/CONTEXT-INDEX.json',
      'src/coverage.cts',
    ];
    const missing = surfaces.filter((p) => !read(p).includes('agentic_certification'));
    assert.deepEqual(missing, [], `enum surfaces missing agentic_certification: ${missing.join(', ')}`);
  });

  test('no documented surface still enumerates the pre-change six kinds', () => {
    const stale = ['docs/COMMANDS.md', 'CONTEXT.md', 'docs/CONTEXT-INDEX.json'].filter((p) =>
      /automated_ui[^\n]{0,4}\|[^\n]{0,4}manual_procedural/.test(read(p))
    );
    assert.deepEqual(stale, [], `these still list automated_ui immediately before manual_procedural: ${stale.join(', ')}`);
  });

  test('the deterministic auto-pass contract is NOT weakened to admit it', () => {
    const text = read(SUMMARY_TPL);
    // The three-part test survives verbatim in substance: human_judgment false
    // AND non-empty verification AND every status pass.
    assert.match(text, /human_judgment:\s*false.{0,40}AND.{0,60}verification.{0,40}AND.{0,60}status/is);
    assert.match(text, /false-positive ships a bug/i, 'the fail-safe rationale stays');
  });
});

describe('workflow.certification — the config key', () => {
  // Declared on the FEDERATED capability surface (ADR-1244), exactly like
  // `workflow.ui_review` in capabilities/ui — NOT as a patch to the central
  // schema. That is what keeps the fork's config delta at zero upstream-shared
  // patches, and it is why the assertions below read the capability descriptor
  // rather than src/config.cts.
  const slice = () => JSON.parse(read(STRATEGY_CAP)).config['workflow.certification'];

  test('the strategy capability declares the key', () => {
    assert.ok(slice(), 'capabilities/strategy/capability.json must declare workflow.certification');
  });

  test('the default is `required`', () => {
    assert.equal(slice().default, 'required');
  });

  test('the value is enum-typed to required | offer | off', () => {
    assert.equal(slice().type, 'enum');
    assert.deepEqual(slice().values, ['required', 'offer', 'off']);
  });

  test('the generated capability registry carries the same slice', () => {
    const registry = read('gsd-core/bin/lib/capability-registry.cjs');
    assert.match(registry, /workflow\.certification/);
    assert.match(registry, /"required"/);
  });

  test('the declaration is not ALSO patched into the central schema', () => {
    // Two owners for one key is the failure mode the federated surface exists
    // to prevent; a stray central default would silently shadow the capability.
    // Wave 2 review T1: scoped to the KEY, not the word — an unrelated future
    // comment mentioning certification must not fail this guard.
    assert.doesNotMatch(read('src/config.cts'), /['"]?workflow\.certification/);
  });

  test('planning-config documents the key with its default and values', () => {
    const text = read(PLANNING_CONFIG);
    const row = text.split('\n').find((l) => l.includes('`workflow.certification`'));
    assert.ok(row, 'planning-config.md must carry a `workflow.certification` row in the Workflow Fields table');
    assert.match(row, /`"required"`/, 'the documented default is required');
    assert.match(row, /`"offer"`/);
    assert.match(row, /`"off"`/);
  });
});

describe('the feedback loop — certification/UAT failure asks which test was missing', () => {
  test('verify-work carries a coverage-gap step', () => {
    const text = read(VERIFY_WORK);
    assert.match(text, /<step name="coverage_gap[^"]*">/, 'a named step owns the coverage-gap question');
    assert.match(
      text,
      /which (fast )?test (was|is) missing|what test did we miss|missing (fast )?test/i,
      'the question itself must survive a copy-edit-resistant alternation'
    );
  });

  test('it routes to add-tests and to gap planning', () => {
    const text = read(VERIFY_WORK);
    const step = text.slice(at(text, /<step name="coverage_gap[^"]*">/));
    assert.match(step.slice(0, 4000), /add-tests/);
    assert.match(step.slice(0, 4000), /plan-phase --gaps|--gaps/);
  });

  test('the answer is APPENDED to TEST-STRATEGY under a marked section (never a rewrite)', () => {
    const text = read(VERIFY_WORK);
    const step = text.slice(at(text, /<step name="coverage_gap[^"]*">/), at(text, /<step name="coverage_gap[^"]*">/) + 4000);
    assert.match(step, /TEST-STRATEGY/);
    assert.match(step, /##\s*Coverage debt/, 'the marked section it appends under');
    assert.match(step, /append/i);
    assert.match(step, /never (rewrite|regenerate|rewrites)|do not rewrite|not a rewrite/i, 'TEST-STRATEGY gains a narrow second writer, not a second author');
  });

  test('the template gives TEST-STRATEGY the section to be appended to', () => {
    const text = read(TEMPLATE);
    assert.match(text, /##\s*Coverage debt/);
    const rows = tableRowsAfter(text, '## Coverage debt');
    assert.ok(rows.length >= 1, 'the coverage-debt table ships with its shape');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 3 — suite-health machinery (spec §8.3 capture → compare → schedule, §8.4
// the tune-up flow). Wave 1 wrote the doctrine and the baseline row; Wave 2 wrote
// the certification loop. This wave makes the sentence "T1 checked now; T2–T4
// compared at milestone close" mechanically TRUE: something measures, something
// compares, and something fixes.
// ─────────────────────────────────────────────────────────────────────────────

const SUMMARY_TEMPLATE = 'gsd-core/templates/summary.md';
const POST_MERGE_GATE = 'gsd-core/workflows/execute-phase/steps/post-merge-gate.md';
const TRANSITION = 'gsd-core/workflows/transition.md';
const TUNE_UP = 'gsd-core/workflows/testing-strategy/steps/suite-tune-up.md';
const SHIP = 'gsd-core/workflows/ship.md';
const CMD_TESTING_STRATEGY = 'commands/gsd/testing-strategy.md';
const SKILL_TESTING_STRATEGY = 'skills/gsd-testing-strategy/SKILL.md';

/** Body of an XML-ish `<step name="…">` block, from its opening tag to `</step>`. */
function stepBody(text, openTag) {
  const start = text.indexOf(openTag);
  assert.notEqual(start, -1, `step not found: ${openTag}`);
  const end = text.indexOf('</step>', start);
  assert.notEqual(end, -1, `unterminated step: ${openTag}`);
  return text.slice(start, end);
}

/** The body of the first fenced/unfenced `suite-metrics:` YAML block in a file. */
function suiteMetricsBlock(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^\s*suite-metrics:\s*$/.test(l));
  assert.notEqual(start, -1, 'no `suite-metrics:` block found');
  const body = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^\S/.test(lines[i]) && lines[i].trim() !== '') break;
    body.push(lines[i]);
  }
  return body.join('\n');
}

describe('suite-metrics capture — the executor records what it actually ran', () => {
  test('the SUMMARY template declares a suite-metrics block with the three measured fields', () => {
    const block = suiteMetricsBlock(read(SUMMARY_TEMPLATE));
    assert.match(block, /^\s+test_count:/m, 'test_count is recorded');
    assert.match(block, /^\s+wall_clock_ms:/m, 'wall_clock_ms is recorded');
    assert.match(block, /^\s+containers_started:/m, 'containers_started is recorded');
  });

  test('ms/test is NOT a recorded field — it is derived at compare time', () => {
    // One source of truth per number. Recording a derived value invites the two
    // to disagree, and the trigger table reads the derived one.
    const block = suiteMetricsBlock(read(SUMMARY_TEMPLATE));
    assert.doesNotMatch(block, /^\s+ms[_/]test:/m, 'ms/test must not be a recorded key');
    assert.match(
      read(SUMMARY_TEMPLATE),
      /ms\/test[^\n]*(derived|computed)|(derived|computed)[^\n]*ms\/test/i,
      'the template must say ms/test is derived downstream'
    );
  });

  test('an absent block means "not measured here" — never zero', () => {
    const text = read(SUMMARY_TEMPLATE);
    assert.match(
      text,
      /omit[^\n]*suite-metrics|suite-metrics[^\n]*omit/i,
      'the omit rule must be stated where the block is defined'
    );
    assert.match(
      text,
      /never (write |record )?`?0`?|not[- ]measured, never zero|never zero/i,
      'never write 0 for "not measured" — a zero moves a trigger'
    );
  });

  test('the template names its downstream consumer (the transition compare)', () => {
    assert.match(read(SUMMARY_TEMPLATE), /transition/i);
    assert.match(read(SUMMARY_TEMPLATE), /Suite health/);
  });

  test('the post-merge test gate measures wall clock around the run it already performs', () => {
    const text = read(POST_MERGE_GATE);
    assert.match(text, /SUITE_START_MS=/, 'a millisecond start mark is taken before the suite runs');
    assert.match(text, /SUITE_ELAPSED_MS/, 'and the elapsed milliseconds are recorded from it');
    const startIdx = at(text, /SUITE_START_MS=/);
    const runIdx = at(text, /TEST_EXIT=\$\?/);
    assert.ok(startIdx !== -1 && runIdx !== -1 && startIdx < runIdx, 'the clock starts BEFORE the suite runs');
  });

  test('the gate has a capture step naming all three metrics and the container fallback', () => {
    const text = read(POST_MERGE_GATE);
    assert.match(text, /Step C/, 'the capture is its own labelled step, not a footnote');
    assert.match(text, /suite-metrics/);
    assert.match(text, /test_count/);
    assert.match(text, /containers_started/);
    assert.match(text, /Testcontainers|testcontainers/);
    const containersRow = text.split('\n').find((l) => l.includes('`containers_started`'));
    assert.ok(containersRow, 'the containers_started contract row exists');
    assert.match(containersRow, /`—`/, 'containers_started falls back to an em dash, never a guess');
  });

  test('a timed-out or absent suite records NOTHING (an unmeasured run is not a measurement)', () => {
    const text = read(POST_MERGE_GATE);
    const capture = text.slice(at(text, /Step C/));
    assert.match(capture, /124|timed out|timeout/i);
    assert.match(capture, /record nothing|write nothing|omit the block|do not record/i);
  });

  test('execute-plan tells the executor to record suite-metrics only when it ran the suite', () => {
    const text = read(EXECUTE_PLAN);
    assert.match(text, /suite-metrics/, 'the create_summary guidance must name the block');
    assert.match(text, /never estimate|do not estimate|measured, not estimated/i);
  });

  test('the line-pinned PROSE_ALLOWLIST entry for execute-plan.md:387 has not shifted', () => {
    // tests/no-bare-gsd-tools-command-position.test.cjs pins this file:line pair.
    // Wave 2 broke it once; this guard makes a re-break loud HERE, in the file
    // that owns the change, instead of in an upstream test.
    const line = read(EXECUTE_PLAN).split('\n')[386];
    assert.match(
      line,
      /Every deliverable MUST be classified/,
      'execute-plan.md line 387 must still be the allowlisted `validated downstream by` line'
    );
  });
});

describe('the transition compare — baseline vs latest, evaluated against T1–T4', () => {
  test('transition carries a suite-health compare step', () => {
    assert.match(read(TRANSITION), /<step name="suite_health_compare">/);
  });

  test('the step is inside a FORK:strategy marker pair (fork content, upstream-shared file)', () => {
    const text = read(TRANSITION);
    const begins = [...text.matchAll(/<!-- FORK:strategy BEGIN -->/g)].map((m) => m.index);
    const ends = [...text.matchAll(/<!-- FORK:strategy END -->/g)].map((m) => m.index);
    const step = at(text, /<step name="suite_health_compare">/);
    assert.ok(
      begins.some((b, i) => b < step && step < ends[i]),
      'the compare step must sit inside a declared FORK:strategy block'
    );
  });

  test('it reads BOTH sides — the newest SUMMARY suite-metrics and the TEST-STRATEGY baseline row', () => {
    const text = read(TRANSITION);
    const step = stepBody(text, '<step name="suite_health_compare">');
    assert.match(step, /suite-metrics/);
    assert.match(step, /TEST-STRATEGY/);
    assert.match(step, /##\s*Suite health/);
    assert.match(step, /SUMMARY/);
  });

  test('all four triggers are wired, and the reference table is the authority', () => {
    const step = stepBody(read(TRANSITION), '<step name="suite_health_compare">');
    for (const t of ['T1', 'T2', 'T3', 'T4']) {
      assert.match(step, new RegExp(`\\b${t}\\b`), `${t} must be evaluated here`);
    }
    assert.match(step, /test-strategy\.md|references\/test-strategy/, 'points at the reference table, does not re-invent thresholds');
  });

  test('T1 fires immediately; T2/T3/T4 schedule at milestone close (routing, not just presence)', () => {
    const step = stepBody(read(TRANSITION), '<step name="suite_health_compare">');
    const t1Route = at(step, /T1 → an immediate todo/);
    const laterRoute = at(step, /T2 \/ T3 \/ T4 →/);
    assert.ok(t1Route !== -1, 'the T1-immediate route paragraph exists');
    assert.ok(laterRoute !== -1, 'the T2–T4 scheduled route paragraph exists');
    assert.ok(t1Route < laterRoute, 'immediate route stated before the scheduled route');
    const t1Para = step.slice(t1Route, laterRoute);
    assert.doesNotMatch(t1Para, /milestone close/i, 'T1 must not be deferred to milestone close');
    assert.match(t1Para, /immediate|written now|now\b/i, 'T1 is the immediate route');
    assert.match(step.slice(laterRoute), /milestone close/i, 'T2–T4 are the milestone-close route');
  });

  test('both routes attach the tune-up flow by its entry point', () => {
    const step = stepBody(read(TRANSITION), '<step name="suite_health_compare">');
    assert.match(step, /--tune-up/, 'the todo must carry the flow that fixes it, not just the complaint');
    assert.match(step, /todos\/pending/, 'existing todo machinery — no new daemon');
  });

  test('missing strategy or missing metrics skips SILENTLY — a phase is never blocked on a measurement', () => {
    const step = stepBody(read(TRANSITION), '<step name="suite_health_compare">');
    assert.match(step, /skip silently|silently skip/i);
    assert.match(step, /unmeasured/);
  });

  test('volume-vs-regression is stated so the wrong remedy is not applied', () => {
    const step = stepBody(read(TRANSITION), '<step name="suite_health_compare">');
    assert.match(step, /volume, not (a )?regression/i);
  });

  test('the compare never re-baselines — that is the tune-up flow\'s fourth pass', () => {
    const step = stepBody(read(TRANSITION), '<step name="suite_health_compare">');
    assert.match(step, /never write[^\n]*Suite[- ]health row|do not write[^\n]*row|re-baselin/i);
  });

  test('it runs after the phase is marked complete and before the next-phase offer (by index)', () => {
    const text = read(TRANSITION);
    const roadmap = at(text, /<step name="update_roadmap_and_state">/);
    const compare = at(text, /<step name="suite_health_compare">/);
    const offer = at(text, /<step name="offer_next_phase">/);
    assert.ok(roadmap < compare, 'gsd_run must already be defined when the compare runs');
    assert.ok(compare < offer, 'the compare happens before the user is handed the next phase');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Round 3 (e2e-8 F4, e2e-9 F1–F5, e2e-10 F1–F5, greenfield F7). The suite-health
// compare and its two writers must be robust to every hostile / degenerate row a
// real crash or a hand-edit can produce, and the trend logic must be accurate.
// These are markdown-doctrine pins (the compare is prose an agent executes; there
// is no parser in bin/), so they assert the RULE is written down where the agent
// reads it — an unruled hostile value is an unbounded LLM guess, which is the bug.
// ─────────────────────────────────────────────────────────────────────────────
describe('the transition compare — hostile and degenerate rows (round 3)', () => {
  const step = () => stepBody(read(TRANSITION), '<step name="suite_health_compare">');

  // e2e-9 F1 / e2e-8 F4 (same bug, two operators): the zero-guard was on the
  // DIVIDEND (wall_clock_ms). The real divisor is test_count and it was unguarded,
  // so test_count: 0 → ms/test = Infinity → T2 fires on an unmeasured suite.
  test('test_count is guarded as the divisor — 0 / absent / non-positive is unmeasured, never Infinity', () => {
    const s = step();
    assert.match(s, /test_count/, 'the guard must name test_count');
    assert.match(s, /divisor/i, 'and say test_count is the divisor');
    assert.match(s, /positive finite integer/i, 'the well-formed condition is a positive finite integer');
    assert.match(s, /Infinity|NaN/, 'names the fail-open failure it prevents');
  });

  // e2e-9 F2: a MALFORMED baseline (negative / non-numeric / short row) must be
  // reported, not silently skipped — a silent skip in the fail-open direction
  // suppresses T2 forever with garbage in the "no trigger" line.
  test('a malformed baseline row is REPORTED, not silently skipped (fail-open is the danger)', () => {
    const s = step();
    assert.match(s, /baseline row malformed/i, 'the exact operator-facing message');
    assert.match(s, /re-baseline/i, 'and tells them how to recover');
    assert.match(s, /negative|non-numeric/i, 'negative / non-numeric are named as malformed');
  });

  // e2e-9 F3: scientific notation and non-integers are not integer milliseconds.
  test('scientific notation and non-integers are rejected as malformed, not accepted as ms', () => {
    const s = step();
    assert.match(s, /scientific notation|non-integer|6\.02e23|47\.06/i);
  });

  // e2e-9 F4: the legacy ×1000 conversion had no plausibility bound and guessed
  // the unit; a ms table mis-headed `(s)` inflates 1000× and blinds T2 forever.
  test('the legacy x1000 rule reads the unit from the header and has a plausibility ceiling', () => {
    const s = step();
    assert.match(s, /header/i, 'the unit is read from the column header, not guessed');
    assert.match(s, /plausibilit|ceiling|11\.6 days|999999|hours/i, 'a plausibility bound on the converted value');
  });
});

describe('the honest no-fix tune-up outcome (round 3 — e2e-10 F1/F2)', () => {
  // F1: the closed fix-class vocabulary had no value for "it was volume, tiering
  // not tuning" — the outcome suite-tune-up.md:154 documents. Recording `—` for it
  // triggers F2 (T4 baseline reversion).
  test('suite-tune-up has a closed fix-class value for the volume/no-fix outcome', () => {
    const text = read(TUNE_UP);
    const pass = text.slice(at(text, /##\s*Pass 4/));
    assert.match(pass, /volume|no[- ]fix/i, 'the "it was volume, route to C1" outcome is a named class');
    // it belongs in the row template's closed set (the 5th cell)
    const rowTemplate = pass.split('\n').find((l) => /^\|\s*YYYY-MM-DD/.test(l));
    assert.ok(rowTemplate, 'the Pass 4 row template line exists');
    assert.match(rowTemplate, /volume|no[- ]fix/i, 'the no-fix/volume class is in the closed cell vocabulary');
  });

  // F2: an honest no-fix row reverted T4's baseline to the PREVIOUS tune-up row
  // and re-fired forever. The no-fix/volume class must count as a real recorded
  // tune-up for T4's backstop.
  test('T4 baseline selection tolerates the honest no-fix row without jamming', () => {
    const s = stepBody(read(TRANSITION), '<step name="suite_health_compare">');
    assert.match(s, /volume|no[- ]fix/i, 'the no-fix outcome is named in the T4 baseline rule');
    assert.match(s, /counts as a[^\n]*tune-up|a tune-up (did )?(run|ran)|does not re-?fire|no longer re-?fire/i,
      'a correctly-concluded volume run is a tune-up-happened row, so T4 does not re-fire off an older baseline');
  });
});

describe('the volume-vs-regression discriminator gains its third case (round 3 — e2e-10 F3)', () => {
  test('transition names the mix-shift-into-new-tiers case as volume, not tuning', () => {
    const s = stepBody(read(TRANSITION), '<step name="suite_health_compare">');
    assert.match(s, /mix shift|concentrated in[^\n]*new|newly-added (tiers|files)|added this phase/i,
      'a strategy-prescribed mix shift into new tiers/files is volume, not a regression');
  });
  test('the reference states the third mix-shift case as a GSD heuristic', () => {
    const s = section(read(TEST_REF), 'Suite health');
    assert.match(s, /mix shift|concentrated in[^\n]*new|newly-added (tiers|files)|added this phase/i);
    assert.match(s, /GSD|heuristic/i, "labelled as GSD's own heuristic, not a sourced number");
  });
});

describe('baseline row selection is unified across cicd and transition (round 3 — e2e-10 F4)', () => {
  test('transition states the last-row-in-file tie-break once', () => {
    const t = stepBody(read(TRANSITION), '<step name="suite_health_compare">');
    assert.match(t, /last[- ]in[- ]file|last row in file order|file order/i,
      'append-only means last-in-file is the newest reading');
    assert.match(t, /same date|share (a |the )?date|tie[- ]break/i, 'the same-date tie-break is stated');
  });
  test('cicd picks the last row and cites transition\'s one selection rule', () => {
    const cicd = read('gsd-core/workflows/cicd-strategy.md');
    assert.match(cicd, /last row/i, 'cicd picks the last row, not the ambiguous "newest dated" row');
    assert.doesNotMatch(cicd, /newest dated row/i, 'the ambiguous "newest dated row" phrasing is gone');
    assert.match(cicd, /transition\.md/, 'and cites transition.md as the one selection rule');
  });
});

describe('cold-vs-warm capture (round 3 — e2e-10 F5)', () => {
  test('the post-merge gate records that its reading is the cold first-after-change run', () => {
    const gate = read(POST_MERGE_GATE);
    assert.match(gate, /cold/i, 'the gate marks its reading cold (the first run after the change lands)');
  });
  test('the compare tolerates a cold reading rather than firing a false T2 on run asymmetry', () => {
    const s = stepBody(read(TRANSITION), '<step name="suite_health_compare">');
    assert.match(s, /cold/i, 'the compare knows the gate reading is cold');
    assert.match(s, /re-?measure|warm/i, 'a first-fire cold T2 on a small suite is re-measured warm before a tune-up is scheduled');
  });
});

describe('greenfield unmeasured baseline seeds on the first real capture (round 3 — greenfield F7)', () => {
  const step = () => stepBody(read(TRANSITION), '<step name="suite_health_compare">');
  // F7: `unmeasured` (greenfield seed) + skip-forever = a closed loop; the promised
  // "re-measure at the first milestone" was never implemented, so the baseline stays
  // `unmeasured` forever and cicd's C1-a pins C0 forever.
  test('an unmeasured baseline is not skip-forever — the first real capture SEEDS the baseline row', () => {
    const s = step();
    assert.match(s, /unmeasured/);
    assert.match(s, /seed/i, 'the compare seeds the first real row instead of skipping forever');
    assert.match(s, /first real (measurement|capture|suite)/i, 'the seed fires on the first real suite-metrics capture');
  });
  test('the seed is the one carve-out to "never write a row" and stays append-only', () => {
    const s = step();
    assert.match(s, /never write a `## Suite health` row|do not write[^\n]*row/i,
      'the never-write rule still stands for the trend case');
    assert.match(s, /append/i, 'the seed is appended — history preserved');
    assert.match(s, /`0`|zero/, 'a `0`/legacy placeholder is the same dead-end and gets the same seed remedy');
  });
});

describe('execute-plan writes wall_clock_ms in milliseconds (round 3 — e2e-9 F5)', () => {
  test('the create_summary suite-metrics guidance is milliseconds, no seconds straggler', () => {
    const text = read(EXECUTE_PLAN);
    const para = text.slice(at(text, /\*\*Suite metrics \(suite health\)\.\*\*/));
    const block = para.slice(0, para.indexOf('\n\n') === -1 ? para.length : para.indexOf('\n\n'));
    assert.match(block, /wall_clock_ms/, 'the executor writes wall_clock_ms, matching template/gate/compare');
    assert.doesNotMatch(block, /integer seconds/i, 'the pre-millisecond seconds straggler is gone');
    assert.match(block, /millisecond/i, 'the unit is stated as milliseconds');
  });
});

describe('the suite tune-up flow (§8.4) — four ordered passes, order is doctrine', () => {
  test('the flow file exists as a fork-owned step of the testing machinery', () => {
    assert.ok(fs.existsSync(path.join(ROOT, TUNE_UP)), `${TUNE_UP} must exist`);
  });

  test('the four passes appear in the doctrinal order (by index, not by prose)', () => {
    const text = read(TUNE_UP);
    const profile = at(text, /##\s*Pass 1/);
    const config = at(text, /##\s*Pass 2/);
    const audit = at(text, /##\s*Pass 3/);
    const rebase = at(text, /##\s*Pass 4/);
    assert.ok(profile !== -1 && config !== -1 && audit !== -1 && rebase !== -1, 'all four passes are headed sections');
    assert.ok(profile < config, 'profile before config');
    assert.ok(config < audit, 'config BEFORE tests — the predictable half first');
    assert.ok(audit < rebase, 'audit before re-baseline');
  });

  test('pass 1 is evidence-first: slowest files, setup-vs-test split, container lifecycle', () => {
    const text = read(TUNE_UP);
    const pass = text.slice(at(text, /##\s*Pass 1/), at(text, /##\s*Pass 2/));
    assert.match(pass, /slowest/i);
    assert.match(pass, /setup[- ]vs[- ]test|setup vs\.? test/i);
    assert.match(pass, /container lifecycle/i);
    assert.match(pass, /no change without a measurement|evidence first|measure(ment)? first/i);
  });

  test('pass 2 defers to the per-stack current-API checklist rather than re-listing flags', () => {
    const text = read(TUNE_UP);
    const pass = text.slice(at(text, /##\s*Pass 2/), at(text, /##\s*Pass 3/));
    assert.match(pass, /test-strategy\.md|references\/test-strategy/);
    assert.match(pass, /current API|current APIs/i, 'a perf recipe with no version attached is a bug with a delay fuse');
  });

  test('pass 3 audits against the STRATEGY — five named classes, never merely "made faster"', () => {
    const text = read(TUNE_UP);
    const pass = text.slice(at(text, /##\s*Pass 3/), at(text, /##\s*Pass 4/));
    assert.match(pass, /implementation[- ]detail/i);
    assert.match(pass, /duplicat/i);
    assert.match(pass, /obsolete/i);
    assert.match(pass, /fixture/i);
    assert.match(pass, /serializ/i);
    assert.match(pass, /never (merely )?"?made faster"?|not (merely )?because it is faster|justified by the strategy/i);
  });

  test('pass 4 records the fix-class — config-drift, test-debt, or mixed with the dominant named', () => {
    const text = read(TUNE_UP);
    const pass = text.slice(at(text, /##\s*Pass 4/));
    assert.match(pass, /fix[- ]class/i);
    assert.match(pass, /config[- ]drift/i);
    assert.match(pass, /test[- ]debt/i);
    // Validation B F8: a run where config supplied 90% of the win must not
    // record pure test-debt — the column exists to teach the real failure mode.
    assert.match(pass, /mixed/i, 'a mixed run records both contributions, dominant first');
  });

  test('re-baselining APPENDS a new dated row — history is the trend the triggers read', () => {
    const text = read(TUNE_UP);
    const pass = text.slice(at(text, /##\s*Pass 4/));
    assert.match(pass, /append/i);
    assert.match(pass, /never (rewrite|overwrite|replace)|do not (rewrite|overwrite|replace)/i);
    assert.match(pass, /dated|date/i);
  });

  test('every entry point that can reach the flow is named in it', () => {
    const text = read(TUNE_UP);
    assert.match(text, /T1/, 'the immediate route');
    assert.match(text, /milestone close/i, 'the scheduled route');
    assert.match(text, /--tune-up/, 'the manual route');
  });
});

describe('the Suite-health update path is append-only in every place it is described', () => {
  test('the reference tune-up pass says append AND never rewrite', () => {
    const text = read(TEST_REF);
    const s = section(text, 'Suite health');
    assert.match(s, /append/i);
    assert.match(s, /never (rewrite|overwrite)|do not (rewrite|overwrite)/i);
  });

  test('the template says one row per milestone, appended', () => {
    const text = read(TEMPLATE);
    const s = section(text, 'Suite health');
    assert.match(s, /append/i);
    assert.match(s, /never (rewrite|overwrite|replace)|history/i);
  });
});

describe('the tune-up is registered as a mode of the testing machinery', () => {
  test('the workflow dispatches the flow file on --tune-up and exits', () => {
    const text = read(WORKFLOW);
    assert.match(text, /--tune-up/);
    assert.match(text, /testing-strategy\/steps\/suite-tune-up\.md/, 'the dispatch names the flow file');
  });

  test('the command advertises --tune-up in argument-hint and documents it under Flags', () => {
    const text = read(CMD_TESTING_STRATEGY);
    assert.match(text, /^argument-hint:.*--tune-up/m);
    assert.match(text, /^- `--tune-up`/m);
  });

  test('the emitted skill mirrors the flag (regenerated, not hand-edited)', () => {
    const text = read(SKILL_TESTING_STRATEGY);
    assert.match(text, /^argument-hint:.*--tune-up/m);
    assert.match(text, /--tune-up/);
  });

  test('the emitted skill description stays a single quoted line (the YAML strict-parse trap)', () => {
    const fm = read(SKILL_TESTING_STRATEGY).split('---')[1];
    const desc = fm.split('\n').find((l) => l.startsWith('description:'));
    assert.ok(desc, 'the skill must declare a description');
    assert.match(desc, /^description: ".*"$/, 'single-line, double-quoted — a bare multi-line description fails strict YAML parse');
  });
});

describe('the emitted mirror carries the certification-era scope (tracked N3)', () => {
  const scoped = () => [read(CMD_TESTING_STRATEGY), read(SKILL_TESTING_STRATEGY)];

  test('"How it works" names certification and suite health', () => {
    for (const text of scoped()) {
      const how = text.slice(at(text, /\*\*How it works:\*\*/), at(text, /\*\*Output:\*\*/));
      assert.match(how, /certif/i, 'the certification decision is part of the flow now');
      assert.match(how, /suite[- ]health|born[- ]fast/i, 'so is the suite-health baseline');
    }
  });

  test('the Output sentence names the certification + substrate + suite-health outputs', () => {
    for (const text of scoped()) {
      const out = text.slice(at(text, /\*\*Output:\*\*/), at(text, /<\/objective>/));
      assert.match(out, /certif/i);
      assert.match(out, /substrate/i);
      assert.match(out, /suite[- ]health/i);
    }
  });

  test('success criteria gained the certification and suite-health bullets', () => {
    for (const text of scoped()) {
      const crit = text.slice(at(text, /<success_criteria>/), at(text, /<\/success_criteria>/));
      assert.match(crit, /CERT-|certif/i);
      assert.match(crit, /substrate/i);
      assert.match(crit, /suite[- ]health|baseline/i);
    }
  });

  test('the spec no longer carries the Wave-2/3 emitted-mirror TODO', () => {
    const spec = read('docs/superpowers/specs/2026-08-10-testing-certification-design.md');
    assert.doesNotMatch(
      spec,
      /Wave-2\/3 obligation \(tracked/,
      'the tracked obligation line must be removed once the mirror is refreshed'
    );
  });
});

// The sweep block, bounded by its own FORK:strategy markers rather than a fixed
// byte window (Wave 3 review T4: a +4000 slice ran past </step> into push_branch).
function shipSweep() {
  const text = read(SHIP);
  const sweepAt = at(text, /certification sweep/i);
  const begins = [...text.matchAll(/<!-- FORK:strategy BEGIN -->/g)].map((m) => m.index);
  const ends = [...text.matchAll(/<!-- FORK:strategy END -->/g)].map((m) => m.index);
  for (let i = 0; i < begins.length; i++) {
    if (begins[i] < sweepAt && sweepAt < ends[i]) return text.slice(begins[i], ends[i]);
  }
  assert.fail('the certification sweep must sit inside a FORK:strategy marker pair');
}

describe('ship:pre milestone certification sweep (spec §5 secondary slot)', () => {
  test('ship carries the sweep at the pre-gate surface', () => {
    const text = read(SHIP);
    assert.match(text, /certification sweep/i);
  });

  test('it enumerates the recorded outcomes the certification step can write', () => {
    const sweep = shipSweep();
    assert.match(sweep, /agentic \(CERT/i, 'certified');
    assert.match(sweep, /human \(CERT-0\)/i, 'human');
    assert.match(sweep, /N\/A/, 'recorded N-A');
    assert.match(sweep, /not[- ]run/i, 'the one that matters');
  });

  test('a phase with no recorded outcome is FLAGGED, not omitted', () => {
    const sweep = shipSweep();
    assert.match(sweep, /flag/i);
    // Round-3 (Wave C, e2e-9 F6 / e2e-10 F6): the sweep now names the no-outcome
    // case as the **not-run** row ("flag it") and splits it from not-verified /
    // pre-adoption. The contract — a no-outcome phase is flagged, never omitted —
    // is unchanged; the wording moved from "no certification line recorded".
    assert.match(sweep, /not-run|no `?:?FIRST:?`? ?`?certification:`? line|no certification (outcome )?(line )?recorded|never recorded/i);
  });

  test('it is advisory — it never blocks, and it is never silent', () => {
    const sweep = shipSweep();
    assert.match(sweep, /advisory/i);
    assert.match(sweep, /never blocks?|does not block|non-blocking/i);
    assert.match(sweep, /never silent|always print|print the table even/i);
  });

  test('it self-suppresses from the evidence, not from an inline capability config read', () => {
    // ADR-857 Phase 6: the loop host resolves no capability-owned config key
    // inline (tests/phase6-capstone-conformance.test.cjs enforces it, and
    // tests/workflow-compat.test.cjs already bans the same shape for
    // workflow.tdd_mode). The recorded lines are the better signal anyway.
    const text = read(SHIP);
    assert.doesNotMatch(text, /config-get\s+workflow\.certification/, 'no inline capability config read in the host loop');
    const sweep = shipSweep();
    assert.match(sweep, /self-suppress/i);
    assert.match(sweep, /no phase carries a `certification:` line|not in use on this project/i,
      'zero recorded lines anywhere is a project-level fact, not N gaps');
    assert.match(sweep, /Never flag every phase|not N gaps/i);
  });

  test('the sweep sits after the existing ship:pre gates and before the branch is pushed (by index)', () => {
    const text = read(SHIP);
    const windows = at(text, /Broken-windows ship gate/);
    const sweep = at(text, /certification sweep/i);
    const push = at(text, /<step name="push_branch">/);
    assert.ok(windows !== -1 && sweep !== -1 && push !== -1);
    assert.ok(windows < sweep, 'it follows the existing gates rather than displacing them');
    assert.ok(sweep < push, 'it is a PRE-flight check');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 2 review fix wave (folded into Wave 3). Each test below pins a finding
// so the fix cannot regress silently: N2 (the preamble no longer contradicts
// the `off` opt-out), N3 (the Coverage-debt reader exists — it was a claimed
// consumer with no code behind it), T4 (the certification posture rides the
// INIT bundle, so the step file carries no launcher preamble).
// ─────────────────────────────────────────────────────────────────────────────

describe('Wave 2 review fix wave', () => {
  test('N2 — the no-silent-path invariant is scoped to the modes that have one', () => {
    const t = read(CERT_STEP);
    const preamble = t.slice(0, at(t, /^##\s*1\./m));
    assert.match(preamble, /no silent path/i, 'the invariant is still stated');
    assert.match(
      preamble,
      /unless[^\n]*`workflow\.certification`[^\n]*`off`|`off`[^\n]*the one[^\n]*opt-out/i,
      'and it is qualified by the one configured opt-out, which §1 then implements'
    );
  });

  test('N3 — the Coverage-debt section has a real reader, and it is not a phantom flag', () => {
    const wf = read(WORKFLOW);
    assert.match(wf, /##\s*Coverage debt/, 'the strategy workflow must actually read the section');
    assert.match(wf, /Update/, 'on the Update path — the one that re-derives an existing strategy');
    const tpl = read(TEMPLATE);
    const debt = section(tpl, 'Coverage debt');
    assert.doesNotMatch(debt, /`--update`/, 'no flag is claimed that does not exist');
    assert.match(debt, /append-only/i);
    // Wave 3 review M1: the phantom flag came back in a NEW file, walking through
    // the template-scoped guard above. Sweep the whole authored corpus instead.
    const mdFiles = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) walk(rel);
        else if (e.name.endsWith('.md')) mdFiles.push(rel);
      }
    };
    walk('gsd-core');
    walk('commands/gsd');
    walk('skills');
    for (const f of mdFiles) {
      assert.doesNotMatch(read(f), /gsd[:-]testing-strategy[\s\S]{0,120}`--update`|`--update`[\s\S]{0,120}gsd[:-]testing-strategy/,
        `${f} claims a --update flag that does not exist (argument-hint is --auto/--text/--tune-up)`);
    }
  });

  test('T4 — the certification step reads its posture from the INIT bundle, not its own spawn', () => {
    const t = read(CERT_STEP);
    assert.match(t, /certification_mode/, 'the field is what the step consumes');
    assert.doesNotMatch(t, /_GSD_SHIM_NAME/, 'so the 4.5 KB runtime-launcher preamble is gone');
    assert.match(read(VERIFY_WORK), /certification_mode/, 'and the host names the field it threads through');
    assert.match(read('src/init.cts'), /certification_mode:/, 'init.verify-work resolves it');
  });

  test('T4 — the resolver degrades to `required`, never to "skip"', () => {
    const src = read('src/init.cts');
    const fn = src.slice(at(src, /function detectCertificationMode/), at(src, /function detectCertificationMode/) + 900);
    assert.match(fn, /catch\s*\{[\s\S]{0,80}return 'required'/, 'an unreadable posture is not a licence to skip');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Combined fix wave: Wave 3 review (M1–M3, N1–N6, T1–T4) + validation
// scenarios A/B/C. Each test pins one finding so the fix cannot silently
// regress. The probe/wall-clock/fix-class edits live in the suites above.
// ─────────────────────────────────────────────────────────────────────────────

describe('combined fix wave — transition compare (review M2/M3/N1/N4, validation B F6/F7/F9/F11)', () => {
  const compare = () => stepBody(read(TRANSITION), '<step name="suite_health_compare">');

  test('M2 — the step checks for an existing open todo before writing, and updates in place', () => {
    const step = compare();
    // Final-review MAJOR-1: the check must match FILENAMES — the slugs never appear in
    // todo bodies, so a grep -l over contents is a dead branch that always misses.
    assert.match(step, /EXISTING=\$\(ls [^\n]*suite-health-t1[^\n]*suite-tune-up[^\n]*\)/,
      'the duplicate check lists todo FILES by name glob (contents never carry the slug)');
    assert.doesNotMatch(step, /grep -l '[^']*suite-(health-t1|tune-up)/,
      'no content-grep for filename slugs — that branch can never fire');
    assert.match(step, /update it in place|refresh (it|its numbers)|instead of (adding|writing) a second/i,
      'an existing open todo is refreshed, never duplicated — N identical todos at audit-open was the failure');
  });

  test('M2/B-F6 — T2–T4 get a deterministic filename, not just a directory', () => {
    const step = compare();
    assert.match(step, /suite-tune-up-milestone-close\.md/,
      'the milestone-close todo has a stable name the duplicate check can find');
  });

  test('B-F7 — a fired T2–T4 is visible in the transition output, not silently deferred', () => {
    const step = compare();
    assert.match(step, /\[suite health: T\{?n?\}? fired|fired — tune-up scheduled/i,
      'one line names the scheduled trigger; a trigger is never a silent row');
  });

  test('M3 — T4 reads the last tune-up row (fix-class), not merely the last row', () => {
    const step = compare();
    assert.match(step, /fix-class/, 'the fix-class column is how the step finds the last tune-up');
    assert.match(step, /unevaluable|not evaluable|cannot be evaluated/i,
      'a table with no tune-up row anywhere makes T4 unevaluable, never auto-fired');
  });

  test('N1 — the step says which tier budget the measured wall_clock belongs to', () => {
    const step = compare();
    assert.match(step, /whole suite[^\n]*PR[- ]gate|PR[- ]gate tier|PR-gate/i,
      'the post-merge gate measures the whole suite, so the number is PR-gate tier unless the strategy says otherwise');
    assert.match(step, /strategy time|Step 6\.5/i, 'the dev-loop budget is checked at strategy time, not here');
  });

  test('N4 — the read is the newest SUMMARY that CARRIES a suite-metrics block', () => {
    const step = compare();
    assert.match(step, /that carries|grep -l '\^?suite-metrics/,
      'a doc-only newest SUMMARY must not shadow an earlier measured one');
  });

  test('B-F9 — T3 is declared unevaluable when containers_started is an em dash', () => {
    const step = compare();
    const t3Row = step.split('\n').find((l) => l.includes('**T3'));
    assert.ok(t3Row, 'the T3 row exists');
    assert.match(t3Row, /—/, 'the em-dash case is named in the T3 row itself');
  });

  test('B-F11 — the XX-current placeholder is named as a placeholder to substitute', () => {
    const step = compare();
    assert.match(step, /XX-current[^\n]*(placeholder|substitute)|(placeholder|substitute)[^\n]*XX-current/i);
  });
});

describe('combined fix wave — certification step (validation A F1/F2/F4/F5/F7/F9, C F1/F4/F6)', () => {
  const step = () => read(CERT_STEP);

  test('A-F1 — the preamble no longer contradicts §5 on who writes the brief', () => {
    const preamble = step().slice(0, at(step(), /^##\s*1\./m));
    assert.match(preamble, /writes only the brief|the brief file itself.*create_uat_file writes/is,
      'the step writes the brief; create_uat_file writes the entries and the outcome line');
    assert.doesNotMatch(preamble, /writes none of them itself/,
      'the old sentence was wrong for one of its three items');
  });

  test('A-F2/C-F4 — the re-check demotes only; promotion belongs to the strategy', () => {
    const s4 = step().slice(at(step(), /^##\s*4\./m), at(step(), /^##\s*5\./m));
    assert.match(s4, /only demote|never promote|demotes; it never promotes/i);
    assert.match(s4, /gsd:testing-strategy/, 'the stale row has an owner: the strategy skill, not this run');
    assert.match(s4, /exceed/i, 'the probe-beats-the-row case is named, not left to improvisation');
  });

  test('C-F4 — CERT-0 short-circuits the re-check instead of inviting a sniff', () => {
    const s4 = step().slice(at(step(), /^##\s*4\./m), at(step(), /^##\s*5\./m));
    assert.match(s4, /CERT-0[^\n]{0,120}(skip|no driver to re-check|short-circuit)/i,
      'on CERT-0 the mechanism names no driver, so there is no subject — and command -v is the sniff §1 bans');
  });

  test('A-F11 — the trust gate has a failure branch, and "this HOME" means the real one', () => {
    const s3 = step().slice(at(step(), /^##\s*3\./m), at(step(), /^##\s*4\./m));
    assert.match(s3, /permanently sandbox|stays sandboxed|keep the tool.*sandbox|certif[a-z]* from inside the sandbox/is,
      'an audit that finds instrumentation keeps the tool sandboxed — the outcome the doc itself predicts');
    assert.match(s3, /real HOME/, 'the exemption clause names which HOME it means');
  });

  test('A-F4 — the separation table covers all four tiers, including CERT-1 (limited)', () => {
    const s6 = step().slice(at(step(), /^##\s*6\./m), at(step(), /^##\s*7\./m));
    for (const tier of ['CERT-2', 'CERT-1 (limited)', 'CERT-1', 'CERT-0']) {
      assert.ok(s6.includes(`**${tier}**`), `separation row missing: ${tier}`);
    }
  });

  test('A-F5 — same-family separation has a decision test, not a contradiction', () => {
    const s6 = step().slice(at(step(), /^##\s*6\./m), at(step(), /^##\s*7\./m));
    assert.match(s6, /accepted (weakest|minimum)|weakest accepted/i);
    assert.match(s6, /violation only|only a violation|only when fresh context/i,
      'the agent can tell when same-family is acceptable vs when to route to the human');
  });

  test('A-F7 — both the recorded and the display line count checkpoints', () => {
    const t = step();
    assert.doesNotMatch(t, /flows certified/, 'a brief flow can cover zero or several checkpoints');
    assert.match(t, /checkpoints certified/, 'the checkpoint is the unit UAT counts');
  });

  test('A-F9 — evidence bundle and starter script have prescribed paths', () => {
    const t = step();
    assert.match(t, /certification-evidence\//, 'the evidence bundle path is prescribed like the brief path');
    assert.match(t, /CERTIFICATION-SCRIPT/, 'the starter script path is prescribed');
  });

  test('C-F6 — the CERT-0 display line does not misframe the human path as escalations', () => {
    const s8 = step().slice(at(step(), /^##\s*8\./m));
    assert.match(s8, /for human certification/i,
      'a normal CERT-0 run reads "N checkpoints for human certification", not "0 certified, N escalated"');
  });

  test('A-F8/C-F1 — capsule-added checks reach the checkpoint set on every tier', () => {
    const t = step();
    assert.match(t, /capsule-added/i, 'the case is named');
    assert.match(t, /coverage_id/, 'their checkpoint shape (no coverage_id) is defined');
    const s5to7 = t.slice(at(t, /^##\s*5\./m));
    assert.match(s5to7, /never (be )?silently dropped|can never be dropped|reaches? the (human|checkpoint set|UAT)/i,
      'a capsule-added check must reach a human or a driver — CERT-0 dropped them entirely');
  });
});

describe('combined fix wave — off posture and the ship sweep (review N2, validation C F2/F5)', () => {
  test('C-F2 — off is recorded, not absent: the posture is the decision', () => {
    const t = read(CERT_STEP);
    assert.match(t, /certification: off \(posture\)/,
      'an off-era phase carries a line saying so — otherwise it is indistinguishable from a failed run forever');
    const modeTable = t.slice(at(t, /^\| `workflow\.certification` \|/m), at(t, /^##\s*2\./m));
    assert.doesNotMatch(modeTable, /Record nothing/i, 'off no longer records nothing');
  });

  test('C-F2 — the outcome table and create_uat_file both know the off line', () => {
    const s8 = read(CERT_STEP).slice(at(read(CERT_STEP), /^##\s*8\./m));
    assert.match(s8, /off \(posture\)/);
    assert.match(read(VERIFY_WORK), /off \(posture\)/, 'the UAT writer records it too');
  });

  test('review T1 — the dead "section was excluded" branch is gone from create_uat_file', () => {
    assert.doesNotMatch(read(VERIFY_WORK), /or the section was excluded/,
      'the dispatch is deliberately not a section; there is nothing to exclude');
  });

  test('N2 — pre-adoption phases are classified, not flagged forever', () => {
    const sweep = shipSweep();
    assert.match(sweep, /pre-adoption/i, 'a UAT that predates the earliest recorded line is pre-adoption');
    assert.match(sweep, /not counted|never counted|excluded from the ⚠|not in the ⚠/i,
      'pre-adoption phases stay out of the warning count — a warning wrong on every run stops being read');
  });

  test('C-F2 — the sweep reads the off posture line as a decision, not a gap', () => {
    const sweep = shipSweep();
    assert.match(sweep, /off \(posture\)/, 'the off outcome has a table row');
  });

  test('C-F5 — the table joins on the ordered phase list, not on grep output order', () => {
    const sweep = shipSweep();
    assert.match(sweep, /phase list in order|iterat[a-z]+ the `?ls -d`? (phase )?list|in `ls -d` order/i,
      'parallel grep drop-ins reorder; the ls -d list is already ordered');
  });
});

describe('combined fix wave — writers, precedents, and the enum clamp (review N3/N6, C F7, A F10)', () => {
  test('N3 — suite-metrics has a stated precedence: the post-merge gate wins in a phase run', () => {
    const g = read(SUMMARY_TEMPLATE);
    assert.match(g, /authoritative|overwrites/i,
      'two writers, one rule: the gate measurement overwrites a plan-written block; standalone keeps its own');
  });

  test('N6 — detectCertificationMode clamps to its declared enum', () => {
    const src = read('src/init.cts');
    const fn = src.slice(at(src, /function detectCertificationMode/), at(src, /function detectCertificationMode/) + 900);
    assert.match(fn, /\[\s*'required',\s*'offer',\s*'off'\s*\]\.includes/,
      'an out-of-enum string degrades to required like every other unreadable posture');
  });

  test('C-F7 — the precedent claim states its own placement difference', () => {
    const vw = read(VERIFY_WORK);
    assert.match(vw, /inside[^\n]*execute_waves|execute_waves[^\n]*inside/i,
      'the post-merge-gate precedent matches on form, not placement — say so');
  });

  test('A-F10 — the certification artifacts are committed with the UAT file', () => {
    const vw = read(VERIFY_WORK);
    const commitAt = at(vw, /query commit/);
    assert.ok(commitAt !== -1, 'the commit step exists');
    assert.match(vw.slice(commitAt - 400, commitAt + 600), /CERTIFICATION-BRIEF|certification-evidence|certification artifacts/i,
      'the canonical artifact is tracked, not left orphaned in .planning/');
  });
});

describe('combined fix wave — tune-up flow and born-fast checklist (review M1, validation B F2/F3/F4/F10)', () => {
  test('M1 — the strategy-question route names the real affordance, not a phantom flag', () => {
    const t = read(TUNE_UP);
    assert.match(t, /Update path|the Update (path|branch)/,
      'the Update path is an AskUserQuestion branch, not a flag');
    assert.doesNotMatch(t, /`--update`/);
  });

  test('B-F2 — the profile dichotomy has a third bucket: waits inside test bodies', () => {
    const t = read(TUNE_UP);
    const pass1 = t.slice(at(t, /##\s*Pass 1/), at(t, /##\s*Pass 2/));
    assert.match(pass1, /(sleep|wait|retr)[a-z]*[^\n]*(bodies|body)|bodies[^\n]*(sleep|wait|retr)/i,
      'non-assertion body time (sleeps/retries/backoff) is the most common sink and it routes to Pass 3, not to sharding');
  });

  test('B-F3 — the serialization audit class owns unconditional waits', () => {
    const t = read(TUNE_UP);
    const pass3 = t.slice(at(t, /##\s*Pass 3/), at(t, /##\s*Pass 4/));
    assert.match(pass3, /unconditional waits|fixed `?sleep/i, 'fixed sleeps have a home class now');
    assert.match(pass3, /[Pp]oll, never sleep/, 'the flaky-test-checklist doctrine is inherited, not re-derived');
  });

  test('B-F4 — the born-fast JS/TS rungs include node --test and Jest', () => {
    const ref = read(TEST_REF);
    const s = section(ref, 'Suite health');
    assert.match(s, /node --test|node:test/, 'the runner GSD itself uses is on the checklist');
    assert.match(s, /--test-concurrency/, 'with its concurrency knob');
    assert.match(s, /Jest/, 'and the largest runner by installs is not absent');
  });

  test('B-F10 — the first Suite-health row has a named writer', () => {
    const tpl = read(TEMPLATE);
    const s = section(tpl, 'Suite health');
    assert.match(s, /Step 6\.5|strategy time[^\n]*first row|first row[^\n]*strategy/i,
      'the strategy writes the baseline row; thereafter only the tune-up appends');
  });
});

describe('combined fix wave — dogfood corrections in the reference (validation A §3/§4)', () => {
  test('the CERT-1 (limited) example no longer claims the refuted dogfood row', () => {
    const ref = read(CERT_REF);
    const rows = tableRowsAfter(ref, 'certification ladder');
    const limited = rows.find((r) => r.includes('CERT-1 (limited)'));
    assert.ok(limited, 'the limited tier still exists — partial-capability environments are real');
    assert.doesNotMatch(limited, /dogfood-verified/,
      'the dogfood machine turned out to be full CERT-1 once Xvfb came up cleanly — the row was an artifact');
  });

  test('the probe section carries the re-probe lesson: rows describe a launch, not the machine', () => {
    const ref = read(CERT_REF);
    const s = section(ref, 'The probe');
    assert.match(s, /records? a (launch|date)|describe[sd]? a (launch|date)|launch, not the (tool|machine)/i,
      'the same box failed click/screenshot under a broken Xvfb and passed both under a clean one');
  });

  test('the trust receipts name the full blast radius: three agent CLIs plus the state dir', () => {
    const ref = read(CERT_REF);
    const s = section(ref, 'trust doctrine');
    assert.match(s, /Claude Code|claude/i, 'claude settings hooks are in the receipt');
    assert.match(s, /Gemini/i, 'gemini settings hooks are in the receipt');
    assert.match(s, /state (dir|directory)/i, 'the tool\'s own state directory is named');
  });
});

describe('combined fix wave — spec honesty (review T2)', () => {
  test('the spec describes the shipped shape: an unconditional dispatch, not a section gate', () => {
    const spec = read('docs/superpowers/specs/2026-08-10-testing-certification-design.md');
    assert.doesNotMatch(spec, /capability-gated section/,
      'the wave deliberately rejected the section wrapper; the canonical spec must not still specify it');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2.4.1 e2e fix wave — pins for the 20 installed-artifact e2e findings
// (.superpowers/sdd/e2e-{1,2,3}-report.md). Structural anchors, not prose.
// ─────────────────────────────────────────────────────────────────────────────

const PM_GATE = 'gsd-core/workflows/execute-phase/steps/post-merge-gate.md';

describe('e2e fix wave — measurement floor and unit coherence (e2e-3 F-1/F-2)', () => {
  test('the gate brackets the suite in milliseconds with a minimum of 1 ms', () => {
    const g = read(PM_GATE);
    assert.match(g, /SUITE_START_MS=\$\(node -e/, 'ms bracket via node (portable, not GNU-date-only)');
    assert.match(g, /\[ "\$SUITE_ELAPSED_MS" -lt 1 \] && SUITE_ELAPSED_MS=1/,
      'minimum of 1 — a run that executed can never record 0');
    assert.doesNotMatch(g, /SUITE_WALL_CLOCK_SEC/,
      'the floored-seconds shadow is gone (it blinded T2 below one second)');
    assert.doesNotMatch(g, /SUITE_START_EPOCH=\$\(date \+%s\)/,
      'the 1-second-resolution epoch bracket is gone (it recorded 0 for healthy sub-second suites)');
  });

  test('the SUMMARY schema states the floor and the omit-vs-measured tie-break', () => {
    const s = read(SUMMARY_TPL);
    const guidance = s.slice(s.indexOf('<suite_metrics_guidance>'), s.indexOf('</suite_metrics_guidance>'));
    assert.match(guidance, /minimum \*\*1\*\*|minimum of `?1`? ?ms/i, 'wall_clock_ms minimum stated in the schema');
    assert.match(guidance, /never `?0`?\b/i, 'a measured run can never record 0');
    assert.match(guidance, /tie-break/i, 'the omit-rule vs record-exactly collision is resolved explicitly');
  });

  test('the compare treats a 0 wall_clock on either side as unmeasured (legacy pre-floor rows)', () => {
    const t = read(TRANSITION);
    const step = t.slice(t.indexOf('suite_health_compare'));
    // Round 3 (e2e-9 F1 / e2e-8 F4) generalized the round-2 zero-guard: a `0` wall clock is
    // one case of "not a positive finite integer", now handled alongside the real divisor
    // guard on test_count (the round-2 guard named only the dividend). The 0-handling intent
    // is preserved and broadened, not dropped.
    assert.match(step, /a `0` wall clock is included|wall clock is `0`|positive finite integer/,
      'a 0 wall clock is unmeasured, never reaches the arithmetic');
    assert.match(step, /never become a divisor|never a real reading/i,
      'the guard names the divide-by-zero it prevents');
  });
});

describe('e2e fix wave — transition compare robustness (e2e-3 F-3/F-4/F-6)', () => {
  test('todo filenames use the local calendar date — the same clock as add-todo', () => {
    const t = read(TRANSITION);
    const step = t.slice(t.indexOf('suite_health_compare'));
    assert.match(step, /TODAY=\$\(date \+%Y-%m-%d\)/, 'local date, not UTC');
    assert.doesNotMatch(step, /date -u \+%Y-%m-%d/, 'the UTC form is gone');
    assert.match(read('gsd-core/workflows/add-todo.md'), /same clock/i,
      'add-todo states the shared-clock contract from its side');
  });

  test('the newest-SUMMARY expansion is NUL-delimited, not naked word-splitting', () => {
    const t = read(TRANSITION);
    assert.match(t, /tr '\\n' '\\0' \| xargs -0 ls -t/, 'quote-safe newline handling');
    assert.doesNotMatch(t, /ls -t \$M \| head/, 'the unquoted expansion is gone');
  });

  test('T1 override points at a slot the template actually ships', () => {
    assert.match(read(TRANSITION), /T1 budget note/, 'transition names the note line');
    assert.match(read(TEMPLATE), /\*\*T1 budget note \(optional\):\*\*/, 'the template ships it');
  });
});

describe('e2e fix wave — tune-up routing (e2e-3 F-5)', () => {
  test('Pass 1 has a rule when no bucket reaches 80%', () => {
    assert.match(read(TUNE_UP), /No bucket at 80\s?%\? The dominant bucket\s+wins/i,
      'dominant-bucket tie-break stated');
  });
});

describe('e2e fix wave — certification step (e2e-2 F1/F2/F4/F5)', () => {
  test('the outcome line has a closed, spelled-out note set including the sandbox note', () => {
    const c = read(CERT_STEP);
    assert.match(c, /closed set/i, 'the note list is closed, not open-ended');
    assert.match(c, /probe\s+exceeded recorded tier/, 'note 1 spelled');
    assert.match(c, /driver permanently sandboxed\s+\(instrumentation found at first launch\)/,
      'note 2 spelled — the instrumentation branch has a sanctioned outcome append');
    // §3 references the sanctioned spelling instead of a free-form instruction
    assert.doesNotMatch(c, /name the finding in the outcome\./,
      'the free-form "name the finding" instruction is replaced by the sanctioned note');
  });

  test('the source: agentic UAT template carries coverage_id (traceability parity)', () => {
    const c = read(CERT_STEP);
    assert.match(c, /coverage_id: \[D-id[\s\S]{0,160}capsule-added[\s\S]{0,60}\]/,
      'coverage_id line present, with the capsule-added exemption stated');
  });

  // Round-2 Wave B (e2e-4 F11): the `data:` URL leg was RETIRED as a prescription —
  // onorca 1.4.178's `goto` rejects the scheme the reference named as today's
  // lowest-friction driver, and a first-time prober reads that as a demotion. One
  // local HTTP server now serves the page AND logs the POSTs, so all five legs run
  // against http://127.0.0.1. The pin follows the design, not the retired wording.
  test('the re-probe names its throwaway substrate (one locally served page + POST log)', () => {
    const c = read(CERT_STEP);
    assert.match(c, /local HTTP server/i, 'the served-page + POST-log substrate is named in the step');
    assert.match(c, /127\.0\.0\.1/, 'the step points the probe at a locally served page');
    assert.doesNotMatch(c, /a `data:`\s*\n?\s*URL page covers/,
      'the step must not prescribe a page source its own named driver rejects');
    const ref = read(CERT_REF);
    assert.match(ref, /throwaway substrate is self-served/i, 'the reference owns the recipe');
    assert.match(ref, /logs the POST bodies it receives/i, 'reference names the effect-assertion server');
  });

  test('the certifier input boundary defines "environment"', () => {
    const c = read(CERT_STEP);
    assert.match(c, /The environment is\*?\*?:/, 'environment defined, not left open');
    assert.match(c, /named in the brief, never smuggled/i,
      'assertion targets must come from the brief, not the dispatch prompt');
  });
});

describe('e2e fix wave — verify-work seam (e2e-2 F3/F6)', () => {
  test('cold-start pattern matching is defined (basename for files, segment for dirs)', () => {
    const v = read(VERIFY_WORK);
    assert.match(v, /matching is on the path'?s basename/i, 'basename rule stated');
    assert.match(v, /fixture-app\.js[^\n]*does NOT match/i, 'the disambiguating example shipped');
  });

  test('the init call site warns the phase argument is positional', () => {
    assert.match(read(VERIFY_WORK), /phase arg is POSITIONAL/i);
  });
});

describe('e2e fix wave — strategy chain (e2e-1 F1/F2/F3/F4/F5/F6/F8)', () => {
  const CHAIN = [
    ['gsd-core/workflows/testing-strategy.md', 'TEST-STRATEGY'],
    ['gsd-core/workflows/cicd-strategy.md', 'CICD-STRATEGY'],
    ['gsd-core/workflows/discover-product.md', 'PRODUCT-BRIEF'],
    ['gsd-core/workflows/frontend-architecture.md', 'FRONTEND-ARCHITECTURE'],
    ['gsd-core/workflows/infrastructure-strategy.md', 'INFRA-STRATEGY'],
    ['gsd-core/workflows/legacy-inventory.md', 'LEGACY-INVENTORY'],
    ['gsd-core/workflows/model-domain.md', 'DOMAIN-MODEL'],
    ['gsd-core/workflows/recommend-architecture.md', 'adr/NNNN-architecture'],
    ['gsd-core/workflows/security-strategy.md', 'SECURITY-STRATEGY'],
  ];
  for (const [wf] of CHAIN) {
    test(`${wf.split('/').pop()} commits the discussion log when it exists (F1)`, () => {
      const w = read(wf);
      assert.match(w, /DLOG=\$\(\[ -f \.planning\/PROJECT-DISCUSSION-LOG\.md \]/,
        'conditional DLOG expansion (a missing log must not abort the fail-closed commit)');
      assert.match(w, /--files [^\n]*\$DLOG/, 'the commit line includes $DLOG');
    });
  }

  test('new-project extends its FORK:context block with the commit inclusion (F1)', () => {
    const w = read('gsd-core/workflows/new-project.md');
    const block = w.slice(w.indexOf('<!-- FORK:context BEGIN -->'), w.indexOf('<!-- FORK:context END -->'));
    assert.match(block, /include `\.planning\/PROJECT-DISCUSSION-LOG\.md` in the PROJECT\.md docs commit/,
      'the upstream-shared file carries the instruction inside its existing marked block');
  });

  test('the template ships a Launch conditions slot for the instrumentation audit (F2)', () => {
    assert.match(read(TEMPLATE), /\*\*Launch conditions:\*\*/,
      'the trust-gate audit result has a recorded home');
  });

  test('Step 4 states its fallback when DOMAIN-MODEL/REQUIREMENTS are absent (F3)', () => {
    const w = read(WORKFLOW);
    assert.match(w, /both optional; when either is absent, derive from PROJECT\.md/i);
    assert.match(w, /or their absence recorded/i, 'success criterion admits the absence path');
  });

  test('every substrate row admits an honest N/A (F4)', () => {
    const t = read(TEMPLATE);
    const table = t.slice(t.indexOf('## Certification substrate'), t.indexOf('## Coverage'));
    const rows = table.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| Policy') && !l.startsWith('|---'));
    assert.ok(rows.length >= 4, 'four policy rows');
    for (const row of rows) assert.match(row, /N\/A — no /i, `row admits N/A: ${row.slice(0, 40)}`);
    assert.match(read(WORKFLOW), /first-class row value/i, 'the workflow states N/A is recorded, never invented');
  });

  test('test-containers and db-test-isolation are called references, not skills (F5)', () => {
    assert.doesNotMatch(read(TEMPLATE), /`db-test-isolation` skills/, 'the mislabel is gone');
    assert.match(read(TEMPLATE), /`db-test-isolation` references/);
  });

  test('no bare relative artifact refs remain in the workflow (F6)', () => {
    const w = read(WORKFLOW);
    assert.doesNotMatch(w, /execute `gsd-core\//, 'read-and-execute targets are absolute');
    assert.doesNotMatch(w, /\(`references\/test-strategy\.md/, 'reference pointers are absolute');
    assert.doesNotMatch(w, /see `templates\/user-setup\.md`/, 'template pointers are absolute');
  });

  test('the ladder covers apps with no browser surface (F8 / e2e-11 non-web extension)', () => {
    const ref = read(CERT_REF);
    assert.match(ref, /^##[^\n]*Surface type/im, 'a first-class surface-type section exists');
    assert.match(ref, /real dependencies/i, 'API/CLI certification shape named');
    assert.match(ref, /first browser surface/i, 'the deferred-trigger phrasing shipped');
    // e2e-11: the four surfaces are named and given honest tiers/exercises.
    for (const surface of [/\bbrowser\b/i, /\bcli\b/i, /\bapi\b/i, /\blibrary\b/i]) {
      assert.match(ref, surface, `surface type ${surface} is named`);
    }
    assert.match(ref, /CERT-0 means[^.\n]{0,60}not[^.\n]{0,20}browser|not[^.\n]{0,20}"?no browser"?/i,
      'CERT-0 means "cannot exercise the real surface", not "no browser" (e2e-11 F2)');
    // e2e-11 F6: the two distinct N/A forms — a library with a public API is "no user-facing surface".
    assert.match(ref, /no user-facing surface/i, 'the library / no-surface form exists');
    // e2e-11 F5: a non-browser (seeded-token) auth branch, distinct from login/storage-state.
    assert.match(ref, /seeded (test )?token|Bearer/i, 'API/CLI auth is a seeded token, not a browser login');
  });

  test('the probe hint in the template is surface-typed (e2e-11 F4)', () => {
    const t = read(TEMPLATE);
    assert.match(t, /Surface type:/i, 'the template records a surface type');
    assert.match(t, /goto \/ snapshot \/ fill \/ click round-trip \/ screenshot/, 'browser probe ops retained');
    assert.match(t, /stdout \/ exit|status \/ shape/i, 'cli/api exercise fields exist, not only browser ops');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Round-2 fix wave, Wave A — design fixes from the installed-2.4.1 e2e runs
// (e2e-4/5/6/7 reports). Four designs: the CERT-2 handover protocol, strategy
// Update merge semantics, cicd's single-measurement + C1-b guard, and the
// millisecond suite-metrics redesign. Structural anchors, not prose pins.
// ─────────────────────────────────────────────────────────────────────────────

const CICD_WORKFLOW = 'gsd-core/workflows/cicd-strategy.md';

describe('CERT-2 handover protocol (e2e-6 F2/F3/F4/F5/F1/F6)', () => {
  const step = () => read(CERT_STEP);

  test('F2 — §4 re-check has per-tier semantics: CERT-2 is confirmed as a project fact, never probed locally', () => {
    const s = step();
    assert.match(s, /CERT-2[^\n]*(off|other)-machine|off-machine[^\n]*CERT-2/i,
      'the off-machine nature of CERT-2 is named in the re-check');
    assert.match(s, /(handover|hand-over|handoff)[^.]{0,160}(channel|preconditions)/i,
      'the CERT-2 re-check subject is the handover channel + preconditions, not a local binary');
    assert.match(s, /demotes[^.]*never promotes/i, 'demote-only survives for local tiers');
  });

  test('F6 — a same-named local binary is not the recorded desktop driver', () => {
    assert.match(step(), /desktop[^.\n]{0,120}(CLI|command-line)|CLI[^.\n]{0,120}desktop/i,
      'the desktop-app vs CLI product distinction is stated');
  });

  test('F3 — a pending outcome line exists in the closed set', () => {
    assert.match(step(), /certification: pending \(CERT-2/,
      'the handed-over state has its own sanctioned line');
  });

  test('F3 — the return path is a named result file whose shape the brief states', () => {
    const s = step();
    assert.match(s, /CERTIFICATION-RESULT\.md/, 'the result file has a prescribed name');
    assert.match(s, /report back|How to report/i, 'the brief carries the report-back contract');
  });

  test('F3 — re-entry consumes a present result and upgrades pending', () => {
    assert.match(step(), /pending[^.]{0,200}(result|RESULT)[^.]{0,200}(consume|ingest|upgrade|write)/is,
      're-running with a result present is a defined path');
  });

  test('F4 — handed-over checkpoints are pending-certifier, not asked of the human now', () => {
    const s = step();
    assert.match(s, /pending-certifier/, 'the handed-over UAT state exists');
    const vw = read(VERIFY_WORK);
    assert.match(vw, /pending-certifier/, 'create_uat_file/present_test know the state');
  });

  test('F5 — the brief carries the trust gate for the receiving machine', () => {
    assert.match(step(), /brief[^.]{0,250}(sandbox-first|isolated HOME|trust gate)/is,
      'the remote first launch is gated via the brief');
  });

  test('e2e-5 F3 — the isolated HOME has a stated location that is not /tmp', () => {
    for (const f of [CERT_STEP, CERT_REF]) {
      assert.match(read(f), /(sibling|under)[^.\n]{0,80}\$HOME|\$HOME[^.\n]{0,80}sibling/i,
        `${f}: the sandbox HOME lives under $HOME`);
      assert.match(read(f), /(never|not)[^.\n]{0,60}\/tmp|\/tmp[^.\n]{0,90}(refus|suppress|defeat)/i,
        `${f}: the /tmp trap is named`);
    }
  });

  test('F1 — the decline line carries its reason in sanctioned grammar', () => {
    assert.match(step(), /certification: skipped \(declined( — \{[^}]*reason[^}]*\})?\)/i,
      'the reason slot is part of the line grammar');
    assert.match(read(SHIP), /skipped \(declined/, 'the sweep matches the declined prefix');
  });

  test('F7/F9 — the step has a re-run dispatch table keyed on the existing outcome', () => {
    const s = step();
    assert.match(s, /re-run|already carries|existing outcome/i, 're-run semantics exist');
    assert.match(s, /pending[^|]*→|pending[^.\n]{0,120}(check|look)[^.\n]{0,40}result/i,
      'pending → check for the result');
    assert.match(s, /Re-offer under the current mode/i,
      'declined/off-era outcomes are re-offered under the current mode');
  });

  test('F8 — restart is defined and never destroys evidence-backed entries', () => {
    const vw = read(VERIFY_WORK);
    assert.match(vw, /restart[^.]{0,400}(archiv|supersed)/is,
      'restart archives the existing UAT file rather than clobbering it');
  });

  test('ship sweep classifies pending as its own row, distinct from not-run', () => {
    const sweep = read(SHIP);
    assert.match(sweep, /\| \*{0,2}pending\*{0,2} \|/, 'a pending row exists in the sweep table');
    assert.match(sweep, /pending \(CERT-2/, 'it matches the pending line grammar');
  });

  test('registry off-description matches the recorded posture', () => {
    const cap = read(STRATEGY_CAP);
    assert.doesNotMatch(cap, /behaves exactly as it did before certification existed/,
      'the off description no longer promises an unrecorded skip');
    assert.match(cap, /off \(posture\)/, 'the off description names the recorded line');
  });
});

describe('strategy Update merge semantics (e2e-5 F2/F2b/F2c/F8, e2e-7 F3/F4)', () => {
  const wf = () => read(WORKFLOW);

  test('Step 7 has an Update branch that merges sections instead of re-rendering', () => {
    const s = wf();
    assert.match(s, /section-merge/i, 'the Update path is a section-merge');
    const start = s.indexOf('Two modes, decided by Step 1');
    assert.ok(start !== -1, 'the two-mode framing exists in Step 7');
    const block = s.slice(start, s.indexOf('Render `@', start));
    assert.match(block, /byte-intact/i, 'the preservation contract is stated');
    for (const sect of ['## Notes', 'gnarly', 'CI execution map', '## Suite health', '## Coverage debt', '## Certification']) {
      assert.ok(block.includes(sect), `preservation names: ${sect}`);
    }
  });

  test('e2e-7 F3 — Certification is never silently downgraded by a re-probe', () => {
    assert.match(wf(), /never\s+silently\s+(downgrade|overwrite|demote)/i,
      'a downward tier change requires the user');
  });

  test('e2e-5 F8 — an absent Coverage debt section is a stated, valid pre-2.4 state', () => {
    assert.match(wf(), /absent[^.]{0,200}(Coverage debt|section)|Coverage debt[^.]{0,220}absent/is,
      'absent (not just empty) is handled');
  });

  test('e2e-5 F2b — reference defaults go to TESTING-STANDARDS.md, never into existing Notes', () => {
    assert.match(wf(), /TESTING-STANDARDS\.md[^.]{0,300}(create|generate|write)/i,
      'the standards file is the destination');
    assert.match(wf(), /(never|not)[^.\n]{0,120}(overwrite|clobber)[^.\n]{0,60}Notes|Notes[^.\n]{0,90}(preserved|never overwritten)/i,
      'existing Notes are protected');
  });

  test('e2e-5 F2c — the template CI-map comment protects recorded stages on update', () => {
    assert.match(read(TEMPLATE), /(keep|preserve)[^.]{0,200}(existing|recorded)[^.]{0,60}(stage|row)/i,
      'the do-not-pre-assert rule is scoped to first renders');
  });
});

describe('cicd single-measurement + C1-b guard (e2e-7 F1/F2)', () => {
  const cicd = () => read(CICD_WORKFLOW);

  test('F1 — the false "nothing upstream captures it" claim is gone', () => {
    assert.doesNotMatch(cicd(), /nothing upstream in the chain captures it/);
  });

  test('F1 — C1-a reads the recorded Suite-health measurement before re-timing', () => {
    const s = cicd();
    assert.match(s, /## Suite health/,
      'the recorded table is named in cicd');
    assert.match(s, /(read|reads|use)[^.]{0,200}Suite health[^.]{0,300}(only|unless|when)[^.]{0,120}(absent|unmeasured|no measured|missing)/is,
      're-measure is conditional on no recorded row');
  });

  test('F1 — the INFER list includes the suite wall clock from TEST-STRATEGY', () => {
    assert.match(cicd(), /INFER[^]*?suite wall clock[^]*?TEST-STRATEGY/i);
  });

  test('F2 — C1-b carries the certification carve-out', () => {
    assert.match(cicd(), /(C1-b|cannot run on a PR)[^]{0,600}?certification/i,
      'certification is named near the C1-b trigger');
    assert.match(cicd(), /Not a pipeline tier/,
      'the guard line names the template row it honors');
  });
});

describe('millisecond suite metrics (e2e-4 F12, e2e-7 F5)', () => {
  test('SUMMARY schema records wall_clock_ms', () => {
    const s = read(SUMMARY_TPL);
    assert.match(s, /wall_clock_ms/, 'the ms field exists');
    assert.match(s, /legacy[^.]{0,200}wall_clock|wall_clock[^.]{0,250}legacy/is,
      'legacy seconds blocks have a stated reading');
  });

  test('post-merge gate Step C records the true millisecond bracket', () => {
    const g = read(POST_MERGE_GATE);
    assert.match(g, /wall_clock_ms/, 'Step C writes wall_clock_ms');
    assert.match(g, /SUITE_ELAPSED_MS/, 'from the real bracket, not a derived floor');
  });

  test('transition compare derives ms/test from milliseconds with a legacy fallback', () => {
    const t = read(TRANSITION);
    assert.match(t, /wall_clock_ms/, 'the compare reads the ms field');
    assert.match(t, /(×|\*|x)\s?1000|1000\s?(×|\*|x)|second-resolution|legacy/i,
      'seconds-only rows/blocks are converted, not rejected');
  });

  test('e2e-7 F5 — both table writers state the millisecond rule', () => {
    for (const f of [WORKFLOW, TUNE_UP]) {
      assert.match(read(f), /millisecond|_ms|\(ms\)/i, `${f} states the ms unit`);
    }
    assert.match(read(TEMPLATE), /wall_clock \(ms\)/, 'the table column is ms');
  });

  test('e2e-4 F12 — T2 has a stated noise floor so sub-second suites neither flap nor go blind', () => {
    for (const f of [TRANSITION, TEST_REF]) {
      assert.match(read(f), /250\s?ms|noise floor/i, `${f}: the T2 noise floor is stated`);
    }
  });

  test('the reference trigger table speaks milliseconds, not integer seconds', () => {
    assert.doesNotMatch(read(TEST_REF), /`wall_clock` in integer seconds/,
      'the authority table no longer pins the seconds unit');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Round-2 Wave B — mechanical seam repairs (e2e-4 F5/F7/F8/F10/F11,
// e2e-5 F7, e2e-7 F6). These are doc contracts: the deployed .md text IS what
// the agent executes, so the pinned structures are the fix.
// ─────────────────────────────────────────────────────────────────────────────
describe('round-2 Wave B — verify-work completion seams (e2e-4 F5/F7)', () => {
  const VW = 'gsd-core/workflows/verify-work.md';

  test('e2e-4 F5 — the human_needed → passed stamp is conditional on nothing being unproven', () => {
    const src = read(VW);
    const guard = /if \[ "\$VERIFICATION_STATUS_VALUE" = "human_needed" \] && \[ "\$BEHAVIOR_UNVERIFIED" -eq 0 \] && \[ "\$CERT_UNPROVEN" -eq 0 \]/;
    assert.match(src, guard, 'the stamp must require zero unverified behaviours AND zero unproven checkpoints');
    // The two inputs must actually be read from the two artifacts allowed to say so.
    assert.match(src, /BEHAVIOR_UNVERIFIED=.*frontmatter\.get .*behavior_unverified/,
      'behavior_unverified comes from VERIFICATION.md');
    assert.match(src, /CERT_UNPROVEN=.*pending-certifier.*could-not-prove/,
      'unproven certification checkpoints come from the UAT file');
  });

  test('e2e-4 F5 — a withheld stamp is announced, not silent', () => {
    const src = read(VW);
    assert.match(src, /If the stamp was withheld/i, 'the withheld branch is documented');
    assert.match(src, /still unproven/i, 'the user is told what is unproven');
  });

  test('e2e-4 F7 — coverage_gap_capture has a record-only entry that does not need a UAT issue', () => {
    const src = read(VW);
    const stepStart = src.indexOf('<step name="coverage_gap_capture">');
    assert.notStrictEqual(stepStart, -1);
    const step = src.slice(stepStart, src.indexOf('</step>', stepStart));
    assert.match(step, /record-only/, 'the second entry exists');
    assert.match(step, /behavior_unverified_items/, 'verifier-named gaps are a trigger');
    assert.match(step, /could-not-prove|pending-certifier/, 'certifier-escalated gaps are a trigger');
    assert.match(step, /never.*invent a `## Gaps` id|never\*\* invent a `## Gaps` id/i,
      'record-only must not fabricate a gap id the human never reported');
  });

  test('e2e-4 F7 — the record-only route does not fall into plan_gap_closure', () => {
    const src = read(VW);
    const stepStart = src.indexOf('<step name="coverage_gap_capture">');
    const step = src.slice(stepStart, src.indexOf('</step>', stepStart));
    assert.match(step, /\*\*Record-only entry:\*\* return to `complete_session`/,
      'record-only returns to complete_session instead of planning fixes');
  });
});

describe('round-2 Wave B — unsubstituted placeholders fail loud (e2e-4 F8)', () => {
  test('transition.md guards XX-current before the compare can silently no-op', () => {
    const src = read('gsd-core/workflows/transition.md');
    assert.match(src, /_GSD_PLACEHOLDER="XX""-current"/,
      'the sentinel must be assembled from two literals so a blind substitution cannot rewrite the guard');
    assert.match(src, /did NOT run — it is not a 'no metrics recorded' result/,
      'the message must distinguish "could not run" from the documented silent-skip branch');
  });

  test('automated-ui-verification.md guards an unset PHASE_DIR', () => {
    const src = read('gsd-core/workflows/verify-work/steps/automated-ui-verification.md');
    assert.match(src, /if \[ -z "\$\{PHASE_DIR:-\}" \]; then/, 'the step must check PHASE_DIR before globbing');
    assert.match(src, /NOT a 'no UI spec' result/,
      'an unset variable must never be reported as a fact about the phase');
  });
});

describe('round-2 Wave B — consumers read fields that exist (e2e-4 F10)', () => {
  test('complete-milestone no longer checks progress_percent', () => {
    const src = read('gsd-core/workflows/complete-milestone.md');
    assert.doesNotMatch(src, /`progress_percent` should be 100%/,
      'init.manager has never emitted progress_percent');
    assert.match(src, /`all_complete` should be `true`/, 'the rollup key that DOES exist is named');
    assert.match(src, /`phase_count` includes backlog/,
      'the counted-vs-gated asymmetry must be stated so the pair is not misread as a gate');
  });
});

describe('round-2 Wave B — the probe recipe is driver-agnostic about the page source (e2e-4 F11)', () => {
  const CERT_REF_B = 'gsd-core/references/certification.md';
  const CERT_STEP_B = 'gsd-core/workflows/verify-work/steps/agentic-certification.md';

  test('the reference no longer prescribes a data: URL for the goto leg', () => {
    const src = read(CERT_REF_B);
    assert.doesNotMatch(src, /a `data:` URL page covers goto\/snapshot/,
      'the prescription that fails on the reference\'s own named driver is gone');
    assert.match(src, /serves a throwaway page/i, 'the echo server also serves the page');
    assert.match(src, /http:\/\/127\.0\.0\.1/, 'all five legs run against a locally served page');
  });

  test('both surfaces name the driver rejection as a URL fact, never a capability demotion', () => {
    for (const f of [CERT_REF_B, CERT_STEP_B]) {
      const src = read(f);
      assert.match(src, /Unsupported browser URL/, `${f}: the live receipt is cited`);
      assert.match(src, /not a capability (verdict|demotion)|never\*\* a capability demotion/i,
        `${f}: the reading a first-time prober must not take is named`);
    }
  });
});

describe('round-2 Wave B — UAT template documents the certification line (e2e-5 F7)', () => {
  const UAT_TEMPLATE = 'gsd-core/templates/UAT.md';

  test('the file template carries the certification slot at the top of ## Tests', () => {
    const src = read(UAT_TEMPLATE);
    const testsIdx = src.indexOf('## Tests');
    assert.notStrictEqual(testsIdx, -1);
    const after = src.slice(testsIdx, testsIdx + 300);
    assert.match(after, /^\s*## Tests\s*\n\s*\ncertification: /,
      'the outcome line is the first line of ## Tests, at column 0 (ship.md greps for it there)');
  });

  test('the section rules enumerate the closed outcome set the workflow writes', () => {
    const src = read(UAT_TEMPLATE);
    for (const form of [
      'certification: agentic (CERT-1)',
      'certification: pending (CERT-2',
      'certification: human (CERT-0)',
      'certification: N/A — no user-facing change',
      'certification: skipped (declined —',
      'certification: off (posture)',
    ]) {
      assert.ok(src.includes(form), `templates/UAT.md must document the \`${form}\` form`);
    }
  });

  test('the section rules document [pending-certifier], which present_test never selects', () => {
    const src = read(UAT_TEMPLATE);
    assert.match(src, /\[pending-certifier\]/);
    assert.match(src, /NEVER presented/i);
  });
});

describe('round-2 Wave B — testing-strategy process section routes --tune-up (e2e-7 F6)', () => {
  for (const f of ['skills/gsd-testing-strategy/SKILL.md', 'commands/gsd/testing-strategy.md']) {
    test(`${f} names --tune-up and its step file in <process>`, () => {
      const src = read(f);
      const start = src.indexOf('<process>');
      assert.notStrictEqual(start, -1, 'no <process> section');
      const proc = src.slice(start, src.indexOf('</process>', start));
      assert.match(proc, /--tune-up/, 'the process section must name the flag it routes on');
      assert.match(proc, /suite-tune-up\.md/, 'and the step file it dispatches to');
      assert.match(proc, /does NOT author a strategy/,
        'the priming risk is that an agent skimming <process> authors on a tune-up run');
    });
  }
});
