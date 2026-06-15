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
 * check descriptor, RUNS it and requires a genuine NON-VACUOUS pass, builds a typed
 * `enforcementEvidence` array on PASS, and emits the `dispositionForProhibition` verdict as JSON.
 * The green/fail-closed policy itself is untouched (no src/probe-core.cts edit).
 *
 * Accepts BOTH wired-check kinds (ADR-550 D2): a `node --test` negative test OR a lint/AST rule
 * (e.g. the in-tree `local/no-source-grep` rule — the D4 dogfood anchor, run via the project flat
 * config so the plugin loads). A missing, non-attested, or genuinely-non-passing check hard-gates
 * (flagged, non-green) in BOTH interactive and autonomous modes (ADR-550 D4 / D3) — never a silent
 * green.
 *
 * FAIL-FIRST IS CALLER-ATTESTED (honest scope, #1259): the producer requires the caller to ATTEST
 * `failFirst: true` AND requires the runner to observe a real non-vacuous pass — but it does NOT
 * independently prove the check fails-on-violation. Genuine fail-first confirmation needs running
 * the check against a known violation fixture and is a tracked follow-up (recorded in ADR-550's D5d
 * note). What ships here closes the permanent-`gaps_found` dead-end with a genuinely-executed gate;
 * it does not yet replace caller attestation with machine proof of the red-first property.
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
import path from 'node:path';
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
 * runner family; `target` is the negative-test file path (node-test) or the PATH to lint
 * (lint-rule); `rule` is the eslint rule id (lint-rule only — e.g. `local/no-source-grep`) and is
 * REQUIRED for the lint-rule kind (a lint-rule descriptor without it is not a valid wired check);
 * `failFirst` is the caller's ATTESTATION that the check is a genuine `regression-must-fail-first`
 * proof (caller-declared — see the module docstring; not independently confirmed at verify time).
 */
export interface CheckDescriptor {
  kind: CheckKind;
  target: string;
  rule?: string;
  failFirst?: boolean;
}

/**
 * The result a check-runner returns: whether the check genuinely, non-vacuously PASSED. The runner
 * reports only what it can OBSERVE (a real pass) — it does NOT determine fail-first. Whether the
 * check is a `regression-must-fail-first` proof is a CALLER-ATTESTED property of the descriptor
 * (`CheckDescriptor.failFirst`); the producer cannot independently confirm it at verify time without
 * a violation fixture (a tracked follow-up — see the module docstring).
 */
export interface CheckRunResult {
  passed: boolean;
}

/** A single typed enforcement-evidence record (the array `dispositionForProhibition` reads). */
export interface EnforcementEvidence {
  kind: CheckKind;
  target: string;
  rule?: string;
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

/** node --test argv. Forces the TAP reporter so the summary counts are parseable + version-stable. */
export function buildNodeTestArgs(check: CheckDescriptor): string[] {
  return ['--test', '--test-reporter=tap', check.target];
}

/** eslint argv (the args AFTER the eslint CLI path). Runs the project flat config so plugin rules
 * (e.g. `local/*`) load — `--rule` CANNOT load a plugin, so we lint the TARGET path as JSON and
 * filter by rule id. `--no-warn-ignored` makes an eslint-IGNORED target return `[]` (not a length-1
 * "File ignored" result) so an ignored path fails closed via the vacuity guard, not a false green. */
export function buildLintArgs(check: CheckDescriptor): string[] {
  return ['--no-warn-ignored', '--format', 'json', check.target];
}

/**
 * Resolve the project's eslint CLI entry portably (no `npx` — not spawnable via `execFileSync` on
 * Windows). Resolves eslint's package.json from the target project's `node_modules` and derives
 * `bin/eslint.js`, so it is run as `node <cli>` (portable). Returns null if eslint is not installed
 * (→ the lint-rule check fails closed, never throws).
 */
function resolveEslintCli(cwd: string): string | null {
  try {
    const pkg = require.resolve('eslint/package.json', { paths: [cwd] });
    const cli = path.join(path.dirname(pkg), 'bin', 'eslint.js');
    return fs.existsSync(cli) ? cli : null;
  } catch {
    return null;
  }
}

/** Basename of a path, separator-agnostic (handles `\` and `/` so node-test names compare stably
 * across OSes / node versions that report the file-test by differing path forms). */
function baseOf(p: string): string {
  return typeof p === 'string' ? (p.split(/[\\/]/).pop() ?? p) : '';
}

/**
 * Pure parser for the `node --test` TAP summary. A genuine pass is NON-VACUOUS: exit 0 is NOT enough
 * (an empty / all-skipped / deleted-negative-test file exits 0 with `# tests 0`). Mutation-pinned by
 * unit tests so a threshold flip is caught.
 */
export function parseNodeTestSummary(out: string): { tests: number; pass: number; fail: number } {
  const num = (re: RegExp): number => {
    const m = typeof out === 'string' ? out.match(re) : null;
    return m ? Number(m[1]) : 0;
  };
  return {
    tests: num(/^# tests (\d+)/m),
    pass: num(/^# pass (\d+)/m),
    fail: num(/^# fail (\d+)/m),
  };
}

/** The names from TAP `ok N - <name>` / `not ok N - <name>` lines (directives like `# SKIP` stripped). */
export function tapTestNames(out: string): string[] {
  if (typeof out !== 'string') return [];
  const names: string[] = [];
  const re = /^(?:not )?ok \d+ - (.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(out)) !== null) {
    names.push(m[1].replace(/\s+#\s.*$/, '').trim());
  }
  return names;
}

/**
 * A non-vacuous node-test pass: at least one test, at least one pass, zero failures — AND at least
 * one reported test whose name is NOT merely the target file. `node --test <file>` counts a file
 * with ZERO `test()` calls as one passing "test" named after the file, so the counts alone cannot
 * tell an empty/deleted negative test from a real one (the #1259 BL-01 false-green). Requiring a
 * named test distinct from the file closes that hole.
 *
 * KNOWN CONSTRAINT (fail-closed, not a hole): a real test whose `test('...')` name is EXACTLY the
 * target file's basename emits TAP indistinguishable from an empty file and is conservatively
 * rejected (non-green). A wired negative test must carry a descriptive name, not be named after its
 * own file — a benign authoring constraint, and the safe direction if violated.
 */
export function isNonVacuousNodeTestPass(out: string, target: string): boolean {
  const s = parseNodeTestSummary(out);
  if (!(s.tests >= 1 && s.pass >= 1 && s.fail === 0)) return false;
  // Compare BASENAMES: node reports the file-test by varying path forms across OS / node version
  // (absolute, relative, normalized), so an exact-string compare misfires. A real test name (e.g.
  // "guards the must-NOT") has no separators, so its basename never equals the target file's.
  const tgtBase = baseOf(target);
  return tapTestNames(out).some((n) => baseOf(n) !== tgtBase);
}

/** Number of file results in an eslint `--format json` report (0 if unparseable / not an array). */
export function eslintFileResultCount(jsonText: string): number {
  try {
    const parsed: unknown = JSON.parse(jsonText);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

/** True if the eslint `--format json` report has ANY message for `rule`. Unparseable -> true
 * (fail-closed: treat an unreadable report as a violation rather than a silent pass). */
export function eslintJsonHasRule(jsonText: string, rule: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return true;
  }
  if (!Array.isArray(parsed)) return true;
  for (const file of parsed) {
    const messages = file && typeof file === 'object' && Array.isArray((file as { messages?: unknown }).messages)
      ? (file as { messages: Array<{ ruleId?: unknown }> }).messages
      : [];
    for (const msg of messages) {
      if (msg && typeof msg === 'object' && msg.ruleId === rule) return true;
    }
  }
  return false;
}

/**
 * The default REAL check runner (used when no `runCheck` is injected). Reports only an OBSERVED,
 * genuinely-non-vacuous pass; guarded so a missing tool / non-zero exit yields a non-passing result,
 * NEVER an uncaught throw (the no-throw contract). It does NOT determine fail-first (caller-attested).
 *   - node-test: runs `node --test` (TAP) and requires a NON-VACUOUS pass (>=1 test, >=1 pass, 0 fail
 *     AND a reported test named distinctly from the file). A bare exit 0 for an empty/zero-test file
 *     — which `node --test` counts as one passing "test" named after the file — is NOT a pass (the
 *     #1259 BL-01 false-green fix).
 *   - lint-rule: runs the project eslint as `node <eslint-cli> --format json <target>` (flat config
 *     loads `local/*` plugins) and requires the target to actually lint (>=1 file result) AND ZERO
 *     messages for the specific rule id. `--rule` cannot load a plugin rule, so we filter the
 *     structured report by `ruleId` instead (the #1259 SF-01 fix).
 *
 * Both kinds spawn via `process.execPath` (never bare `node`/`npx` — not portably spawnable via
 * `execFileSync` on Windows) with arg arrays (no shell → no injection from a caller-supplied target).
 */
/**
 * Env for spawned checks: strip `NODE_TEST_CONTEXT` and `NODE_OPTIONS` so an AMBIENT test-runner
 * context (e.g. running verify under `node --test`, which sets `NODE_TEST_CONTEXT=child-v8`) cannot
 * turn the child `node --test` into a silent v8-reporter worker that emits no parseable TAP — which
 * would otherwise corrupt the verdict. Deterministic, environment-independent execution.
 */
function childEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_OPTIONS;
  return env;
}

function defaultRunCheck(check: CheckDescriptor, cwd: string): CheckRunResult {
  try {
    if (check.kind === 'node-test') {
      let out = '';
      try {
        out = execFileSync(process.execPath, buildNodeTestArgs(check), {
          cwd,
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
          env: childEnv(),
        });
      } catch (e) {
        // A failing test run exits non-zero (TAP still on stdout). Parse it: a real failure has
        // `# fail >= 1` -> non-vacuous check returns false. Missing node -> no stdout -> false.
        const stdout = e && typeof e === 'object' && 'stdout' in e ? (e as { stdout?: unknown }).stdout : '';
        out = typeof stdout === 'string' ? stdout : '';
      }
      return { passed: isNonVacuousNodeTestPass(out, check.target) };
    }
    if (check.kind === 'lint-rule') {
      const eslintCli = resolveEslintCli(cwd);
      if (!eslintCli) return { passed: false }; // eslint not installed -> fail closed, never throw
      let json = '';
      try {
        json = execFileSync(process.execPath, [eslintCli, ...buildLintArgs(check)], {
          cwd,
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
          env: childEnv(),
        });
      } catch (e) {
        // eslint exits non-zero when ANY error is present; the JSON report is still on stdout.
        const stdout = e && typeof e === 'object' && 'stdout' in e ? (e as { stdout?: unknown }).stdout : '';
        json = typeof stdout === 'string' ? stdout : '';
      }
      const lintedSomething = eslintFileResultCount(json) >= 1;
      return { passed: lintedSomething && !eslintJsonHasRule(json, check.rule as string) };
    }
    // Unknown kind — defensive; the LOCATE guard already rejects it.
    return { passed: false };
  } catch {
    return { passed: false };
  }
}

/**
 * LOCATE -> CONFIRM fail-first -> RUN -> build enforcementEvidence -> dispositionForProhibition.
 *
 * (1) LOCATE: if no well-formed check descriptor is locatable -> fail-closed
 *     (`dispositionForProhibition` with empty evidence) plus `{ located: false, kind: null, evidence: [] }`.
 * (2) ATTEST + RUN: require the caller to attest `failFirst: true` and run it via `runCheck`. A check
 *     the caller does not attest as fail-first, or that does not genuinely (non-vacuously) PASS ->
 *     fail-closed disposition with `located: true` (a real located miss, non-green, flagged) in BOTH
 *     modes. Fail-first is caller-attested, not independently proven (see module docstring).
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

  // (1) LOCATE — no locatable, well-formed wired check -> fail-closed, located: false. The kind must
  // be one of the two known kinds; the target must be a non-empty string; a lint-rule descriptor MUST
  // also carry a non-empty `rule` id (its target is the lint PATH, not the rule). An under-specified
  // descriptor is not a valid wired check, so it is not locatable (does not rely on the runner failing).
  const c = check && typeof check === 'object' ? check : null;
  const validKind = !!c && (c.kind === 'node-test' || c.kind === 'lint-rule');
  const validTarget = !!c && typeof c.target === 'string' && c.target.trim().length > 0;
  const validRule = !!c && (c.kind !== 'lint-rule' || (typeof c.rule === 'string' && c.rule.trim().length > 0));
  if (!c || !validKind || !validTarget || !validRule) {
    const disposition = dispositionForProhibition(prohibition, { enforcementEvidence: [] });
    return { ...disposition, located: false, kind: null, evidence: [], ...(mode ? { mode } : {}) };
  }

  const runCheck = options.runCheck ?? ((toRun: CheckDescriptor) => defaultRunCheck(toRun, options.cwd ?? process.cwd()));

  // (2) ATTEST fail-first (CALLER-DECLARED) + RUN. The caller must attest `failFirst: true` AND the
  // runner must observe a genuine NON-VACUOUS pass. The producer does NOT independently prove
  // fail-first (that needs a violation fixture — tracked follow-up, ADR-550 D5d). A non-attested or
  // non-passing check hard-gates (never green) in BOTH modes.
  const attestedFailFirst = c.failFirst === true;
  // No-throw contract end-to-end: even a (test-injected) runCheck that throws must fail closed,
  // never propagate. The default real runner already never throws.
  let run: CheckRunResult;
  try {
    run = runCheck(c);
  } catch {
    run = { passed: false };
  }
  const passed = attestedFailFirst && run.passed === true;

  if (!passed) {
    // NOT attested fail-first OR did not genuinely pass -> fail-closed, located: true (an actual
    // located miss/fail). Hard-gate applies in BOTH modes; the disposition stays non-green / flagged.
    const disposition = dispositionForProhibition(prohibition, { enforcementEvidence: [] });
    return {
      ...disposition,
      located: true,
      kind: c.kind,
      evidence: [],
      ...(mode ? { mode } : {}),
    };
  }

  // (3) PASS -> build typed enforcementEvidence and let the policy flip a test-tier item green.
  // `failFirst` here is the caller's attestation (recorded for provenance), not a machine proof.
  const evidence: EnforcementEvidence[] = [{
    kind: c.kind,
    target: c.target,
    ...(typeof c.rule === 'string' ? { rule: c.rule } : {}),
    failFirst: true,
    passed: true,
  }];
  const disposition = dispositionForProhibition(prohibition, { enforcementEvidence: evidence });
  return {
    ...disposition,
    located: true,
    kind: c.kind,
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
