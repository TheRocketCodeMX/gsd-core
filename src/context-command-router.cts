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

const { ERROR_REASON } = io;
const { makeInvalidArgs } = commandRoutingHub;
const { routeHubCommandFamily } = cjsCommandRouterAdapter;

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

// Zero-pad the phase and glob `.planning/phases/<padded>-*` for `<padded>-CONTEXT.md`.
function resolvePhaseCapsules(cwd: string, phase: string): string[] {
  const padded = String(phase).padStart(2, '0');
  const phasesDir = path.resolve(cwd, '.planning', 'phases');
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(phasesDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith(`${padded}-`))
      .map((e) => e.name);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const name of entries) {
    const capsule = path.join(phasesDir, name, `${padded}-CONTEXT.md`);
    if (fs.existsSync(capsule)) out.push(capsule);
  }
  return out;
}

// `.planning/MASTER-CONTEXT.md` (if present) + every `NN-CONTEXT.md` under `.planning/phases/<dir>/`.
function resolveMilestoneFiles(cwd: string): string[] {
  const out: string[] = [];
  const master = path.resolve(cwd, '.planning', 'MASTER-CONTEXT.md');
  if (fs.existsSync(master)) out.push(master);
  const phasesDir = path.resolve(cwd, '.planning', 'phases');
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(phasesDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return out;
  }
  for (const name of entries) {
    const dir = path.join(phasesDir, name);
    let files: string[] = [];
    try {
      files = fs.readdirSync(dir).filter((f) => /^\d+-CONTEXT\.md$/.test(f));
    } catch {
      continue;
    }
    for (const f of files) out.push(path.join(dir, f));
  }
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
