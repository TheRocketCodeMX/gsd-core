'use strict';
/**
 * Learn command router — CLI subcommand dispatcher for `gsd-tools learn`.
 *
 * Rocket capability pack (issue #25): `learn` command family cutover from the
 * hardcoded `case 'learn':` arm in gsd-tools.cjs (previously carried as a
 * FORK:learn patch block) to the ADR-959 capability dispatch path:
 *   default → dispatchCapabilityCommand → require(learn-command-router.cjs) →
 *   routeLearnCommand. The family is registered by
 *   capabilities/rocket-learn/capability.json.
 *
 * Behaviour is preserved byte-for-behaviour from the prior inline case:
 * /gsd:learn backing — read the concept catalog (index) and the user-global
 * learning-progress state. Teaching itself is inline in the agent; this only
 * owns the catalog graph + the persisted progress (state-safe writes).
 *
 * Router signature: { args, cwd, raw, error } — identical to the existing
 * host/capability routers (template: src/intel-command-router.cts).
 *
 * Arg indexing (preserved exactly from the original case):
 *   args[0] = 'learn'        (family — matched by dispatchCapabilityCommand)
 *   args[1] = subcommand     (catalog | node | progress-read | progress-update | next)
 *   args[2] = nodeId (node)  | first progress-update flag
 *
 * Test seams: pass `_learn` to inject a mock learn module; pass `_core` to
 * inject a mock core module (captures `output` calls without writing to real
 * stdout). The `_`-prefix follows the repo's established seam convention.
 *
 * Lazy require: learn.cjs is required INSIDE the route function so it is only
 * loaded when a learn command is actually dispatched (preserves equivalence
 * with the old inline case arm which required it at the top of the case block).
 */

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

interface LearnModule {
  cmdCatalog(): unknown;
  cmdNode(nodeId: string): unknown;
  cmdProgressRead(): unknown;
  cmdProgressUpdate(flagArgs: string[]): unknown;
  cmdNext(): unknown;
}

interface CoreModule {
  output(value: unknown, raw: boolean): void;
}

interface RouteLearnCommandOptions {
  args: string[];
  cwd: string;
  raw: boolean;
  error: (message: string, reason?: string) => void;
  /** Test seam: inject a mock learn module. Defaults to the real module. */
  _learn?: LearnModule;
  /** Test seam: inject a mock core module to capture output calls. */
  _core?: CoreModule;
}

// Default CoreModule implementation — _core seam overrides for test injection.
const _defaultCore: CoreModule = { output: io.output };

// ─── Implementation ───────────────────────────────────────────────────────────

function routeLearnCommand({ args, cwd, raw, error, _learn, _core }: RouteLearnCommandOptions): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
  const learn: LearnModule = _learn ?? require('./learn.cjs');
  const c: CoreModule = _core ?? _defaultCore;

  routeHubCommandFamily({
    family: 'learn',
    args,
    // Order preserved from the original case's error message so the
    // unknown-subcommand text stays byte-identical.
    subcommands: ['catalog', 'node', 'progress-read', 'progress-update', 'next'],
    handlers: {
      catalog: () => {
        c.output(learn.cmdCatalog(), raw);
      },
      node: () => {
        const nodeId = args[2];
        if (!nodeId) {
          return makeInvalidArgs('node-id', 'learn node requires a node id', ERROR_REASON.USAGE);
        }
        c.output(learn.cmdNode(nodeId), raw);
      },
      'progress-read': () => {
        c.output(learn.cmdProgressRead(), raw);
      },
      'progress-update': () => {
        c.output(learn.cmdProgressUpdate(args.slice(2)), raw);
      },
      next: () => {
        c.output(learn.cmdNext(), raw);
      },
    },
    unknownMessage: (_subcommand: string, available: string[]) =>
      `Unknown learn subcommand. Available: ${available.join(', ')}`,
    error,
    cwd,
    raw,
  });
}

export = {
  routeLearnCommand,
};
