'use strict';
/**
 * Grounding command router — CLI subcommand dispatcher for `gsd-tools grounding`.
 *
 * Rocket capability pack (issue #25): `grounding` command family cutover from
 * the hardcoded `case 'grounding':` arm in gsd-tools.cjs (previously carried as
 * a FORK:grounding patch block) to the ADR-959 capability dispatch path:
 *   default → dispatchCapabilityCommand → require(grounding-command-router.cjs)
 *   → routeGroundingCommand. The family is registered by
 *   capabilities/rocket-grounding/capability.json.
 *
 * Behaviour is preserved byte-for-behaviour from the prior inline case:
 * source-grounding backing — compute the required source set from the project's
 * ## Strategy Plan (done steps + present oracles). The gate
 * (check.grounding-plan, which stays in src/check-command-router.cts) consumes
 * this to enforce the plan's ## Grounding.
 *
 * NOTE (locked design decision): this capability declares NO gates. The
 * plan-phase §13a deterministic bash gate stays in
 * gsd-core/workflows/plan-phase.md and reads `workflow.grounding_gate`
 * verbatim via `config-get`; that key now federates from this capability's
 * config slice (see capabilities/rocket-grounding/capability.json).
 *
 * Router signature: { args, cwd, raw, error } — identical to the existing
 * host/capability routers (template: src/intel-command-router.cts).
 *
 * Arg indexing (preserved exactly from the original case):
 *   args[0] = 'grounding'   (family — matched by dispatchCapabilityCommand)
 *   args[1] = subcommand    (required)
 *
 * Test seams: pass `_grounding` to inject a mock grounding module; pass `_core`
 * to inject a mock core module (captures `output` calls without writing to real
 * stdout). The `_`-prefix follows the repo's established seam convention.
 *
 * Lazy require: grounding.cjs is required INSIDE the route function so it is
 * only loaded when a grounding command is actually dispatched (preserves
 * equivalence with the old inline case arm which required it at the top of the
 * case block).
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
import io = require('./io.cjs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cjsCommandRouterAdapter = require('./cjs-command-router-adapter.cjs');

const { routeHubCommandFamily } = cjsCommandRouterAdapter;

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroundingModule {
  resolveRequiredSources(cwd: string): unknown;
}

interface CoreModule {
  output(value: unknown, raw: boolean): void;
}

interface RouteGroundingCommandOptions {
  args: string[];
  cwd: string;
  raw: boolean;
  error: (message: string, reason?: string) => void;
  /** Test seam: inject a mock grounding module. Defaults to the real module. */
  _grounding?: GroundingModule;
  /** Test seam: inject a mock core module to capture output calls. */
  _core?: CoreModule;
}

// Default CoreModule implementation — _core seam overrides for test injection.
const _defaultCore: CoreModule = { output: io.output };

// ─── Implementation ───────────────────────────────────────────────────────────

function routeGroundingCommand({ args, cwd, raw, error, _grounding, _core }: RouteGroundingCommandOptions): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
  const grounding: GroundingModule = _grounding ?? require('./grounding.cjs');
  const c: CoreModule = _core ?? _defaultCore;

  routeHubCommandFamily({
    family: 'grounding',
    args,
    subcommands: ['required'],
    handlers: {
      required: () => {
        c.output(grounding.resolveRequiredSources(cwd), raw);
      },
    },
    unknownMessage: (_subcommand: string, available: string[]) =>
      `Unknown grounding subcommand. Available: ${available.join(', ')}`,
    error,
    cwd,
    raw,
  });
}

export = {
  routeGroundingCommand,
};
