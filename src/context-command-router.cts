'use strict';
/**
 * Context command router — CLI subcommand dispatcher for `gsd-tools context`.
 *
 * feat/context-lifecycle: `context` command family registered via the
 * ADR-959 capability dispatch path:
 *   default → dispatchCapabilityCommand → require(context-command-router.cjs)
 *   → routeContextCommand. The family is registered by
 *   capabilities/context/capability.json.
 *
 * Backing: Task 2's src/context.cts (compiled context.cjs) — provenance
 * frontmatter parsing and deterministic anchored-claim verification for
 * <N>-CONTEXT.md capsules and MASTER-CONTEXT.md.
 *
 * Router signature: { args, cwd, raw, error } — identical to the existing
 * host/capability routers (template: src/learn-command-router.cts).
 *
 * Arg indexing:
 *   args[0] = 'context'      (family — matched by dispatchCapabilityCommand)
 *   args[1] = subcommand     (verify | provenance)
 *   remaining args carry `--file <path>` | `--phase <N>` | `--milestone` flags.
 *
 * Test seams: pass `_context` to inject a mock context module; pass `_core`
 * to inject a mock core module (captures `output` calls without writing to
 * real stdout). The `_`-prefix follows the repo's established seam convention.
 *
 * Lazy require: context.cjs is required INSIDE the route function so it is
 * only loaded when a context command is actually dispatched (learn-router
 * convention).
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
import fs = require('node:fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
import path = require('node:path');
// eslint-disable-next-line @typescript-eslint/no-require-imports
import io = require('./io.cjs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
import commandRoutingHub = require('./command-routing-hub.cjs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cjsCommandRouterAdapter = require('./cjs-command-router-adapter.cjs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
import planningWorkspace = require('./planning-workspace.cjs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
import phaseLocator = require('./phase-locator.cjs');

const { ERROR_REASON } = io;
const { makeInvalidArgs } = commandRoutingHub;
const { routeHubCommandFamily } = cjsCommandRouterAdapter;
const { planningDir, planningPaths, resolvePhaseIdConvention } = planningWorkspace;
const { findPhaseInternal, listAllPhaseDirs } = phaseLocator;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContextModule {
  verifyContextFile(cwd: string, filePath: string, date: string): unknown;
  parseContextProvenance(text: string): unknown;
}

interface CoreModule {
  output(value: unknown, raw: boolean): void;
}

interface RouteContextCommandOptions {
  args: string[];
  cwd: string;
  raw: boolean;
  error: (message: string, reason?: string) => void;
  /** Test seam: inject a mock context module. Defaults to the real module. */
  _context?: ContextModule;
  /** Test seam: inject a mock core module to capture output calls. */
  _core?: CoreModule;
}

// Default CoreModule implementation — _core seam overrides for test injection.
const _defaultCore: CoreModule = { output: io.output };

// ─── Helpers ──────────────────────────────────────────────────────────────────

// A phase capsule is `<phase-token>-CONTEXT.md` (`01-CONTEXT.md`, `02.1-CONTEXT.md`) inside its
// phase directory — the directory name may be legacy (`01-foundation`) or bracket-migrated
// (`CA.01-01-foundation`), but the capsule keeps its plain numeric token in both.
const CAPSULE_RE = /^\d+(?:\.\d+)*-CONTEXT\.md$/;

function capsulesIn(dir: string): string[] {
  try {
    return fs.readdirSync(dir).filter((f) => CAPSULE_RE.test(f)).sort().map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

// #93: resolve the phase directory through upstream's convention-aware phase locator — the
// seam `find-phase`-style consumers (gate-phase-context, refactor-trigger) call — instead of a
// hand-rolled `.planning/phases/<NN>-*` glob. findPhaseInternal reads the ACTIVE planning root
// (`planningDir(cwd)`: GSD_WORKSTREAM / `--ws`), and resolvePhaseIdConvention supplies the
// workstream->root-federated `phase_id_convention`, so a bracket-migrated phase
// (`CA.01-01-foundation`) and a workstream phase (`workstreams/<ws>/phases/01-…`) resolve by
// number exactly like a legacy one. An ambiguous or unknown phase resolves to nothing.
function resolvePhaseCapsules(cwd: string, phase: string): string[] {
  if (!phase) return [];
  const found = findPhaseInternal(cwd, phase, resolvePhaseIdConvention(cwd));
  if (!found || !found.found || !found.directory) return [];
  return capsulesIn(path.resolve(cwd, found.directory));
}

// MASTER-CONTEXT.md (shared at the planning root, like PROJECT.md — `planningDir(cwd, null)`)
// + every phase capsule under the ACTIVE planning root's phases dir (#93: workstream-aware via
// planningPaths). The physical directory set comes from upstream's un-windowed phase-dir owner.
function resolveMilestoneFiles(cwd: string): string[] {
  const out: string[] = [];
  const master = path.join(planningDir(cwd, null), 'MASTER-CONTEXT.md');
  if (fs.existsSync(master)) out.push(master);
  const phasesDir = planningPaths(cwd).phases;
  const { value: names } = listAllPhaseDirs(phasesDir, { includeSentinels: true });
  for (const name of names) out.push(...capsulesIn(path.join(phasesDir, name)));
  return out;
}

// ─── Implementation ───────────────────────────────────────────────────────────

function routeContextCommand({ args, cwd, raw, error, _context, _core }: RouteContextCommandOptions): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
  const context: ContextModule = _context ?? require('./context.cjs');
  const c: CoreModule = _core ?? _defaultCore;

  routeHubCommandFamily({
    family: 'context',
    args,
    subcommands: ['verify', 'provenance'],
    handlers: {
      verify: () => {
        const today = new Date().toISOString().slice(0, 10);
        const fileFlag = args.indexOf('--file');
        const phaseFlag = args.indexOf('--phase');
        let files: string[] = [];
        if (fileFlag !== -1) files = [args[fileFlag + 1]];
        else if (phaseFlag !== -1) files = resolvePhaseCapsules(cwd, args[phaseFlag + 1]);
        else if (args.includes('--milestone')) files = resolveMilestoneFiles(cwd);
        else return makeInvalidArgs('target', 'context verify requires --file, --phase or --milestone', ERROR_REASON.USAGE);
        if (files.length === 0) return makeInvalidArgs('target', 'no matching CONTEXT file found', ERROR_REASON.USAGE);
        const reports = files.map((f) => context.verifyContextFile(cwd, f, today));
        c.output(reports.length === 1 ? reports[0] : reports, raw);
      },
      provenance: () => {
        const fileFlag = args.indexOf('--file');
        if (fileFlag === -1 || !args[fileFlag + 1]) return makeInvalidArgs('file', 'context provenance requires --file <path>', ERROR_REASON.USAGE);
        c.output(context.parseContextProvenance(fs.readFileSync(path.resolve(cwd, args[fileFlag + 1]), 'utf8')), raw);
      },
    },
    unknownMessage: (_subcommand: string, available: string[]) =>
      `Unknown context subcommand. Available: ${available.join(', ')}`,
    error,
    cwd,
    raw,
  });
}

export = {
  routeContextCommand,
};
