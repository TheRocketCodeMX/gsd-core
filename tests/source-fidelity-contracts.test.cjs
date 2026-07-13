// allow-test-rule: source-text-is-the-product — see TheRocketCodeMX/gsd-core#3
// Reads .md product files whose deployed text IS what the runtime loads.

'use strict';

/**
 * Source-fidelity contracts (1.13.0).
 *
 * Pins the wiring that closes the design/source laundering failure: a from-design
 * build turned one literal `address` input into an invented street/city/state/zip
 * schema because (a) no builder grounded in the literal design and (b) no gate ever
 * diffed the build against it. These contracts assert the corrected model is wired
 * end-to-end — grounding (model-domain + planner-source-audit), the shared in-repo
 * oracle (DESIGN-INVENTORY template), the per-source precedence (single-sourced, no
 * drift), and the per-source gates (design-fidelity + disposition-gated parity +
 * vibe intent-gate). A green grep here would NOT have caught the original failure;
 * these substring contracts would.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const REF = (f) => `gsd-core/references/${f}`;
const WF = (f) => `gsd-core/workflows/${f}`;
const TPL = (f) => `gsd-core/templates/${f}`;
const AG = (f) => `agents/${f}`;

function has(rel, needle) {
  assert.ok(read(rel).includes(needle), `${rel} must contain: ${JSON.stringify(needle)}`);
}
function lacks(rel, needle) {
  assert.ok(!read(rel).includes(needle), `${rel} must NOT contain (regression): ${JSON.stringify(needle)}`);
}

describe('DOCTRINE: per-source precedence is canonical + complete (no drift)', () => {
  const EA = REF('exploration-and-adaptability.md');

  test('exploration-and-adaptability owns the canonical § Source precedence block', () => {
    has(EA, '## Source precedence');
    has(EA, 'fidelity ≠ blind reproduction');
  });

  test('all five source axes are named with their authority', () => {
    for (const src of ['Provided design', 'Legacy / old code', 'Vibe-coded prototype', 'External dependency', 'Strategy / DDD']) {
      has(EA, src);
    }
  });

  test('"structure" is disambiguated into observable-shape vs internal-modeling', () => {
    has(EA, 'observable');
    has(EA, 'internal');
  });

  test('the two other reference homes POINT to the canonical block (not restate it)', () => {
    // The drift we fixed: design-ingestion.md:30 had dropped "/structure" from a restated triad.
    // Single-sourcing means both now reference "§ Source precedence" instead of restating.
    has(REF('brownfield-adaptation.md'), '§ Source precedence');
    has(REF('design-ingestion.md'), '§ Source precedence');
  });

  test('engineering-standards names source-fidelity as the third failure axis (both directions)', () => {
    const ES = REF('engineering-standards.md');
    has(ES, 'source-fidelity');
    has(ES, 'blind reproduction');   // legacy under-rework direction
    has(ES, 'fidelity-loss');        // design over-invention direction
  });
});

describe('ORACLE: a normalized in-repo, provenance-tagged DESIGN-INVENTORY exists', () => {
  test('the design-inventory template ships with the user-facing-field oracle', () => {
    const T = TPL('design-inventory.md');
    has(T, '## Covered surfaces');
    has(T, 'provenance');
    has(T, 'address-failure guard'); // one address input must not become four required fields
  });

  test('design-ingestion describes the gate diffing the in-repo oracle, never the raw design', () => {
    const DI = REF('design-ingestion.md');
    has(DI, 'design-fidelity gate');
    has(DI, 'never the raw design');
    // The old FALSE promise ("the in-loop verifier checks design fidelity for from-design phases")
    // must be gone — replaced by the real, two-station gate description.
    lacks(DI, 'the in-loop verifier checks design fidelity for from-design phases');
  });
});

describe('GROUNDING: the strategy + plan layers re-ground in the design', () => {
  test('model-domain ingests a provided design and writes the oracle (root-cause fix)', () => {
    const MD = WF('model-domain.md');
    has(MD, 'Design-provided mode');
    has(MD, 'DESIGN-INVENTORY');
  });

  test('design-ingestion lists model-domain as a consumer (was conspicuously absent)', () => {
    has(REF('design-ingestion.md'), 'model-domain');
  });

  test('planner-source-audit carries DESIGN as a source type + the field-fidelity audit', () => {
    const PSA = REF('planner-source-audit.md');
    has(PSA, 'Five Source Types');
    has(PSA, 'Design fidelity (the address-failure guard)');
  });
});

describe('GATES: per-source fidelity gates are wired', () => {
  test('gsd-verifier has the design-fidelity gate (observable-shape diff)', () => {
    const V = AG('gsd-verifier.md');
    has(V, 'Design-fit check');
    has(V, 'address-failure guard');
  });

  test('gsd-verifier splits the Mode-fit gate: design-delta parity-exempt + vibe intent-gate', () => {
    const V = AG('gsd-verifier.md');
    has(V, 'parity-EXEMPT');                       // design-mandated change is not drift
    has(V, 'intent-hardening, NOT behavior-parity'); // vibe is not pinned to its bugs
  });

  test('gsd-plan-checker has the design-fidelity dimension + the two exemptions', () => {
    const PC = AG('gsd-plan-checker.md');
    has(PC, 'honor the provided design');
    has(PC, 'address-failure guard');
    has(PC, 'design-delta'); // exemption from characterization-first
  });
});

describe('SEAMS: trigger → write → read are mechanically wired (not prose-only)', () => {
  // The audit caught that the gates judged against an oracle never handed to them,
  // the fallback writer was unwired, and the entry points never detected a design.
  // These pin the MECHANISM so it can't regress to prose-deep again.

  test('READ: both gate spawn prompts hand the oracle to the Read-only gate agents', () => {
    has(WF('execute-phase.md'), 'DESIGN-INVENTORY.md and {phase_dir}/*-UI-SPEC.md'); // verifier spawn
    has(WF('plan-phase.md'), 'design oracle — REQUIRED input for the design-fidelity check'); // plan-checker spawn
  });

  test('WRITE: the oracle has live writers on the FE-led + fallback paths (not just optional model-domain)', () => {
    has(WF('frontend-architecture.md'), 'Write the field oracle');                 // FE-led path
    has(WF('plan-phase.md'), 'write `.planning/DESIGN-INVENTORY.md` before finalizing the data shape'); // planner fallback
  });

  test('TRIGGER: all three entry points detect/route a provided design', () => {
    has(WF('new-project.md'), 'Provided-design detection');
    has(WF('new-milestone.md'), 'ships to a provided design');
    has(WF('discover-product.md'), 'design-source pointer');
  });

  test('TRIGGER: init emits a machine design-hint signal (symmetric with the legacy axis)', () => {
    // src is TS; the compiled .cjs is gitignored — assert on the source of truth.
    const init = require('fs').readFileSync(path.join(ROOT, 'src/init.cts'), 'utf8');
    for (const f of ['has_design_hint', 'design_pointer', 'design_hint_source', 'design_dismissed']) {
      assert.ok(init.includes(f), `src/init.cts must emit ${f}`);
    }
    has(WF('new-project.md'), 'has_design_hint'); // the workflow consumes it
  });

  test('TRIGGER: the design-fidelity gate fires on a schema/contract field that backs a covered surface (not only UI phases)', () => {
    has(AG('gsd-verifier.md'), 'backs a design-covered surface');
    has(TPL('design-inventory.md'), 'Backs (surface field)'); // the column that maps a built column to its user-facing field
  });

  test('code-reviewer is the diff-time fidelity-loss catcher AND is handed the oracle', () => {
    has(AG('gsd-code-reviewer.md'), 'fidelity-loss');
    // The hook is inert unless the spawn prompt actually hands it the oracle (the residual dead READ seam).
    has(WF('code-review.md'), '.planning/DESIGN-INVENTORY.md');
  });

  test('the verifier records a structured Design-fit verdict (auditable, not buried in prose)', () => {
    has(TPL('verification-report.md'), 'Design-fit');
  });

  test('oracle writers are uniformly first-writer-wins (no clobber)', () => {
    has(WF('model-domain.md'), 'First-writer-wins');
    has(WF('frontend-architecture.md'), 'read + reconcile against it rather than re-distilling');
  });

  test('security-strategy is design-aware (screens carry attack-surface signals)', () => {
    has(WF('security-strategy.md'), 'Design-aware (when');
  });

  test('legacy-inventory template points to canonical precedence (no residual triad drift)', () => {
    lacks(TPL('legacy-inventory.md'), 'Locked design wins on UX/scope/structure ·'); // the drifted phrasing
    has(TPL('legacy-inventory.md'), '§ Source precedence');
  });
});

describe('MIXTURE: the gap-map is the shared approved-change allowlist', () => {
  test('legacy-inventory template carries the design-delta bucket + Parity disposition column', () => {
    const T = TPL('legacy-inventory.md');
    has(T, 'Parity disposition');
    has(T, 'In both — design changes this');
    has(T, 'design-delta');
  });

  test('the legacy-inventory workflow emits the parity-disposition allowlist', () => {
    has(WF('legacy-inventory.md'), 'design-delta');
  });
});
