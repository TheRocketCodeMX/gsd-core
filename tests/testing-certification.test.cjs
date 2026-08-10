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
    assert.match(ref, /project fact, not a machine fact/i, 'capability may live on another machine/tool');
  });
});

describe('the probe (reference + workflow)', () => {
  test('detection probes — it never merely finds binaries', () => {
    const ref = read(CERT_REF);
    const s = section(ref, 'The probe');
    assert.match(s, /binar/i, 'the "a binary is a lead, not a capability" doctrine');
    for (const op of [/goto|navigate/i, /snapshot/i, /click/i, /screenshot/i]) {
      assert.match(s, op, `the 4-command live probe must include ${op}`);
    }
    assert.match(s, /per-operation|per-op/i, 'per-operation verdicts are recorded');
    assert.match(s, /throwaway page/i, 'the probe runs against a throwaway page, never the real app');
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
    assert.match(wf, /lead, not a capability/i, 'the binary-is-a-lead doctrine reaches the workflow');
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
    assert.match(s, /deliverability IS the feature/i);
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
    assert.match(s, /shape, never content/i);
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
    assert.match(s, /volume, not (a )?regression/i);
    assert.match(s, /tiering|sharding/i, 'the remedy for volume is C1, not a tune-up');
  });

  test('the tune-up flow is four ordered passes; order is doctrine', () => {
    const ref = read(TEST_REF);
    const s = section(ref, 'tune-up');
    for (const pass of [/[Pp]rofile/, /[Cc]onfig\/cache/, /audit against the strategy/i, /[Rr]e-baseline/]) {
      assert.match(s, pass, `tune-up pass missing: ${pass}`);
    }
    assert.match(s, /config before tests/i, 'the predictable half comes first');
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
    assert.match(wf, /genuinely broken/i,
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
      // Vendor self-reports with no methodology (X17, X18).
      assert.doesNotMatch(text, /3[-–—]?4[×x] faster|3[×x] faster/i, `${file}: unmethodized speed headline`);
    }
  });

  test('no invented per-test budget ships anywhere', () => {
    for (const file of SHIPPED) {
      const text = read(file);
      assert.doesNotMatch(text, /each (unit )?test (must|should) (run|complete|finish) in under/i,
        `${file}: no primary source publishes a per-test budget (X16)`);
    }
  });

  test('the 60-second Google number never ships as a budget (X15)', () => {
    for (const file of SHIPPED) {
      const text = read(file);
      assert.doesNotMatch(text, /small tests? (must|should) (run|complete|finish) in (under |less than )?60/i,
        `${file}: the 60s figure is a kill threshold with unresolved scope, not a budget`);
    }
  });
});
