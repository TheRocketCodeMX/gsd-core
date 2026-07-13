# Source Grounding — Slice 1 (Enforced Core Gate) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the build loop mechanically require that each plan grounds in the project's active strategy sources — a blocking gate that cross-checks a `## Grounding` block in every PLAN.md against the real artifacts, so a plan can't proceed on memory/abstractions.

**Architecture:** Ground once at plan-time: the planner writes a `## Grounding` block citing the project-specific decision from each **`done`** strategy source (per the `## Strategy Plan`); a `gsd-tools` resolver computes the required set (reusing the `project strategy-plan`/`strategy-skipped` readers); an extension of the existing `decision-coverage-plan` gate parses the block and cross-checks each citation against the source file, blocking (`exit 1`) on a missing or mismatched required source. Config-gated by `workflow.grounding_gate`.

**Tech Stack:** Node CommonJS (`src/*.cts` → `gsd-core/bin/lib/*.cjs` via `tsc -p tsconfig.build.json`); `node:test` + `tests/helpers.cjs`; the `check-command-router.cjs` gate pattern; the `project.cjs` Strategy-Plan readers.

## Global Constraints

- Compiled `.cjs` from `src/*.cts` are **gitignored** (ADR-457) — add new lib files to `.gitignore` + `eslint.config.mjs` ignores; build with `npm run build:lib`; never hand-edit the `.cjs`.
- **Byte ceilings (strict):** `discuss-phase.md` < 30000 (currently ~29995), `plan-phase.md` ≤ 90000 (currently ~89721, XL high-water mark). Any prose added to these MUST be offset by lazy-extracting equal-or-greater prose to a `gsd-core/references/` file first. `phase-prompt.md` (PLAN template) has no size gate.
- **Config gate convention:** absent key = enabled; only `== "false"` disables (mirror `workflow.context_coverage_gate`).
- **Tests:** `node scripts/run-tests.cjs --files "<file>"`; full suite `npm run test:unit` must exit 0 (check `$?`, not the summary).
- Citation separators are `·` (U+00B7) and `→` (U+2192) — never `:` or `-` (collide with subdomain colons / rung names).

---

## File Structure

- **Create** `src/grounding.cts` → `gsd-core/bin/lib/grounding.cjs` — the resolver (`resolveRequiredSources`) + the citation parser + per-artifact cross-checkers.
- **Create** `gsd-core/references/grounding-citations.md` — the citation format + per-artifact high-entropy cell (the doctrine the planner follows; keeps planner byte-cost terse).
- **Modify** `gsd-core/bin/gsd-tools.cjs` — add `case 'grounding':` dispatch.
- **Modify** `gsd-core/bin/lib/check-command-router.cjs` — add `grounding` to `DESIGNATED_HEADINGS_RE`; add `cmdGroundingPlan` + `gateEnabled`-style toggle.
- **Modify** `gsd-core/templates/phase-prompt.md` — add the `## Grounding` section to the PLAN template.
- **Modify** `agents/gsd-planner.md` — terse instruction to fill `## Grounding` (points to the reference).
- **Modify** `gsd-core/workflows/plan-phase.md` — invoke `check.grounding-plan` after the plan is written (config-gated); + the byte-extraction.
- **Modify** `gsd-core/bin/shared/config-schema.manifest.json` + `config-defaults.manifest.json` — register `workflow.grounding_gate`.
- **Create** `tests/feat-grounding-resolver.test.cjs`, `tests/feat-grounding-gate.test.cjs`, `tests/grounding-fixture-ablation.test.cjs`.
- **Modify** `.gitignore`, `eslint.config.mjs` — ignore `grounding.cjs`.

---

## Task 1: The resolver — compute the required source set from the Strategy Plan

**Files:**
- Create: `src/grounding.cts`
- Test: `tests/feat-grounding-resolver.test.cjs`

**Interfaces:**
- Produces: `resolveRequiredSources(cwd: string): { required: Array<{id, path, artifact}>, skipped: string[], pending: string[] }` where `artifact` ∈ `'ADR'|'DOMAIN-MODEL'|'TEST-STRATEGY'|'SECURITY-STRATEGY'|'FRONTEND-ARCHITECTURE'|'INFRA-STRATEGY'|'CICD-STRATEGY'|'DESIGN-INVENTORY'|'LEGACY-INVENTORY'|'PRODUCT-BRIEF'`.

- [ ] **Step 1: Write the failing test**

```javascript
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { cleanup } = require('./helpers.cjs');
const ROOT = path.resolve(__dirname, '..');
const grounding = require(path.join(ROOT, 'gsd-core', 'bin', 'lib', 'grounding.cjs'));

function mkProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-grounding-'));
  fs.mkdirSync(path.join(dir, '.planning', 'adr'), { recursive: true });
  for (const [rel, body] of Object.entries(files)) {
    const p = path.join(dir, '.planning', rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
  }
  return dir;
}

describe('grounding resolver', () => {
  test('required set = done strategy steps with files on disk; skipped excluded', () => {
    const dir = mkProject({
      'PROJECT.md': `## Strategy Plan\n\n| Step | Status |\n|---|---|\n| model-domain | done |\n| recommend-architecture | done |\n| testing-strategy | done |\n| security-strategy | recommended |\n\n### Skip-ledger\n- infrastructure-strategy — skipped (local-only, 2026-06-26)\n`,
      'DOMAIN-MODEL.md': '## Subdomains\n| Subdomain | Type |\n|---|---|\n| pricing | Core |\n',
      'adr/0001-architecture.md': '### Axis A\n| Subdomain | Type | Rung | Why |\n|---|---|---|---|\n| pricing | Core | Domain Model | rich |\n',
      'TEST-STRATEGY.md': '## Level emphasis per subdomain\n| Subdomain | Architecture rung | Primary level (small/medium/large) | Why |\n|---|---|---|---|\n| pricing | Domain Model | small | logic |\n',
    });
    const r = grounding.resolveRequiredSources(dir);
    const ids = r.required.map((x) => x.artifact).sort();
    assert.deepEqual(ids, ['ADR', 'DOMAIN-MODEL', 'TEST-STRATEGY']);
    assert.ok(r.skipped.includes('infrastructure-strategy'), 'skipped step excluded from required');
    assert.ok(r.pending.includes('security-strategy'), 'recommended-not-done is pending, not required');
    cleanup(dir);
  });

  test('never-run project (no Strategy Plan) → empty required set', () => {
    const dir = mkProject({ 'PROJECT.md': '# Project\n\nno strategy plan here\n' });
    const r = grounding.resolveRequiredSources(dir);
    assert.equal(r.required.length, 0, 'nothing required when nothing was run');
    cleanup(dir);
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `node scripts/run-tests.cjs --files "tests/feat-grounding-resolver.test.cjs"`
Expected: FAIL — `Cannot find module '.../grounding.cjs'`.

- [ ] **Step 3: Write `src/grounding.cts` (resolver only)**

```typescript
import fs from 'node:fs';
import path from 'node:path';

interface RequiredSource { id: string; path: string; artifact: string; }
interface ResolveResult { required: RequiredSource[]; skipped: string[]; pending: string[]; }

// Strategy step id → (artifact tag, relative .planning path or adr glob).
const STEP_ARTIFACTS: Record<string, { artifact: string; rel: string }> = {
  'model-domain': { artifact: 'DOMAIN-MODEL', rel: 'DOMAIN-MODEL.md' },
  'recommend-architecture': { artifact: 'ADR', rel: 'adr' }, // dir → newest *.md
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
  const sec = secMatch[1];
  for (const line of sec.split('\n')) {
    // status table row: | model-domain | done |
    const row = line.match(/^\|\s*([a-z][a-z0-9-]+)\s*\|\s*([a-z-]+)\s*\|/i);
    if (row && !/^\[/.test(row[1])) steps[row[1].toLowerCase()] = row[2].toLowerCase();
    // skip-ledger line: - <skill> — skipped (reason, date)
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
  for (const [artifact, rel] of [['DESIGN-INVENTORY', 'DESIGN-INVENTORY.md'], ['LEGACY-INVENTORY', 'LEGACY-INVENTORY.md']]) {
    const p = path.join(planning, rel);
    if (fs.existsSync(p)) required.push({ id: rel.replace('.md', '').toLowerCase(), path: p, artifact });
  }
  return { required, skipped, pending };
}

export = { resolveRequiredSources, parseStrategyPlan };
```

- [ ] **Step 4: Wire the dispatch + build**

In `gsd-core/bin/gsd-tools.cjs`, after the `case 'learn': { … }` block (or any existing case), add:

```javascript
    case 'grounding': {
      const g = require('./lib/grounding.cjs');
      const sub = args[1];
      if (sub === 'required') {
        core.output(g.resolveRequiredSources(cwd), raw);
      } else {
        error('Unknown grounding subcommand. Available: required', ERROR_REASON.USAGE);
      }
      break;
    }
```

Then: `npm run build:lib`
Expected: compiles `grounding.cjs`, no tsc errors.

- [ ] **Step 5: Run the test — verify it passes**

Run: `node scripts/run-tests.cjs --files "tests/feat-grounding-resolver.test.cjs"`
Expected: both tests PASS.

- [ ] **Step 6: Gitignore + eslint-ignore the compiled lib, then commit**

Add `/gsd-core/bin/lib/grounding.cjs` to `.gitignore` (next to `audit.cjs`) and `'gsd-core/bin/lib/grounding.cjs',` to the ignores array in `eslint.config.mjs`.

```bash
git rm --cached gsd-core/bin/lib/grounding.cjs 2>/dev/null || true
git add src/grounding.cts gsd-core/bin/gsd-tools.cjs .gitignore eslint.config.mjs tests/feat-grounding-resolver.test.cjs
git commit -m "feat(grounding): Strategy-Plan-driven required-source resolver"
```

---

## Task 2: Citation parser + per-artifact cross-checkers

**Files:**
- Modify: `src/grounding.cts`
- Test: `tests/feat-grounding-gate.test.cjs`

**Interfaces:**
- Produces: `parseGroundingBlock(planText: string): Array<{artifact, key, value}>`; `crossCheck(artifact: string, key: string, value: string, sourceText: string): { ok: boolean, reason: string }`.

- [ ] **Step 1: Write the failing test**

```javascript
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const g = require(path.resolve(__dirname, '..', 'gsd-core', 'bin', 'lib', 'grounding.cjs'));

const ADR = '### Axis A\n| Subdomain | Type | Rung | Why |\n|---|---|---|---|\n| pricing | Core | Domain Model + Hexagonal | second adapter |\n';

describe('grounding citation + cross-check', () => {
  test('parses the ## Grounding block into citations', () => {
    const plan = '## Grounding\n- ADR · pricing → Domain Model + Hexagonal\n- DOMAIN-MODEL · pricing → Core\n\n## Tasks\n';
    const cites = g.parseGroundingBlock(plan);
    assert.equal(cites.length, 2);
    assert.deepEqual(cites[0], { artifact: 'ADR', key: 'pricing', value: 'Domain Model + Hexagonal' });
  });

  test('ADR cross-check passes on set-equality, fails on mismatch/subset/placeholder', () => {
    assert.ok(g.crossCheck('ADR', 'pricing', 'Domain Model + Hexagonal', ADR).ok);
    assert.equal(g.crossCheck('ADR', 'pricing', 'Domain Model', ADR).ok, false, 'subset must fail');
    assert.equal(g.crossCheck('ADR', 'pricing', 'Transaction Script', ADR).ok, false, 'wrong rung fails');
    assert.equal(g.crossCheck('ADR', 'nope', 'Domain Model', ADR).ok, false, 'unknown subdomain fails');
    const placeholder = '### Axis A\n| Subdomain | Type | Rung | Why |\n|---|---|---|---|\n| [core] | Core | [Transaction Script / Domain Model] | x |\n';
    assert.equal(g.crossCheck('ADR', '[core]', '[Transaction Script / Domain Model]', placeholder).ok, false, 'placeholder cell must fail');
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `node scripts/run-tests.cjs --files "tests/feat-grounding-gate.test.cjs"`
Expected: FAIL — `g.parseGroundingBlock is not a function`.

- [ ] **Step 3: Add the parser + cross-checkers to `src/grounding.cts`**

```typescript
// --- citation parsing + cross-check (append before the export) ---
const CITE_RE = /^-\s+(DOMAIN-MODEL|ADR|TEST-STRATEGY|SECURITY-STRATEGY|FRONTEND-ARCHITECTURE|INFRA-STRATEGY|CICD-STRATEGY|DESIGN-INVENTORY|LEGACY-INVENTORY|PRODUCT-BRIEF)\s+·\s+(.+?)\s+→\s+(.+?)\s*$/;

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

// Pull a GFM table's rows into rows[casefold(col0)] = { colName: cell }.
function parseTable(text: string, headerRe: RegExp): { headers: string[]; rows: Record<string, string[]> } {
  const lines = text.split('\n');
  const rows: Record<string, string[]> = {};
  let headers: string[] = [];
  let inTable = false;
  for (const line of lines) {
    if (!inTable && headerRe.test(line) && line.includes('|')) {
      headers = line.split('|').slice(1, -1).map((c) => c.trim());
      inTable = true;
      continue;
    }
    if (inTable) {
      if (/^\s*\|?\s*:?-{3,}/.test(line)) continue; // alignment row
      if (!line.includes('|')) break;
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      if (cells.length) rows[norm(cells[0])] = cells;
    }
  }
  return { headers, rows };
}

const ADR_RUNGS = ['transaction script', 'domain model', 'hexagonal', 'cqrs', 'event sourcing', 'buy', 'off-the-shelf'];
function rungSet(cell: string): Set<string> {
  return new Set(cell.split(/[+/]/).map(norm).filter((t) => ADR_RUNGS.includes(t)));
}

function crossCheck(artifact: string, key: string, value: string, sourceText: string): { ok: boolean; reason: string } {
  if (isPlaceholder(key) || isPlaceholder(value)) return { ok: false, reason: 'placeholder cell — source artifact not filled in' };
  if (artifact === 'ADR') {
    const { rows } = parseTable(sourceText, /\|\s*Subdomain\s*\|/i);
    const row = rows[norm(key)];
    if (!row) return { ok: false, reason: `subdomain "${key}" not in ADR` };
    const rungCol = row[2] || ''; // Axis A col 3 = Rung
    const a = rungSet(rungCol);
    const b = rungSet(value);
    const eq = a.size === b.size && [...a].every((t) => b.has(t)) && a.size > 0;
    return eq ? { ok: true, reason: '' } : { ok: false, reason: `rung mismatch: ADR="${rungCol}" cited="${value}"` };
  }
  if (artifact === 'DOMAIN-MODEL') {
    const { rows } = parseTable(sourceText, /\|\s*Subdomain\s*\|/i);
    const row = rows[norm(key)];
    if (!row) return { ok: false, reason: `subdomain "${key}" not in DOMAIN-MODEL` };
    return norm(row[1]) === norm(value) ? { ok: true, reason: '' } : { ok: false, reason: `type mismatch: "${row[1]}" vs "${value}"` };
  }
  if (artifact === 'TEST-STRATEGY') {
    const { rows } = parseTable(sourceText, /\|\s*Subdomain\s*\|/i);
    const row = rows[norm(key)];
    if (!row) return { ok: false, reason: `subdomain "${key}" not in TEST-STRATEGY` };
    const lead = (norm(row[2]).match(/^(small|medium|large)/) || [])[1];
    return lead === norm(value) ? { ok: true, reason: '' } : { ok: false, reason: `level mismatch: "${row[2]}" vs "${value}"` };
  }
  if (artifact === 'DESIGN-INVENTORY') {
    // value = "<source-enum> / <shape>"; key = "<field> @ <surface>" (surface optional).
    const [field] = key.split('@').map((s) => s.trim());
    const { rows } = parseTable(sourceText, /\|\s*Field\s*\|/i);
    const row = rows[norm(field)];
    if (!row) return { ok: false, reason: `field "${field}" not in DESIGN-INVENTORY` };
    const src = norm((value.split('/')[0] || '').trim());
    return ['design', 'requirement', 'internal'].includes(src) && norm(row[2]) === src
      ? { ok: true, reason: '' } : { ok: false, reason: `source mismatch for "${field}"` };
  }
  // Remaining artifacts: mention-coverage only in Slice 1 (cross-check parser lands in a follow-up).
  return { ok: true, reason: 'mention-coverage (no scripted cross-check yet)' };
}
```

Update the `export =` to add `parseGroundingBlock, crossCheck`.

- [ ] **Step 4: Build + run — verify pass**

Run: `npm run build:lib && node scripts/run-tests.cjs --files "tests/feat-grounding-gate.test.cjs"`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/grounding.cts gsd-core/bin/lib/grounding.cjs tests/feat-grounding-gate.test.cjs
git commit -m "feat(grounding): citation parser + per-artifact cross-check (ADR set-equality, DM/TS/DI)"
```

---

## Task 3: The blocking gate (`check.grounding-plan`) + config toggle

**Files:**
- Modify: `gsd-core/bin/lib/check-command-router.cjs`
- Modify: `gsd-core/bin/shared/config-schema.manifest.json`, `config-defaults.manifest.json`
- Test: `tests/feat-grounding-gate.test.cjs` (append)

**Interfaces:**
- Consumes: `resolveRequiredSources`, `parseGroundingBlock`, `crossCheck` (Task 1–2).
- Produces: dispatch `gsd-tools query check.grounding-plan <phaseDir> <cwd>` → JSON `{ passed, message, skipped? }`.

- [ ] **Step 1: Write the failing test** (append)

```javascript
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const TOOLS = path.resolve(__dirname, '..', 'gsd-core', 'bin', 'gsd-tools.cjs');
const { cleanup } = require('./helpers.cjs');

function run(args, cwd) {
  try { return { code: 0, out: execFileSync(process.execPath, [TOOLS, ...args], { cwd, encoding: 'utf8' }) }; }
  catch (e) { return { code: e.status, out: (e.stdout || '') + (e.stderr || '') }; }
}

describe('grounding gate (blocking)', () => {
  function project(planBody) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-gate-'));
    fs.mkdirSync(path.join(dir, '.planning', 'adr', '..', 'phase'), { recursive: true });
    fs.mkdirSync(path.join(dir, '.planning', 'adr'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.planning', 'PROJECT.md'),
      '## Strategy Plan\n\n| Step | Status |\n|---|---|\n| recommend-architecture | done |\n');
    fs.writeFileSync(path.join(dir, '.planning', 'adr', '0001-architecture.md'),
      '### Axis A\n| Subdomain | Type | Rung | Why |\n|---|---|---|---|\n| pricing | Core | Domain Model | rich |\n');
    const phaseDir = path.join(dir, '.planning', 'phase');
    fs.writeFileSync(path.join(phaseDir, '01-01-PLAN.md'), planBody);
    return { dir, phaseDir };
  }

  test('missing citation for a done source → gate fails', () => {
    const { dir, phaseDir } = project('## Objective\nbuild it\n## Tasks\n- do\n');
    const r = run(['query', 'check.grounding-plan', phaseDir, dir], dir);
    const j = JSON.parse(r.out);
    assert.equal(j.passed, false);
    cleanup(dir);
  });

  test('correct citation → gate passes', () => {
    const { dir, phaseDir } = project('## Grounding\n- ADR · pricing → Domain Model\n## Tasks\n- do\n');
    const r = run(['query', 'check.grounding-plan', phaseDir, dir], dir);
    assert.equal(JSON.parse(r.out).passed, true);
    cleanup(dir);
  });

  test('wrong rung → gate fails with reason', () => {
    const { dir, phaseDir } = project('## Grounding\n- ADR · pricing → Transaction Script\n## Tasks\n- do\n');
    const j = JSON.parse(run(['query', 'check.grounding-plan', phaseDir, dir], dir).out);
    assert.equal(j.passed, false);
    assert.match(j.message, /mismatch/i);
    cleanup(dir);
  });

  test('workflow.grounding_gate=false → skipped/pass', () => {
    const { dir, phaseDir } = project('## Objective\nno grounding\n');
    fs.writeFileSync(path.join(dir, '.planning', 'config.json'), JSON.stringify({ workflow: { grounding_gate: false } }));
    const j = JSON.parse(run(['query', 'check.grounding-plan', phaseDir, dir], dir).out);
    assert.equal(j.passed, true);
    cleanup(dir);
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `node scripts/run-tests.cjs --files "tests/feat-grounding-gate.test.cjs"`
Expected: FAIL — `check.grounding-plan` unknown query.

- [ ] **Step 3: Implement `cmdGroundingPlan` in `check-command-router.cjs`**

Add `grounding` to the scanned headings regex (find `DESIGNATED_HEADINGS_RE`):

```javascript
// was: /^#{1,6}\s+(?:must[_ ]haves?|truths?|tasks?|objective)\b/i
const DESIGNATED_HEADINGS_RE = /^#{1,6}\s+(?:must[_ ]haves?|truths?|tasks?|objective|grounding)\b/i;
```

Add the gate handler + toggle (near `cmdDecisionCoveragePlan`):

```javascript
function groundingGateEnabled(projectDir) {
  const v = readWorkflowConfig(projectDir).grounding_gate;
  return typeof v === 'boolean' ? v : true; // absent = enabled
}

function cmdGroundingPlan(phaseDir, projectDir, raw) {
  if (!groundingGateEnabled(projectDir)) {
    output({ passed: true, skipped: true, reason: 'workflow.grounding_gate is false' }, raw, undefined);
    return;
  }
  const g = require('./grounding.cjs');
  const { required } = g.resolveRequiredSources(projectDir);
  const fs = require('fs');
  const path = require('path');
  const planFiles = fs.readdirSync(phaseDir).filter((f) => /-PLAN\.md$/.test(f));
  const planText = planFiles.map((f) => fs.readFileSync(path.join(phaseDir, f), 'utf8')).join('\n');
  const cites = g.parseGroundingBlock(planText);
  const problems = [];
  for (const src of required) {
    const matches = cites.filter((c) => c.artifact === src.artifact);
    if (!matches.length) { problems.push(`${src.artifact}: no citation in ## Grounding`); continue; }
    const srcText = fs.readFileSync(src.path, 'utf8');
    // at least one citation for this artifact must cross-check
    const anyOk = matches.some((c) => g.crossCheck(src.artifact, c.key, c.value, srcText).ok);
    if (!anyOk) {
      const why = g.crossCheck(src.artifact, matches[0].key, matches[0].value, srcText).reason;
      problems.push(`${src.artifact}: citation does not match the source (${why})`);
    }
  }
  const passed = problems.length === 0;
  output({ passed, message: passed ? 'Grounding verified.' : 'Grounding gate failed:\n- ' + problems.join('\n- ') }, raw, undefined);
}
```

Route it in the `check.*` dispatch (find where `decision-coverage-plan` is routed):

```javascript
if (sub === 'grounding-plan') { cmdGroundingPlan(args[0], args[1], raw); return; }
```

Register the config key: add `"grounding_gate"` to the workflow keys in `config-schema.manifest.json` (beside `context_coverage_gate`) and `"grounding_gate": true` in `config-defaults.manifest.json` (beside `context_coverage_gate`).

- [ ] **Step 4: Build + run — verify pass**

Run: `npm run build:lib && node scripts/run-tests.cjs --files "tests/feat-grounding-gate.test.cjs"`
Expected: all PASS (missing→fail, correct→pass, wrong→fail, toggle-off→pass).

- [ ] **Step 5: Commit**

```bash
git add gsd-core/bin/lib/check-command-router.cjs gsd-core/bin/shared/config-schema.manifest.json gsd-core/bin/shared/config-defaults.manifest.json tests/feat-grounding-gate.test.cjs
git commit -m "feat(grounding): blocking check.grounding-plan gate + workflow.grounding_gate toggle"
```

---

## Task 4: The `## Grounding` doctrine + PLAN template section + planner instruction

**Files:**
- Create: `gsd-core/references/grounding-citations.md`
- Modify: `gsd-core/templates/phase-prompt.md` (add `## Grounding`)
- Modify: `agents/gsd-planner.md` (terse instruction, ≤ ~10 lines — the file has ~892 chars of headroom under the 50000-char reachability gate)

- [ ] **Step 1: Write the doctrine reference**

Create `gsd-core/references/grounding-citations.md` with: the citation line format (`- <ARTIFACT> · <key> → <value>`, `·`=U+00B7, `→`=U+2192); the per-artifact high-entropy cell table (ADR→compound rung set per subdomain; DOMAIN-MODEL→Type per subdomain; TEST-STRATEGY→primary level per subdomain; DESIGN-INVENTORY→`<field> @ <surface> → <source-enum> / <shape>`; the others→cite the load-bearing decision); the rule "cite the decision that exists only in that file, keyed to its unit"; and the **source-direct citation** form for literal sources (`- SOURCE · <fact> → <path>:<line>`), noting these are grepped against the real file. Keep it a decision-instrument, ~60 lines.

- [ ] **Step 2: Add the section to the PLAN template**

In `gsd-core/templates/phase-prompt.md`, add after the objective/context area (no size gate here):

```markdown
## Grounding

<!-- One line per active (done) source — the decision this plan takes from it, keyed to its unit.
     Format: - <ARTIFACT> · <key> → <value>   (see references/grounding-citations.md)
     Verified by check.grounding-plan; a missing or mismatched required source blocks the plan. -->
- [e.g. ADR · <subdomain> → <rung>]
```

- [ ] **Step 3: Add the terse planner instruction**

In `agents/gsd-planner.md`, in the plan-writing section, add:

```markdown
- **Fill `## Grounding`** from the active (done) strategy sources, per `@~/.claude/gsd-core/references/grounding-citations.md`: one line per source citing the decision only that file holds (ADR rung per subdomain, etc.). `check.grounding-plan` blocks the plan on a missing/mismatched required source.
```

- [ ] **Step 4: Verify structure**

Run:
```bash
grep -c '·' gsd-core/references/grounding-citations.md
grep -n '## Grounding' gsd-core/templates/phase-prompt.md
grep -n 'grounding-citations.md' agents/gsd-planner.md
node scripts/run-tests.cjs --files "tests/agent-size-budget.test.cjs tests/reachability-check.test.cjs" 2>&1 | grep -E '# (pass|fail)'
```
Expected: the citation reference exists; the template + planner reference it; the planner size/reachability gates still pass.

- [ ] **Step 5: Commit**

```bash
git add gsd-core/references/grounding-citations.md gsd-core/templates/phase-prompt.md agents/gsd-planner.md
git commit -m "feat(grounding): ## Grounding doctrine + PLAN template section + planner instruction"
```

---

## Task 5: Wire the gate into plan-phase (byte-extraction first) + the fallback hook

**Files:**
- Modify: `gsd-core/workflows/plan-phase.md` (byte-extract prose → a reference, then add the gate call)
- Create: `gsd-core/references/plan-phase-<extracted>.md` (whatever prose is lifted)

- [ ] **Step 1: Free bytes in plan-phase.md**

Measure: `wc -c gsd-core/workflows/plan-phase.md` (must end < 90000 after edits). Identify a self-contained prose block (e.g. an extended explanatory note ≥ ~400 bytes) and move it verbatim into a new `gsd-core/references/plan-phase-<topic>.md`, replacing it in-place with a one-line `@~/.claude/gsd-core/references/plan-phase-<topic>.md` pointer (lazy — NOT eagerly inlined elsewhere).

- [ ] **Step 2: Add the gate invocation** (mirror the `decision-coverage-plan` block ~line 1562)

```bash
GGATE=$(gsd_run query config-get workflow.grounding_gate 2>/dev/null || echo "true")
if [ "$GGATE" != "false" ]; then
  GRES=$(gsd_run query check.grounding-plan "${PHASE_DIR}" "$(pwd)")
  echo "$GRES" | jq -e '(.passed // .data.passed) == true' >/dev/null || {
    echo "$GRES" | jq -r '(.message // .data.message // "Grounding gate failed.")'
    echo "Fix: fill/correct the plan's ## Grounding block to match the active strategy sources, then re-run."
    exit 1
  }
fi
```

- [ ] **Step 3: Verify byte budget + wiring**

Run:
```bash
test "$(wc -c < gsd-core/workflows/plan-phase.md)" -lt 90000 && echo "plan-phase OK"
grep -n 'check.grounding-plan' gsd-core/workflows/plan-phase.md
node scripts/run-tests.cjs --files "tests/workflow-size-budget.test.cjs" 2>&1 | grep -E '# (pass|fail)'
```
Expected: under 90000; the gate is wired; the size-budget test passes.

- [ ] **Step 4: Commit**

```bash
git add gsd-core/workflows/plan-phase.md gsd-core/references/plan-phase-*.md
git commit -m "feat(grounding): gate plan-phase on check.grounding-plan (byte-extracted to fit)"
```

---

## Task 6: The planted-discrepancy fixture + ablation (the realistic proof)

**Files:**
- Create: `tests/grounding-fixture-ablation.test.cjs`

- [ ] **Step 1: Write the ablation test**

```javascript
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { cleanup } = require('./helpers.cjs');
const TOOLS = path.resolve(__dirname, '..', 'gsd-core', 'bin', 'gsd-tools.cjs');

// A counter-instinctive fixture: ADR mandates Transaction Script for a subdomain
// a model would instinctively make a Domain Model. The gate must reject a plan
// that grounds it as Domain Model (drift), and accept one that honors the ADR.
function fixture(planGrounding, gateOff) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-fix-'));
  fs.mkdirSync(path.join(dir, '.planning', 'adr'), { recursive: true });
  const phaseDir = path.join(dir, '.planning', 'phase');
  fs.mkdirSync(phaseDir, { recursive: true });
  fs.writeFileSync(path.join(dir, '.planning', 'PROJECT.md'),
    '## Strategy Plan\n\n| Step | Status |\n|---|---|\n| recommend-architecture | done |\n');
  fs.writeFileSync(path.join(dir, '.planning', 'adr', '0001-architecture.md'),
    '### Axis A\n| Subdomain | Type | Rung | Why |\n|---|---|---|---|\n| ledger | Supporting | Transaction Script | thin CRUD |\n');
  if (gateOff) fs.writeFileSync(path.join(dir, '.planning', 'config.json'), JSON.stringify({ workflow: { grounding_gate: false } }));
  fs.writeFileSync(path.join(phaseDir, '01-01-PLAN.md'), `## Grounding\n${planGrounding}\n## Tasks\n- build\n`);
  return { dir, phaseDir };
}
function gate(dir, phaseDir) {
  try { return JSON.parse(execFileSync(process.execPath, [TOOLS, 'query', 'check.grounding-plan', phaseDir, dir], { cwd: dir, encoding: 'utf8' })); }
  catch (e) { return JSON.parse((e.stdout || '{}')); }
}

describe('grounding — planted discrepancy + ablation', () => {
  test('ON: plan that DRIFTS from the counter-instinctive ADR is blocked', () => {
    const { dir, phaseDir } = fixture('- ADR · ledger → Domain Model', false); // drift: instinct over ADR
    assert.equal(gate(dir, phaseDir).passed, false, 'drift to Domain Model must be blocked');
    cleanup(dir);
  });
  test('ON: plan that HONORS the ADR (Transaction Script) passes', () => {
    const { dir, phaseDir } = fixture('- ADR · ledger → Transaction Script', false);
    assert.equal(gate(dir, phaseDir).passed, true, 'honoring the ADR passes');
    cleanup(dir);
  });
  test('OFF (ablation): the same drift is NOT blocked', () => {
    const { dir, phaseDir } = fixture('- ADR · ledger → Domain Model', true);
    assert.equal(gate(dir, phaseDir).passed, true, 'gate disabled → drift slips through (baseline)');
    cleanup(dir);
  });
});
```

- [ ] **Step 2: Run — verify it passes**

Run: `node scripts/run-tests.cjs --files "tests/grounding-fixture-ablation.test.cjs"`
Expected: all PASS — ON blocks the drift, ON accepts the honored ADR, OFF lets the drift through (the before/after proof).

- [ ] **Step 3: Full suite green + commit**

```bash
npm run test:unit > /tmp/ss.log 2>&1; echo "EXIT=$?"; grep -c '^not ok' /tmp/ss.log
git add tests/grounding-fixture-ablation.test.cjs
git commit -m "test(grounding): planted-discrepancy fixture + ablation proves the behavior flip"
```
Expected: `EXIT=0`, `0` not-ok.

---

## Self-Review

**1. Spec coverage (Slice 1 = M1+M2+M3 + toggle):** resolver/Strategy-Plan (Task 1) ✓; citation parser + cross-check incl. ADR set-equality, placeholder guard, DESIGN-INVENTORY field-key (Task 2) ✓; blocking gate + config toggle (Task 3) ✓; `## Grounding` doctrine + template + planner (Task 4) ✓; plan-phase wiring + byte-extraction (Task 5) ✓; planted-discrepancy + ablation (Task 6) ✓. Deferred to later slices (noted): the `## Sources` registry + source-direct citation grep + the 2-mapper hooks (Slice 2), the flow-gap fixes (Slice 3), the AGENTS.md ambient index (Slice 4), and the remaining artifact cross-checkers (SECURITY/FE/INFRA/CICD/PRODUCT-BRIEF — mention-coverage in Slice 1, scripted in a follow-up).

**2. Placeholder scan:** every code step has complete code; the one intentionally-parameterized value is the byte-extraction target in Task 5 (chosen at build time to fit under 90000) — bounded and explicit.

**3. Type consistency:** `resolveRequiredSources` / `parseGroundingBlock` / `crossCheck` signatures match across Tasks 1–3 and the gate; the citation format (`ARTIFACT · key → value`) and the artifact tags are identical in the parser, the cross-checkers, the doctrine, and the fixture.

## Follow-on slices (own plans)

- **Slice 2:** `## Sources` registry (design/legacy/vibe/additional-app locations) + source-direct citation grep against the real files + source-precedence hooks for `gsd-codebase-mapper` and `gsd-intel-updater`.
- **Slice 3:** flow-gap fixes — `ultraplan-phase`, `autonomous --skip-discuss`, `ui-review`, `secure-phase`.
- **Slice 4:** the ambient "Sources of truth" section in `generate-claude-md` (AGENTS.md/CLAUDE.md/GEMINI.md) + event-driven refresh.
