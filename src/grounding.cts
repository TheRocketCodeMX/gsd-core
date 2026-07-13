import fs from 'node:fs';
import path from 'node:path';

interface RequiredSource { id: string; path: string; artifact: string; }
interface LiteralSource { kind: string; path: string; note: string; }
interface ResolveResult { required: RequiredSource[]; skipped: string[]; pending: string[]; sources: LiteralSource[]; warnings: string[]; }

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

// Parse "## Sources" → the literal-source location registry.
// Line form: - <kind> · <path-or-url> [— <note>]   (kind ∈ design/legacy/vibe/context-app)
function parseSources(projectText: string): LiteralSource[] {
  const out: LiteralSource[] = [];
  const sec = projectText.match(/##\s+Sources([\s\S]*?)(?:\n##\s|\s*$)/);
  if (!sec) return out;
  for (const line of sec[1].split('\n')) {
    const m = line.match(/^-\s+([a-z][a-z-]+)\s+·\s+(.+?)(?:\s+—\s+(.+?))?\s*$/i);
    if (m) out.push({ kind: m[1].toLowerCase(), path: m[2].trim(), note: (m[3] || '').trim() });
  }
  return out;
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
  const warnings: string[] = [];
  if (!fs.existsSync(projectPath)) return { required, skipped: [], pending, sources: [], warnings };
  const projectText = fs.readFileSync(projectPath, 'utf8');
  const { steps, skipped } = parseStrategyPlan(projectText);
  const sources = parseSources(projectText);
  for (const [step, status] of Object.entries(steps)) {
    const map = STEP_ARTIFACTS[step];
    if (!map) continue;
    if (status === 'done') {
      const p = map.rel === 'adr' ? newestAdr(planning) : path.join(planning, map.rel);
      if (p && fs.existsSync(p)) required.push({ id: step, path: p, artifact: map.artifact });
    } else if (status === 'recommended') {
      pending.push(step);
      // Inconsistency surface (issue #21 P0-1c): the artifact exists on disk but the
      // Strategy Plan row was never flipped to `done` — the step ran but skipped its
      // `project strategy-done` wrap-up, so the gate is under-requiring. Warn loudly
      // so orchestrators can flip the row instead of trusting a vacuous pass.
      const p = map.rel === 'adr' ? newestAdr(planning) : path.join(planning, map.rel);
      if (p && fs.existsSync(p)) {
        warnings.push(`unflipped: ${step} — artifact exists (${path.basename(p)}) but Strategy Plan status is still 'recommended'; run \`project strategy-done ${step}\``);
      }
    }
  }
  // DESIGN-INVENTORY / LEGACY-INVENTORY are oracles (not Strategy-Plan steps): require if present.
  const oracles: Array<[string, string]> = [['DESIGN-INVENTORY', 'DESIGN-INVENTORY.md'], ['LEGACY-INVENTORY', 'LEGACY-INVENTORY.md']];
  for (const [artifact, rel] of oracles) {
    const p = path.join(planning, rel);
    if (fs.existsSync(p)) required.push({ id: rel.replace('.md', '').toLowerCase(), path: p, artifact });
  }
  return { required, skipped, pending, sources, warnings };
}

// A source-direct citation ("SOURCE · <fact> → <path>:<line>") is verified by
// reading the real file and confirming the fact appears — you can't cite it
// without having opened the file. Line number is advisory (drifts); the fact must be present.
function checkSourceCitation(cwd: string, fact: string, pathLine: string): { ok: boolean; reason: string } {
  const m = pathLine.match(/^(.*?):(\d+)$/);
  const rel = (m ? m[1] : pathLine).trim();
  const filePath = path.isAbsolute(rel) ? rel : path.join(cwd, rel);
  if (!fs.existsSync(filePath)) return { ok: false, reason: `source file not found: ${rel}` };
  const text = fs.readFileSync(filePath, 'utf8').toLowerCase();
  return text.includes(fact.trim().toLowerCase())
    ? { ok: true, reason: '' }
    : { ok: false, reason: `cited fact "${fact}" not found in ${rel}` };
}

// --- citation parsing + cross-check ---
const CITE_RE = /^-\s+(DOMAIN-MODEL|ADR|TEST-STRATEGY|SECURITY-STRATEGY|FRONTEND-ARCHITECTURE|INFRA-STRATEGY|CICD-STRATEGY|DESIGN-INVENTORY|LEGACY-INVENTORY|PRODUCT-BRIEF|SOURCE)\s+·\s+(.+?)\s+→\s+(.+?)\s*$/;

function parseGroundingBlock(planText: string): Array<{ artifact: string; key: string; value: string }> {
  const out: Array<{ artifact: string; key: string; value: string }> = [];
  const sec = planText.match(/##\s+Grounding([\s\S]*?)(?:\n##\s|\s*$)/);
  if (!sec) return out;
  for (const line of sec[1].split('\n')) {
    const m = line.match(CITE_RE);
    if (m) out.push({ artifact: m[1], key: m[2].trim(), value: m[3].trim() });
  }
  return out;
}

const isPlaceholder = (s: string): boolean => /^\[.*\]$/.test(s.trim());
const norm = (s: string): string => s.trim().toLowerCase();

// Pull a GFM table (whose header row matches headerRe) into rows[casefold(col0)] = cells[].
function parseTable(text: string, headerRe: RegExp): Record<string, string[]> {
  const rows: Record<string, string[]> = {};
  let inTable = false;
  for (const line of text.split('\n')) {
    if (!inTable && headerRe.test(line) && line.includes('|')) { inTable = true; continue; }
    if (inTable) {
      if (/^\s*\|?\s*:?-{3,}/.test(line)) continue; // alignment row
      if (!line.includes('|')) break;
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      if (cells.length) rows[norm(cells[0])] = cells;
    }
  }
  return rows;
}

const ADR_RUNGS = ['transaction script', 'domain model', 'hexagonal', 'cqrs', 'event sourcing', 'buy', 'off-the-shelf'];
function rungSet(cell: string): Set<string> {
  return new Set(cell.split(/[+/]/).map(norm).filter((t) => ADR_RUNGS.includes(t)));
}

function crossCheck(artifact: string, key: string, value: string, sourceText: string): { ok: boolean; reason: string } {
  if (isPlaceholder(key) || isPlaceholder(value)) return { ok: false, reason: 'placeholder cell — source artifact not filled in' };
  if (artifact === 'ADR') {
    const row = parseTable(sourceText, /\|\s*Subdomain\b[^|]*\|/i)[norm(key)];
    if (!row) return { ok: false, reason: `subdomain "${key}" not in ADR` };
    const rungCol = row[2] || '';
    const a = rungSet(rungCol);
    const b = rungSet(value);
    const eq = a.size > 0 && a.size === b.size && [...a].every((t) => b.has(t));
    return eq ? { ok: true, reason: '' } : { ok: false, reason: `rung mismatch: ADR="${rungCol}" cited="${value}"` };
  }
  if (artifact === 'DOMAIN-MODEL') {
    const row = parseTable(sourceText, /\|\s*Subdomain\b[^|]*\|/i)[norm(key)];
    if (!row) return { ok: false, reason: `subdomain "${key}" not in DOMAIN-MODEL` };
    return norm(row[1]) === norm(value) ? { ok: true, reason: '' } : { ok: false, reason: `type mismatch: "${row[1]}" vs "${value}"` };
  }
  if (artifact === 'TEST-STRATEGY') {
    const row = parseTable(sourceText, /\|\s*Subdomain\b[^|]*\|/i)[norm(key)];
    if (!row) return { ok: false, reason: `subdomain "${key}" not in TEST-STRATEGY` };
    const lead = (norm(row[2]).match(/^(small|medium|large)/) || [])[1];
    return lead === norm(value) ? { ok: true, reason: '' } : { ok: false, reason: `level mismatch: "${row[2]}" vs "${value}"` };
  }
  if (artifact === 'DESIGN-INVENTORY') {
    const field = key.split('@')[0].trim();
    const row = parseTable(sourceText, /\|\s*Field\b[^|]*\|/i)[norm(field)];
    if (!row) return { ok: false, reason: `field "${field}" not in DESIGN-INVENTORY` };
    const src = norm((value.split('/')[0] || '').trim());
    return ['design', 'requirement', 'internal'].includes(src) && norm(row[2]) === src
      ? { ok: true, reason: '' } : { ok: false, reason: `source mismatch for "${field}": inventory="${row[2]}" cited="${src}"` };
  }
  if (artifact === 'LEGACY-INVENTORY') {
    // Mechanical row-check (#21 P1-2): the salvage-dispositions table
    // (`| Subsystem | Quality | … | Disposition | … |` in templates/legacy-inventory.md)
    // is the behavior register — the citation's key must name a real row
    // (case-insensitive), so a fabricated subsystem/region cannot pass.
    const row = parseTable(sourceText, /\|\s*Subsystem\b[^|]*\|/i)[norm(key)];
    if (!row) return { ok: false, reason: `subsystem "${key}" not in LEGACY-INVENTORY's salvage-dispositions table` };
    return { ok: true, reason: '' };
  }
  // Remaining artifacts (SECURITY-STRATEGY / FRONTEND-ARCHITECTURE / INFRA-STRATEGY /
  // CICD-STRATEGY / PRODUCT-BRIEF): mention-coverage only — the citation proves the
  // artifact was cited, not that the cited value matches a source row (these artifacts
  // have no single canonical key table to check against). Documented honestly in
  // references/grounding-citations.md § Coverage per artifact.
  return { ok: true, reason: 'mention-coverage (no scripted cross-check yet)' };
}

export = { resolveRequiredSources, parseStrategyPlan, parseSources, parseGroundingBlock, crossCheck, checkSourceCitation };
