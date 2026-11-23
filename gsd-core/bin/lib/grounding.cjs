"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const planningWorkspace = require("./planning-workspace.cjs");
// Strategy step id → (artifact tag, relative .planning path or 'adr' dir → newest *.md).
const STEP_ARTIFACTS = {
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
function parseStrategyPlan(projectText) {
    const steps = {};
    const skipped = [];
    const secMatch = projectText.match(/##\s+Strategy Plan([\s\S]*?)(?:\n##\s|\s*$)/);
    if (!secMatch)
        return { steps, skipped };
    for (const line of secMatch[1].split('\n')) {
        const row = line.match(/^\|\s*([a-z][a-z0-9-]+)\s*\|\s*([a-z-]+)\s*\|/i);
        if (row && !/^\[/.test(row[1]))
            steps[row[1].toLowerCase()] = row[2].toLowerCase();
        const skip = line.match(/^-\s+([a-z][a-z0-9-]+)\s+—\s+skipped\b/i);
        if (skip)
            skipped.push(skip[1].toLowerCase());
    }
    return { steps, skipped };
}
// Parse "## Sources" → the literal-source location registry.
// Line form: - <kind> · <path-or-url> [— <note>]   (kind ∈ design/legacy/vibe/context-app)
function parseSources(projectText) {
    const out = [];
    const sec = projectText.match(/##\s+Sources([\s\S]*?)(?:\n##\s|\s*$)/);
    if (!sec)
        return out;
    for (const line of sec[1].split('\n')) {
        const m = line.match(/^-\s+([a-z][a-z-]+)\s+·\s+(.+?)(?:\s+—\s+(.+?))?\s*$/i);
        if (m)
            out.push({ kind: m[1].toLowerCase(), path: m[2].trim(), note: (m[3] || '').trim() });
    }
    return out;
}
function newestAdr(planningDir) {
    const adrDir = node_path_1.default.join(planningDir, 'adr');
    if (!node_fs_1.default.existsSync(adrDir))
        return null;
    const files = node_fs_1.default.readdirSync(adrDir).filter((f) => f.endsWith('.md'));
    if (!files.length)
        return null;
    files.sort();
    return node_path_1.default.join(adrDir, files[files.length - 1]);
}
function resolveRequiredSources(cwd) {
    // align-1.22.0: the strategy artifacts sit beside PROJECT.md, which upstream #5861 resolves per
    // project (`planningDir(cwd, null)`: `.planning/<name>` under GSD_PROJECT, shared by workstreams).
    const planning = planningWorkspace.planningDir(cwd, null);
    const projectPath = node_path_1.default.join(planning, 'PROJECT.md');
    const required = [];
    const pending = [];
    const warnings = [];
    if (!node_fs_1.default.existsSync(projectPath))
        return { required, skipped: [], pending, sources: [], warnings };
    const projectText = node_fs_1.default.readFileSync(projectPath, 'utf8');
    const { steps, skipped } = parseStrategyPlan(projectText);
    const sources = parseSources(projectText);
    for (const [step, status] of Object.entries(steps)) {
        const map = STEP_ARTIFACTS[step];
        if (!map)
            continue;
        if (status === 'done') {
            const p = map.rel === 'adr' ? newestAdr(planning) : node_path_1.default.join(planning, map.rel);
            if (p && node_fs_1.default.existsSync(p))
                required.push({ id: step, path: p, artifact: map.artifact });
        }
        else if (status === 'recommended') {
            // FORK:context — issue #21 P0-1c: a `recommended` row whose artifact already
            // exists on disk is a real, citable source (the step ran; only the Strategy
            // Plan row's flip to `done` is missing). Under-requiring it let plans skip
            // citing a source that genuinely grounds them. Promote it to `required` with
            // a note prompting the `strategy-done` flip, instead of leaving it a mere
            // warning. `recommended` + no artifact yet stays the pending/warning path.
            const p = map.rel === 'adr' ? newestAdr(planning) : node_path_1.default.join(planning, map.rel);
            if (p && node_fs_1.default.existsSync(p)) {
                required.push({
                    id: step,
                    path: p,
                    artifact: map.artifact,
                    notes: `artifact exists but Strategy Plan row is unflipped — run \`gsd-tools project strategy-done ${step}\``,
                });
                warnings.push(`unflipped: ${step} — artifact exists (${node_path_1.default.basename(p)}) but Strategy Plan status is still 'recommended'; run \`project strategy-done ${step}\``);
            }
            else if (!skipped.includes(step)) {
                // A ledgered skip keeps its `recommended` status; it is exempt, not pending (matrix 1220-B F6).
                pending.push(step);
            }
        }
    }
    // DESIGN-INVENTORY / LEGACY-INVENTORY are oracles (not Strategy-Plan steps): require if present.
    const oracles = [['DESIGN-INVENTORY', 'DESIGN-INVENTORY.md'], ['LEGACY-INVENTORY', 'LEGACY-INVENTORY.md']];
    for (const [artifact, rel] of oracles) {
        const p = node_path_1.default.join(planning, rel);
        if (node_fs_1.default.existsSync(p))
            required.push({ id: rel.replace('.md', '').toLowerCase(), path: p, artifact });
    }
    return { required, skipped, pending, sources, warnings };
}
// A source-direct citation ("SOURCE · <fact> → <path>:<line>") is verified by
// reading the real file and confirming the fact appears — you can't cite it
// without having opened the file. Line number is advisory (drifts); the fact must be present.
function checkSourceCitation(cwd, fact, pathLine) {
    const m = pathLine.match(/^(.*?):(\d+)$/);
    const rel = (m ? m[1] : pathLine).trim();
    const filePath = node_path_1.default.isAbsolute(rel) ? rel : node_path_1.default.join(cwd, rel);
    if (!node_fs_1.default.existsSync(filePath))
        return { ok: false, reason: `source file not found: ${rel}` };
    const text = node_fs_1.default.readFileSync(filePath, 'utf8').toLowerCase();
    return text.includes(fact.trim().toLowerCase())
        ? { ok: true, reason: '' }
        : { ok: false, reason: `cited fact "${fact}" not found in ${rel}` };
}
// --- citation parsing + cross-check ---
const CITE_RE = /^-\s+(DOMAIN-MODEL|ADR|TEST-STRATEGY|SECURITY-STRATEGY|FRONTEND-ARCHITECTURE|INFRA-STRATEGY|CICD-STRATEGY|DESIGN-INVENTORY|LEGACY-INVENTORY|PRODUCT-BRIEF|SOURCE)\s+·\s+(.+?)\s+→\s+(.+?)\s*$/;
function parseGroundingBlock(planText) {
    const out = [];
    const sec = planText.match(/##\s+Grounding([\s\S]*?)(?:\n##\s|\s*$)/);
    if (!sec)
        return out;
    for (const line of sec[1].split('\n')) {
        const m = line.match(CITE_RE);
        if (m)
            out.push({ artifact: m[1], key: m[2].trim(), value: m[3].trim() });
    }
    return out;
}
const isPlaceholder = (s) => /^\[.*\]$/.test(s.trim());
const norm = (s) => s.trim().toLowerCase();
// Pull a GFM table (whose header row matches headerRe) into rows[casefold(col0)] = cells[].
function parseTable(text, headerRe) {
    const rows = {};
    let inTable = false;
    for (const line of text.split('\n')) {
        if (!inTable && headerRe.test(line) && line.includes('|')) {
            inTable = true;
            continue;
        }
        if (inTable) {
            if (/^\s*\|?\s*:?-{3,}/.test(line))
                continue; // alignment row
            if (!line.includes('|'))
                break;
            const cells = line.split('|').slice(1, -1).map((c) => c.trim());
            if (cells.length)
                rows[norm(cells[0])] = cells;
        }
    }
    return rows;
}
// When a citation key misses, look for a row key that differs only by a
// parenthetical qualifier / punctuation (normalized compare) and say so —
// "pricing" vs a row keyed "pricing (core)" is a fixable near-miss, not a
// fabrication, and the reason should teach the exact cell to cite (#21 P2e).
const stripQualifier = (s) => s.replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
function suggestKey(rows, key) {
    const want = stripQualifier(key);
    if (!want)
        return '';
    for (const k of Object.keys(rows)) {
        if (k !== norm(key) && stripQualifier(k) === want) {
            const cell = (rows[k][0] || k).trim();
            return ` — did you mean "${cell}"?`;
        }
    }
    return '';
}
const ADR_RUNGS = ['transaction script', 'domain model', 'hexagonal', 'cqrs', 'event sourcing', 'buy', 'off-the-shelf'];
function rungSet(cell) {
    return new Set(cell.split(/[+/]/).map(norm).filter((t) => ADR_RUNGS.includes(t)));
}
function crossCheck(artifact, key, value, sourceText) {
    if (isPlaceholder(key) || isPlaceholder(value))
        return { ok: false, reason: 'placeholder cell — source artifact not filled in' };
    if (artifact === 'ADR') {
        const rows = parseTable(sourceText, /\|\s*Subdomain\b[^|]*\|/i); // allow-adhoc-markdown: header-locator regex for the fork grounding cross-check parseTable; predates TABLE_SCHEMAS
        const row = rows[norm(key)];
        if (!row)
            return { ok: false, reason: `subdomain "${key}" not in ADR${suggestKey(rows, key)}` };
        const rungCol = row[2] || '';
        const a = rungSet(rungCol);
        const b = rungSet(value);
        const eq = a.size > 0 && a.size === b.size && [...a].every((t) => b.has(t));
        return eq ? { ok: true, reason: '' } : { ok: false, reason: `rung mismatch: ADR="${rungCol}" cited="${value}"` };
    }
    if (artifact === 'DOMAIN-MODEL') {
        const rows = parseTable(sourceText, /\|\s*Subdomain\b[^|]*\|/i); // allow-adhoc-markdown: header-locator regex for the fork grounding cross-check parseTable; predates TABLE_SCHEMAS
        const row = rows[norm(key)];
        if (!row)
            return { ok: false, reason: `subdomain "${key}" not in DOMAIN-MODEL${suggestKey(rows, key)}` };
        return norm(row[1]) === norm(value) ? { ok: true, reason: '' } : { ok: false, reason: `type mismatch: "${row[1]}" vs "${value}"` };
    }
    if (artifact === 'TEST-STRATEGY') {
        const rows = parseTable(sourceText, /\|\s*Subdomain\b[^|]*\|/i); // allow-adhoc-markdown: header-locator regex for the fork grounding cross-check parseTable; predates TABLE_SCHEMAS
        const row = rows[norm(key)];
        if (!row)
            return { ok: false, reason: `subdomain "${key}" not in TEST-STRATEGY${suggestKey(rows, key)}` };
        const lead = (norm(row[2]).match(/^(small|medium|large)/) || [])[1];
        return lead === norm(value) ? { ok: true, reason: '' } : { ok: false, reason: `level mismatch: "${row[2]}" vs "${value}"` };
    }
    if (artifact === 'DESIGN-INVENTORY') {
        const field = key.split('@')[0].trim();
        const rows = parseTable(sourceText, /\|\s*Field\b[^|]*\|/i); // allow-adhoc-markdown: header-locator regex for the fork grounding cross-check parseTable; predates TABLE_SCHEMAS
        const row = rows[norm(field)];
        if (!row)
            return { ok: false, reason: `field "${field}" not in DESIGN-INVENTORY${suggestKey(rows, field)}` };
        const src = norm((value.split('/')[0] || '').trim());
        return ['design', 'requirement', 'internal'].includes(src) && norm(row[2]) === src
            ? { ok: true, reason: '' } : { ok: false, reason: `source mismatch for "${field}": inventory="${row[2]}" cited="${src}"` };
    }
    if (artifact === 'LEGACY-INVENTORY') {
        // Mechanical row-check (#21 P1-2): the salvage-dispositions table
        // (`| Subsystem | Quality | … | Disposition | … |` in templates/legacy-inventory.md)
        // is the behavior register — the citation's key must name a real row
        // (case-insensitive), so a fabricated subsystem/region cannot pass.
        const rows = parseTable(sourceText, /\|\s*Subsystem\b[^|]*\|/i); // allow-adhoc-markdown: header-locator regex for the fork grounding cross-check parseTable; predates TABLE_SCHEMAS
        const row = rows[norm(key)];
        if (!row)
            return { ok: false, reason: `subsystem "${key}" not in LEGACY-INVENTORY's salvage-dispositions table${suggestKey(rows, key)}` };
        return { ok: true, reason: '' };
    }
    // Remaining artifacts (SECURITY-STRATEGY / FRONTEND-ARCHITECTURE / INFRA-STRATEGY /
    // CICD-STRATEGY / PRODUCT-BRIEF): mention-coverage only — the citation proves the
    // artifact was cited, not that the cited value matches a source row (these artifacts
    // have no single canonical key table to check against). Documented honestly in
    // references/grounding-citations.md § Coverage per artifact.
    return { ok: true, reason: 'mention-coverage (no scripted cross-check yet)' };
}
module.exports = { resolveRequiredSources, parseStrategyPlan, parseSources, parseGroundingBlock, crossCheck, checkSourceCitation };
