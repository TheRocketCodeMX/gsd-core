/**
 * `check grounding-plan` — FORK (grounding capability): the blocking plan-phase source-grounding
 * gate, as a gate module (re-placed onto upstream's #5139 / ADR-5057 §4 gate-module seam in the
 * align-1.16.0 realignment; previously an inline arm of `check-command-router.cts`).
 *
 * Blocks the plan unless its `## Grounding` block cites — and cross-checks against the source
 * file — every REQUIRED strategy source (`grounding.cts` `resolveRequiredSources`), and every
 * source-direct citation (`SOURCE · fact → path:line`) resolves to the real file. Returns a
 * `GateResult`; the command router formats it. Imports no io module and performs no direct
 * console/stdout/stderr write (ESLint-enforced).
 *
 * Invocation, argv after the verb: `<phase-dir>`.
 *
 * The switch is `workflow.grounding_gate` (absent = enabled), read through `gate-config.cts`'s
 * shared resolver (nested-only, #4978) like every other gate switch.
 */

import path from 'node:path';
import { gateVerdict, gateUnreadable, isGateUsageFailure } from './gate-verdict.cjs';
import type { GateResult } from './gate-verdict.cjs';
import { readDirEvidence, readTextEvidence } from './gate-evidence.cjs';
import { resolveContainedPath } from './gate-phase-context.cjs';
import { readWorkflowConfigValue } from './gate-config.cjs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import groundingLib = require('./grounding.cjs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
import planScanMod = require('./plan-scan.cjs');
const { scanPhasePlans } = planScanMod;

/** `workflow.grounding_gate`: boolean as written, `'true'`/`'false'` coerced, anything else = enabled. */
function isGroundingGateEnabled(projectDir: string): boolean {
  const resolved = readWorkflowConfigValue(projectDir, 'workflow.grounding_gate');
  const value = resolved.found ? resolved.value : undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'false' || lower === 'true') return lower !== 'false';
  }
  return true;
}

/** A source file's text, or '' when it is absent or unreadable (the cross-check then reports it). */
function sourceText(filePath: string): string {
  const read = readTextEvidence(filePath);
  return read.kind === 'found' ? read.value : '';
}

/**
 * The phase dir's case-strict `*-PLAN.md` files (or bare `PLAN.md`) plus the near-misses: `.md`
 * files that look like plans but are not in the owner's plan set. Single-owner plan sourcing
 * (upstream plan-count-drift lint): the candidate set comes from `scanPhasePlans`. Fork grounding
 * semantics (#21 P1-4): a case-variant the owner tolerates (`01-01-plan.md`) is a NEAR-MISS to
 * warn about, so a vacuous pass over zero scanned plans stays visible.
 */
function listPlanFiles(phaseDir: string): { planFiles: string[]; nearMisses: string[] } {
  if (!phaseDir) return { planFiles: [], nearMisses: [] };
  const entries = readDirEvidence(phaseDir);
  if (entries.kind !== 'found') return { planFiles: [], nearMisses: [] };
  const strict = (e: string): boolean => e.endsWith('-PLAN.md') || e === 'PLAN.md';
  const planFiles = scanPhasePlans(phaseDir).allPlanFiles.filter(strict);
  const planSet = new Set<string>(planFiles);
  const names = entries.value;
  return {
    planFiles,
    nearMisses: names.filter((entry) => !planSet.has(entry) && /\.md$/i.test(entry) && /PLAN/i.test(entry)),
  };
}

export function evaluateGroundingPlan(input: { projectDir: string; args: readonly string[] }): GateResult {
  const { projectDir, args } = input;
  let phaseDir = '';
  if (args[0]) {
    const resolved = resolveContainedPath(args[0], projectDir);
    if (isGateUsageFailure(resolved)) return resolved;
    phaseDir = resolved;
  }
  if (!isGroundingGateEnabled(projectDir)) {
    return gateVerdict('skip', false, { passed: true, skipped: true, reason: 'workflow.grounding_gate is false', message: 'Grounding gate disabled by config.' });
  }
  const required = groundingLib.resolveRequiredSources(projectDir).required;
  const { planFiles, nearMisses } = listPlanFiles(phaseDir);
  const plansScanned = planFiles.length;
  const warnings: string[] = [];
  if (plansScanned === 0 && nearMisses.length > 0) {
    warnings.push(`no *-PLAN.md matched in ${phaseDir}, but plan-like file(s) exist: ${nearMisses.join(', ')} — rename to <phase>-<plan>-PLAN.md; the gate scanned nothing`);
  }
  const planTexts: string[] = [];
  for (const f of planFiles) {
    const read = readTextEvidence(path.join(phaseDir, f));
    // #5170: a plan that exists but cannot be read is "could not look", never "cites nothing".
    if (read.kind === 'unreadable') {
      return gateUnreadable(true, { passed: false, reason: 'unreadable evidence', plans_scanned: plansScanned, warnings, problems: [], message: `Grounding gate could not read ${f} (${read.reason}).` });
    }
    if (read.kind === 'found') planTexts.push(read.value);
  }
  const cites = groundingLib.parseGroundingBlock(planTexts.join('\n'));
  const sourceCites = cites.filter((c) => c.artifact === 'SOURCE');
  if (required.length === 0 && sourceCites.length === 0) {
    return gateVerdict('pass', false, { passed: true, total: 0, plans_scanned: plansScanned, warnings, problems: [], message: 'No active strategy sources — nothing to ground.' });
  }
  const problems: string[] = [];
  for (const src of required) {
    const matches = cites.filter((c) => c.artifact === src.artifact);
    if (matches.length === 0) { problems.push(`${src.artifact}: no citation in ## Grounding`); continue; }
    const srcText = sourceText(src.path);
    // EVERY citation line must pass its cross-check (#21 P1-1): one valid citation per artifact
    // must not let a fabricated sibling line ride through unchecked.
    for (const c of matches) {
      const res = groundingLib.crossCheck(src.artifact, c.key, c.value, srcText);
      if (!res.ok) problems.push(`${src.artifact} · ${c.key} → ${c.value}: ${res.reason}`);
    }
  }
  // Source-direct citations (SOURCE · fact → path:line) are verified against the real file.
  for (const c of sourceCites) {
    const res = groundingLib.checkSourceCitation(projectDir, c.key, c.value);
    if (!res.ok) problems.push(`SOURCE: ${res.reason}`);
  }
  const passed = problems.length === 0;
  const payload = { passed, total: required.length, plans_scanned: plansScanned, warnings, problems, message: passed ? 'Grounding verified.' : 'Grounding gate failed:\n- ' + problems.join('\n- ') };
  return passed ? gateVerdict('pass', false, payload) : gateVerdict('block', true, payload);
}
