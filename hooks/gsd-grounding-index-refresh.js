#!/usr/bin/env node
// gsd-hook-version: {{GSD_VERSION}}
// gsd-grounding-index-refresh.js — FileChanged hook: keep the grounding "Sources
// of Truth" index fresh the instant a strategy/source doc lands mid-session.
//
// When a strategy artifact (.planning/DOMAIN-MODEL.md, adr/*.md, *-STRATEGY.md,
// DESIGN/LEGACY-INVENTORY.md, PROJECT.md, …) is written, this hook:
//   1. injects the CURRENT active-source set as additionalContext — so THIS
//      session immediately knows the updated sources (rewriting CLAUDE.md alone
//      would not reload into the live context; the injection is what makes it
//      instant, same pattern as gsd-config-reload.js), and
//   2. best-effort refreshes the persisted ambient index (`generate-claude-md
//      --auto`, detached) so future sessions / other CLIs pick it up. `--auto`
//      preserves any hand-edited managed sections.
//
// Input (Claude Code): { cwd, hook_event_name: "FileChanged", file_path, event }
// Output: { hookSpecificOutput: { hookEventName: "FileChanged", additionalContext } } or exit 0.
// Always-on; a no-op when the changed file is not a .planning strategy doc.

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const STRATEGY_BASENAMES = new Set([
  'PROJECT.md', 'DOMAIN-MODEL.md', 'TEST-STRATEGY.md', 'SECURITY-STRATEGY.md',
  'FRONTEND-ARCHITECTURE.md', 'INFRA-STRATEGY.md', 'CICD-STRATEGY.md',
  'DESIGN-INVENTORY.md', 'LEGACY-INVENTORY.md', 'PRODUCT-BRIEF.md',
]);

function isStrategyDoc(filePath) {
  if (STRATEGY_BASENAMES.has(path.basename(filePath))) return true;
  return /[\\/]adr[\\/][^\\/]+\.md$/.test(filePath); // .planning/adr/*.md
}

let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 8000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);
    if (data.event === 'unlink') process.exit(0);
    const filePath = data.file_path || '';
    const cwd = data.cwd || process.cwd();

    // Only fire for a strategy/source doc under THIS project's .planning/.
    const planning = path.resolve(cwd, '.planning');
    if (!path.resolve(filePath).startsWith(planning + path.sep)) process.exit(0);
    if (!isStrategyDoc(filePath)) process.exit(0);

    // Compute the current active source set (in-process; the resolver is a sibling lib).
    let summary;
    try {
      const g = require(path.join(__dirname, '..', 'gsd-core', 'bin', 'lib', 'grounding.cjs'));
      const r = g.resolveRequiredSources(cwd);
      const items = [
        ...r.required.map((s) => `${s.artifact} (${path.relative(cwd, s.path)})`),
        ...r.sources.map((s) => `${s.kind} source: ${s.path}`),
      ];
      summary = items.length
        ? 'GSD sources of truth updated — read and cite these in the plan\'s ## Grounding before planning/editing (they override your memory):\n- ' + items.join('\n- ')
        : 'GSD strategy updated — no active sources yet; build to the engineering-standards floor.';
    } catch {
      process.exit(0); // grounding lib not resolvable → no-op
    }

    // Best-effort: refresh the persisted ambient index for future sessions / other CLIs.
    // Target the project via --cwd (a resolution override, NOT process.chdir) rather than
    // the spawn cwd option — a live child whose OS cwd is the project would lock that
    // directory on Windows. GSD_GROUNDING_NO_REFRESH_SPAWN=1 opts out (used by tests to
    // avoid racing the detached write against directory teardown).
    try {
      const tools = path.join(__dirname, '..', 'gsd-core', 'bin', 'gsd-tools.cjs');
      if (process.env.GSD_GROUNDING_NO_REFRESH_SPAWN !== '1' && fs.existsSync(tools)) {
        spawn(process.execPath, [tools, 'query', 'generate-claude-md', '--auto', '--cwd', cwd], {
          detached: true, stdio: 'ignore', windowsHide: true,
        }).unref();
      }
    } catch { /* best effort — the additionalContext injection is the primary value */ }

    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'FileChanged', additionalContext: summary },
    }));
    process.exit(0);
  } catch {
    process.exit(0);
  }
});
