/**
 * Manifest-backed project.* subcommand router (PROJECT.md section queries).
 * Keeps gsd-tools.cjs thin while reusing the shared CJS command-family router.
 *
 * ADR-457 build-at-publish: TypeScript source of truth compiled to a gitignored
 * gsd-core/bin/lib/project-command-router.cjs at pack/test time.
 */

// FORK: Phase-2 temporary (v2.0.0 realignment, Epic #13) — PROJECT_SUBCOMMANDS
// is exported by the FORK:strategy marked patch on command-aliases.cts, which is
// re-applied in Phase 3. Until then it is defined locally; Phase 3 restores:
//   import { PROJECT_SUBCOMMANDS } from './command-aliases.cjs';
// and deletes this local copy (must stay in sync with PROJECT_COMMAND_ALIASES).
const PROJECT_SUBCOMMANDS: string[] = ['mode', 'strategy-plan', 'strategy-skipped'];
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cjsCommandRouterAdapter = require('./cjs-command-router-adapter.cjs');
const { routeCjsCommandFamily } = cjsCommandRouterAdapter;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectModule {
  cmdProjectMode(cwd: string, raw: boolean): void;
  cmdProjectStrategyPlan(cwd: string, raw: boolean): void;
  cmdProjectStrategySkipped(cwd: string, skill: string | undefined, raw: boolean): void;
}

interface RouteProjectCommandOptions {
  project: ProjectModule;
  args: string[];
  cwd: string;
  raw: boolean;
  error: (message: string) => void;
}

// ─── Router ───────────────────────────────────────────────────────────────────

function routeProjectCommand({ project, args, cwd, raw, error }: RouteProjectCommandOptions): void {
  routeCjsCommandFamily({
    args,
    subcommands: PROJECT_SUBCOMMANDS,
    unsupported: {},
    error,
    unknownMessage: (_subcommand: string, available: string[]) => `Unknown project subcommand. Available: ${available.join(', ')}`,
    handlers: {
      'mode': () => project.cmdProjectMode(cwd, raw),
      'strategy-plan': () => project.cmdProjectStrategyPlan(cwd, raw),
      'strategy-skipped': () => project.cmdProjectStrategySkipped(cwd, args[2], raw),
    },
  });
}

export = {
  routeProjectCommand,
};
