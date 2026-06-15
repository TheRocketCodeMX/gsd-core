/**
 * prohibition-enforcement — the deterministic PRODUCER for test-tier prohibition verification
 * (#1259, ADR-550 Decision 5d "heavy half"; the D1 seam — a NEW deterministic gsd-tools
 * sub-command, NOT free-form workflow prose).
 *
 * Today `dispositionForProhibition()` (src/probe-core.cts) already carries the POLICY seam: with
 * non-empty `enforcementEvidence` AND `tier === 'test'` it returns `{ status: 'green' }` (the
 * branch at probe-core 420-427); with empty evidence it fails closed to flagged-unverified. But
 * NOTHING in the live pipeline ever produced `enforcementEvidence`, so the green branch was
 * unreachable. This module is the missing producer: it LOCATES the wired mechanical check from a
 * check descriptor, CONFIRMS it is fail-first (regression-must-fail-first), RUNS it, builds a typed
 * `enforcementEvidence` array on PASS, and emits the `dispositionForProhibition` verdict as JSON.
 * The green/fail-closed policy itself is untouched (no src/probe-core.cts edit).
 *
 * Accepts BOTH wired-check kinds (ADR-550 D2): a `node --test` negative test OR an existing
 * lint/AST rule (e.g. the in-tree `no-source-grep` rule — the D4 dogfood anchor). A missing OR
 * failing OR non-fail-first check hard-gates (flagged, non-green) in BOTH interactive and
 * autonomous modes (ADR-550 D4 / D3) — never a silent green.
 *
 * Authored as strict TypeScript (`src/prohibition-enforcement.cts`) and compiled by
 * `tsc -p tsconfig.build.json` (`npm run build:lib`) to the gitignored runtime artifact
 * `gsd-core/bin/lib/prohibition-enforcement.cjs`. Do NOT hand-write the `.cjs`; it is emitted.
 *
 * The function is PURE/deterministic (same input -> same output, no LLM, mutation-survivable): the
 * actual check execution is delegated to an injectable `runCheck` (defaults to a real runner) so
 * the contract is unit-testable without spawning a process — mirroring the injectable I/O pattern
 * in `runProbeCli` / `ProbeCliOptions`.
 */

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import core = require('./core.cjs');
const { output, error, ERROR_REASON } = core;
import { dispositionForProhibition } from './probe-core.cjs';
import type { ProhibitionDisposition } from './probe-core.cjs';

/** The two accepted wired-check kinds (ADR-550 D2). */
export type CheckKind = 'node-test' | 'lint-rule';

/**
 * A descriptor of the wired mechanical check that asserts the must-NOT. `kind` selects the
 * runner family; `target` is the negative-test file path (node-test) or the rule id (lint-rule);
 * `failFirst` records whether the check is a genuine `regression-must-fail-first` proof.
 */
export interface CheckDescriptor {
  kind: CheckKind;
  target: string;
  failFirst?: boolean;
}

/** The result a check-runner returns: whether the check is fail-first and whether it passed. */
export interface CheckRunResult {
  failFirst: boolean;
  passed: boolean;
}

/** A single typed enforcement-evidence record (the array `dispositionForProhibition` reads). */
export interface EnforcementEvidence {
  kind: CheckKind;
  target: string;
  failFirst: boolean;
  passed: boolean;
}

/** Injectable options for `runProhibitionEnforcement` (defaults wire to the real runner). */
export interface EnforcementOptions {
  /** Runs the located check; injected in tests so no real subprocess is spawned. */
  runCheck?: (check: CheckDescriptor) => CheckRunResult;
  /** Verify mode — recorded for transparency; the hard-gate applies in BOTH modes (ADR-550 D4). */
  mode?: string;
  /** Project root for the default real runner (defaults to process.cwd()). */
  cwd?: string;
}

/** The producer's verdict: the disposition PLUS the located/kind/evidence provenance. */
export interface EnforcementResult extends ProhibitionDisposition {
  located: boolean;
  kind: CheckKind | null;
  evidence: EnforcementEvidence[];
  mode?: string;
}

/**
 * The default REAL check runner (used when no `runCheck` is injected). Deterministic per
 * environment and guarded so a missing tool yields a non-passing result, NEVER an uncaught throw
 * (the no-throw contract). A real run is fail-first by construction here — the descriptor's
 * `failFirst` marker is the authoritative regression-must-fail-first signal the producer confirms.
 *   - node-test: runs `node --test <target>`; exit 0 = passed.
 *   - lint-rule: runs `eslint --rule '<rule>: error' <target?>` (or the repo's lint), exit 0 = passed.
 */
function defaultRunCheck(check: CheckDescriptor, cwd: string): CheckRunResult {
  const failFirst = check.failFirst === true;
  try {
    if (check.kind === 'node-test') {
      execFileSync('node', ['--test', check.target], {
        cwd,
        encoding: 'utf-8',
        stdio: 'ignore',
        windowsHide: true,
      });
      return { failFirst, passed: true };
    }
    // lint-rule: run the rule via eslint. A clean exit (0) means no violation -> the must-NOT holds.
    execFileSync('npx', ['eslint', '--rule', `${check.target}: error`, check.target], {
      cwd,
      encoding: 'utf-8',
      stdio: 'ignore',
      windowsHide: true,
    });
    return { failFirst, passed: true };
  } catch {
    // Non-zero exit (violation surfaced) OR missing tool -> not passing. Never throw.
    return { failFirst, passed: false };
  }
}

/**
 * LOCATE -> CONFIRM fail-first -> RUN -> build enforcementEvidence -> dispositionForProhibition.
 *
 * (1) LOCATE: if no check descriptor is locatable -> fail-closed (`dispositionForProhibition` with
 *     empty evidence) plus `{ located: false, kind: null, evidence: [] }`.
 * (2) CONFIRM + RUN: confirm the descriptor is fail-first and run it via `runCheck`. A check that
 *     is not fail-first, that the runner reports not fail-first, or that FAILS -> fail-closed
 *     disposition with `located: true` (a real located miss, non-green, flagged) in BOTH modes.
 * (3) PASS: build a typed `enforcementEvidence` array and call `dispositionForProhibition` — the
 *     non-empty array flips a test-tier item to green (the previously-unreachable branch).
 *
 * Pure/deterministic: same (prohibition, check, runCheck) -> same result.
 */
export function runProhibitionEnforcement(
  prohibition: unknown,
  check: CheckDescriptor | null | undefined,
  options: EnforcementOptions = {},
): EnforcementResult {
  const mode = options.mode;

  // (1) LOCATE — no locatable wired check -> fail-closed, located: false.
  if (!check || typeof check !== 'object' || typeof check.kind !== 'string' || typeof check.target !== 'string') {
    const disposition = dispositionForProhibition(prohibition, { enforcementEvidence: [] });
    return { ...disposition, located: false, kind: null, evidence: [], ...(mode ? { mode } : {}) };
  }

  const runCheck = options.runCheck ?? ((c: CheckDescriptor) => defaultRunCheck(c, options.cwd ?? process.cwd()));

  // (2) CONFIRM fail-first + RUN. Descriptor must declare fail-first AND the runner must agree.
  const descriptorFailFirst = check.failFirst === true;
  const run = runCheck(check);
  const failFirstConfirmed = descriptorFailFirst && run.failFirst === true;
  const passed = failFirstConfirmed && run.passed === true;

  if (!passed) {
    // FAIL / not-fail-first -> fail-closed, located: true (an actual located miss/fail). Hard-gate
    // applies in BOTH modes; the disposition stays non-green / flagged.
    const disposition = dispositionForProhibition(prohibition, { enforcementEvidence: [] });
    return {
      ...disposition,
      located: true,
      kind: check.kind,
      evidence: [],
      ...(mode ? { mode } : {}),
    };
  }

  // (3) PASS -> build typed enforcementEvidence and let the policy flip a test-tier item green.
  const evidence: EnforcementEvidence[] = [{
    kind: check.kind,
    target: check.target,
    failFirst: true,
    passed: true,
  }];
  const disposition = dispositionForProhibition(prohibition, { enforcementEvidence: evidence });
  return {
    ...disposition,
    located: true,
    kind: check.kind,
    evidence,
    ...(mode ? { mode } : {}),
  };
}

/**
 * Parse a `{ prohibition, check, mode }` request from a JSON file path or inline `--json` string.
 * Returns null on any parse failure (the caller surfaces a structured error, never a throw).
 */
function parseRequest(args: string[]): { prohibition: unknown; check: CheckDescriptor | null; mode?: string } | null {
  // args[0] = 'check', args[1] = 'prohibition-enforcement', args[2] = <json-file-path | --json>
  const jsonFlagIdx = args.indexOf('--json');
  let payload = '';
  if (jsonFlagIdx !== -1 && typeof args[jsonFlagIdx + 1] === 'string') {
    payload = args[jsonFlagIdx + 1];
  } else if (typeof args[2] === 'string' && args[2]) {
    try {
      payload = fs.readFileSync(args[2], 'utf-8');
    } catch {
      return null;
    }
  } else {
    return null;
  }
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    const checkRaw = parsed['check'];
    const check: CheckDescriptor | null = (checkRaw && typeof checkRaw === 'object')
      ? (checkRaw as CheckDescriptor)
      : null;
    const modeRaw = parsed['mode'];
    const mode = typeof modeRaw === 'string' ? modeRaw : undefined;
    return { prohibition: parsed['prohibition'] ?? null, check, ...(mode ? { mode } : {}) };
  } catch {
    return null;
  }
}

/**
 * CLI surface: `gsd_run check prohibition-enforcement <request.json>` (or `--json '<inline>'`).
 * Parses the request, runs the producer, and emits the result as JSON. Honors the no-throw
 * contract: malformed input -> structured `error(...)`, never an uncaught throw.
 */
export function routeProhibitionEnforcement(args: string[], raw: boolean): void {
  const req = parseRequest(args);
  if (!req) {
    error(
      'prohibition-enforcement requires a JSON request: check prohibition-enforcement <request.json> | --json \'{"prohibition":{...},"check":{...}}\'',
      ERROR_REASON.SDK_MISSING_ARG,
    );
    return;
  }
  const result = runProhibitionEnforcement(req.prohibition, req.check, req.mode ? { mode: req.mode } : {});
  output(result, raw, undefined);
}

export {};
