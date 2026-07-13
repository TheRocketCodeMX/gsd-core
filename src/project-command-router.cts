/**
 * Manifest-backed project.* subcommand router (PROJECT.md section queries).
 * Keeps gsd-tools.cjs thin while reusing the shared CJS command-family router.
 *
 * ADR-457 build-at-publish: TypeScript source of truth compiled to a gitignored
 * gsd-core/bin/lib/project-command-router.cjs at pack/test time.
 */

import { PROJECT_SUBCOMMANDS } from './command-aliases.cjs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cjsCommandRouterAdapter = require('./cjs-command-router-adapter.cjs');
const { routeCjsCommandFamily } = cjsCommandRouterAdapter;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectModule {
  cmdProjectMode(cwd: string, raw: boolean): void;
  cmdProjectStrategyPlan(cwd: string, raw: boolean): void;
  cmdProjectStrategySkipped(cwd: string, skill: string | undefined, raw: boolean): void;
  cmdProjectStrategyDone(cwd: string, step: string | undefined, raw: boolean): void;
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
      'strategy-done': () => project.cmdProjectStrategyDone(cwd, args[2], raw),
    },
  });
}

export = {
  routeProjectCommand,
};
