'use strict';
/**
 * Project command router — manifest-backed project.* subcommand router
 * (PROJECT.md section queries: mode + Strategy Plan lifecycle).
 *
 * Rocket capability pack (issue #25): `project` command family cutover from
 * the hardcoded `case 'project':` arm in gsd-tools.cjs (previously carried as
 * a FORK:strategy patch block) to the ADR-959 capability dispatch path:
 *   default → dispatchCapabilityCommand → require(project-command-router.cjs)
 *   → routeProjectCommand. The family is registered by
 *   capabilities/rocket-strategy/capability.json.
 *
 * The family name stays `project` (67 call sites across fork workflows/agents;
 * locked design decision) — a tripwire test in
 * tests/strategy-config-and-marker-contracts.test.cjs guards against upstream
 * re-introducing a hardcoded case that would shadow this router.
 *
 * Router signature: { args, cwd, raw, error } — identical to the existing
 * host/capability routers (template: src/intel-command-router.cts).
 *
 * Arg indexing (preserved exactly from the original case):
 *   args[0] = 'project'     (family — matched by dispatchCapabilityCommand)
 *   args[1] = subcommand    (mode | strategy-plan | strategy-skipped | strategy-done)
 *   args[2] = skill (strategy-skipped) | step (strategy-done)
 *
 * Subcommand roster comes from PROJECT_SUBCOMMANDS (derived from
 * PROJECT_COMMAND_ALIASES in command-aliases.cts) — kept intact so the alias
 * manifest remains the single source of truth.
 *
 * Test seams: pass `_project` to inject a mock project module. The `_`-prefix
 * follows the repo's established seam convention.
 *
 * Lazy require: project.cjs is required INSIDE the route function so it is
 * only loaded when a project command is actually dispatched.
 *
 * ADR-457 build-at-publish: TypeScript source of truth compiled to a gitignored
 * gsd-core/bin/lib/project-command-router.cjs at pack/test time.
 */

import { PROJECT_SUBCOMMANDS } from './command-aliases.cjs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cjsCommandRouterAdapter = require('./cjs-command-router-adapter.cjs');

const { routeHubCommandFamily } = cjsCommandRouterAdapter;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectModule {
  cmdProjectMode(cwd: string, raw: boolean): void;
  cmdProjectStrategyPlan(cwd: string, raw: boolean): void;
  cmdProjectStrategySkipped(cwd: string, skill: string | undefined, raw: boolean): void;
  cmdProjectStrategyDone(cwd: string, step: string | undefined, raw: boolean): void;
}

interface RouteProjectCommandOptions {
  args: string[];
  cwd: string;
  raw: boolean;
  error: (message: string, reason?: string) => void;
  /** Test seam: inject a mock project module. Defaults to the real module. */
  _project?: ProjectModule;
}

// ─── Router ───────────────────────────────────────────────────────────────────

function routeProjectCommand({ args, cwd, raw, error, _project }: RouteProjectCommandOptions): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
  const project: ProjectModule = _project ?? require('./project.cjs');

  routeHubCommandFamily({
    family: 'project',
    args,
    subcommands: PROJECT_SUBCOMMANDS,
    unsupported: {},
    unknownMessage: (_subcommand: string, available: string[]) => `Unknown project subcommand. Available: ${available.join(', ')}`,
    handlers: {
      'mode': () => project.cmdProjectMode(cwd, raw),
      'strategy-plan': () => project.cmdProjectStrategyPlan(cwd, raw),
      'strategy-skipped': () => project.cmdProjectStrategySkipped(cwd, args[2], raw),
      'strategy-done': () => project.cmdProjectStrategyDone(cwd, args[2], raw),
    },
    error,
    cwd,
    raw,
  });
}

export = {
  routeProjectCommand,
};
