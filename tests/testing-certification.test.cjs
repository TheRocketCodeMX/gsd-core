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
 *     the dogfood-verified CERT-1 (limited) tier between 0 and 1;
 *   - capability detection PROBES (4-command live probe, per-operation
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
    for (const op of [/goto|navigate/i, /snapshot/i, /click/i, /screenshot/i]) {
      assert.match(s, op, `the 4-command live probe must include ${op}`);
    }
    assert.match(s, /per-operation|per-op/i, 'per-operation verdicts are recorded');
    assert.match(s, /throwaway (page|app|fixture)|never the real app/i,
      'the probe runs against a throwaway page, never the real app');
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
    assert.match(wf, /command -v (codex|orca)/, 'binary detection is a shell command, not an interview');
    assert.match(wf, /playwright\.config/, 'playwright config presence is an observable check');
    assert.match(wf, /mcp__playwright__/, 'MCP browser tools are an observable runtime fact');
    assert.match(wf, /wsl/i, 'WSL/headless detection gates the display-bound drivers');
  });

  test('the workflow probes any driver found and records per-operation results', () => {
    const wf = read(WORKFLOW);
    assert.match(wf, /4-command|four-command/i, 'the live probe is named in the workflow');
    assert.match(wf, /per-operation|per-op/i, 'per-operation verdicts recorded in TEST-STRATEGY');
    assert.match(wf, /binary[^.\n]{0,80}(lead|not a capability)/i,
      'the binary-is-a-lead doctrine reaches the workflow');
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
    const wfProbe = wfStep.search(/4-command|four-command/i);
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

  test('## Suite health ships the baseline table with the five measured columns', () => {
    const tpl = read(TEMPLATE);
    const s = section(tpl, 'Suite health');
    const header = s.split('\n').find((l) => l.includes('test_count'));
    assert.ok(header, 'the baseline table header exists');
    for (const col of ['test_count', 'wall_clock', 'ms/test', 'containers_started', 'fix-class']) {
      assert.ok(header.includes(col), `baseline column missing: ${col}`);
    }
    const rows = tableRowsAfter(tpl, 'Suite health');
    assert.equal(rows.length, 1, 'exactly one baseline row — milestones append, the template never pre-asserts history');
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
    assert.match(block, /^\s+wall_clock:/m, 'wall_clock is recorded');
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
    assert.match(text, /SUITE_START_EPOCH=\$\(date \+%s\)/, 'a start epoch is taken before the suite runs');
    assert.match(text, /SUITE_WALL_CLOCK_SEC=/, 'and the elapsed seconds are derived from it');
    const startIdx = at(text, /SUITE_START_EPOCH=/);
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
    assert.match(text, /else\s*`—`|otherwise\s*`—`|`—`/, 'containers_started falls back to an em dash, never a guess');
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

  test('T1 fires immediately; T2/T3/T4 schedule at milestone close', () => {
    const step = stepBody(read(TRANSITION), '<step name="suite_health_compare">');
    assert.match(step, /T1[^\n]*(immediate|now)|immediate[^\n]*T1/i);
    assert.match(step, /milestone close/i);
    const t1 = at(step, /T1/);
    const close = at(step, /milestone close/i);
    assert.ok(t1 !== -1 && close !== -1, 'both routes exist');
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

  test('pass 4 records the fix-class with BOTH of its values', () => {
    const text = read(TUNE_UP);
    const pass = text.slice(at(text, /##\s*Pass 4/));
    assert.match(pass, /fix[- ]class/i);
    assert.match(pass, /config[- ]drift/i);
    assert.match(pass, /test[- ]debt/i);
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

describe('ship:pre milestone certification sweep (spec §5 secondary slot)', () => {
  test('ship carries the sweep at the pre-gate surface', () => {
    const text = read(SHIP);
    assert.match(text, /certification sweep/i);
  });

  test('it enumerates all four recorded outcomes the certification step can write', () => {
    const text = read(SHIP);
    const sweep = text.slice(at(text, /certification sweep/i), at(text, /certification sweep/i) + 4000);
    assert.match(sweep, /agentic \(CERT/i, 'certified');
    assert.match(sweep, /human \(CERT-0\)/i, 'human');
    assert.match(sweep, /N\/A/, 'recorded N-A');
    assert.match(sweep, /not[- ]run/i, 'the one that matters');
  });

  test('a phase with no recorded outcome is FLAGGED, not omitted', () => {
    const text = read(SHIP);
    const sweep = text.slice(at(text, /certification sweep/i), at(text, /certification sweep/i) + 4000);
    assert.match(sweep, /flag/i);
    assert.match(sweep, /no certification (outcome )?(line )?recorded|never recorded|no `certification:` line/i);
  });

  test('it is advisory — it never blocks, and it is never silent', () => {
    const text = read(SHIP);
    const sweep = text.slice(at(text, /certification sweep/i), at(text, /certification sweep/i) + 4000);
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
    const sweep = text.slice(at(text, /certification sweep/i), at(text, /certification sweep/i) + 4000);
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
