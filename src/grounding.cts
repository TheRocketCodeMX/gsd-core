import fs from 'node:fs';
import path from 'node:path';

interface RequiredSource { id: string; path: string; artifact: string; }
interface ResolveResult { required: RequiredSource[]; skipped: string[]; pending: string[]; }

// Strategy step id → (artifact tag, relative .planning path or 'adr' dir → newest *.md).
const STEP_ARTIFACTS: Record<string, { artifact: string; rel: string }> = {
  'model-domain': { artifact: 'DOMAIN-MODEL', rel: 'DOMAIN-MODEL.md' },
  'recommend-architecture': { artifact: 'ADR', rel: 'adr' },
  'testing-strategy': { artifact: 'TEST-STRATEGY', rel: 'TEST-STRATEGY.md' },
  'security-strategy': { artifact: 'SECURITY-STRATEGY', rel: 'SECURITY-STRATEGY.md' },
  'frontend-architecture': { artifact: 'FRONTEND-ARCHITECTURE', rel: 'FRONTEND-ARCHITECTURE.md' },
  'infrastructure-strategy': { artifact: 'INFRA-STRATEGY', rel: 'INFRA-STRATEGY.md' },
  'cicd-strategy': { artifact: 'CICD-STRATEGY', rel: 'CICD-STRATEGY.md' },
  'discover-product': { artifact: 'PRODUCT-BRIEF', rel: 'PRODUCT-BRIEF.md' },
};

// Parse "## Strategy Plan" → { steps: {name: status}, skipped: [names] }.
function parseStrategyPlan(projectText: string): { steps: Record<string, string>; skipped: string[] } {
  const steps: Record<string, string> = {};
  const skipped: string[] = [];
  const secMatch = projectText.match(/##\s+Strategy Plan([\s\S]*?)(?:\n##\s|\s*$)/);
  if (!secMatch) return { steps, skipped };
  for (const line of secMatch[1].split('\n')) {
    const row = line.match(/^\|\s*([a-z][a-z0-9-]+)\s*\|\s*([a-z-]+)\s*\|/i);
    if (row && !/^\[/.test(row[1])) steps[row[1].toLowerCase()] = row[2].toLowerCase();
    const skip = line.match(/^-\s+([a-z][a-z0-9-]+)\s+—\s+skipped\b/i);
    if (skip) skipped.push(skip[1].toLowerCase());
  }
  return { steps, skipped };
}

function newestAdr(planningDir: string): string | null {
  const adrDir = path.join(planningDir, 'adr');
  if (!fs.existsSync(adrDir)) return null;
  const files = fs.readdirSync(adrDir).filter((f) => f.endsWith('.md'));
  if (!files.length) return null;
  files.sort();
  return path.join(adrDir, files[files.length - 1]);
}

function resolveRequiredSources(cwd: string): ResolveResult {
  const planning = path.join(cwd, '.planning');
  const projectPath = path.join(planning, 'PROJECT.md');
  const required: RequiredSource[] = [];
  const pending: string[] = [];
  if (!fs.existsSync(projectPath)) return { required, skipped: [], pending };
  const { steps, skipped } = parseStrategyPlan(fs.readFileSync(projectPath, 'utf8'));
  for (const [step, status] of Object.entries(steps)) {
    const map = STEP_ARTIFACTS[step];
    if (!map) continue;
    if (status === 'done') {
      const p = map.rel === 'adr' ? newestAdr(planning) : path.join(planning, map.rel);
      if (p && fs.existsSync(p)) required.push({ id: step, path: p, artifact: map.artifact });
    } else if (status === 'recommended') {
      pending.push(step);
    }
  }
  // DESIGN-INVENTORY / LEGACY-INVENTORY are oracles (not Strategy-Plan steps): require if present.
  const oracles: Array<[string, string]> = [['DESIGN-INVENTORY', 'DESIGN-INVENTORY.md'], ['LEGACY-INVENTORY', 'LEGACY-INVENTORY.md']];
  for (const [artifact, rel] of oracles) {
    const p = path.join(planning, rel);
    if (fs.existsSync(p)) required.push({ id: rel.replace('.md', '').toLowerCase(), path: p, artifact });
  }
  return { required, skipped, pending };
}

export = { resolveRequiredSources, parseStrategyPlan };
