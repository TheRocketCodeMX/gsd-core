# Context Lifecycle (`context` capability) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `context` capability — GSD's knowledge lifecycle (MASTER-CONTEXT index, quality-stamped phase capsules inside `<N>-CONTEXT.md`, append-only layers, deterministic anchor verification, calm context-pressure hook, re-anchor procedure) plus the four enforcement-alignment core patches — per `docs/superpowers/specs/2026-07-18-context-lifecycle-design.md`.

**Architecture:** A capability pack (`capabilities/context/`) owning the `/gsd:context` command family (workflow-driven verbs `seed`/`scout`/`flush`/`master` + deterministic CLI verbs `verify`/`provenance` in a new `src/context.cts` + `src/context-command-router.cts`), three templates, and a revived `hooks/gsd-context-monitor.js`. Delivery/growth wiring lands as small marked core patches (`FORK:context`) in discuss-phase, plan-phase, execute-phase, transition, complete-milestone, new-milestone, new-project, resume-project, two agents, the SUMMARY template, and `src/grounding.cts` — every patch registered in `docs/FORK-PATCHES.json` + `docs/FORK-DELTA.md` in the same task that creates it.

**Tech Stack:** TypeScript-as-CJS (`src/*.cts` → `gsd-core/bin/lib/*.cjs` via `npm run build:lib`), node:test + `node:assert/strict`, existing gsd-tools dispatch (ADR-959 `default:` capability path), managed hooks (`hooks/hooks.json` already registers the monitor on PostToolUse/SubagentStop/Stop/PreCompact — only the file body changes).

## Global Constraints

- Branch: `feat/context-lifecycle` (already exists, off `next`). Commit per task.
- Capability ids are plain: `learn`, `strategy`, `grounding`, `context` (Task 1 renames the first three). No `rocket-` string may remain outside git history and `@therocketcode` package identity.
- Frontmatter key: `context_provenance` (never `capsule_provenance`). Quality enum: `rich | artifact-distilled | thin`.
- Anchor syntax (locked): a Verified-Facts bullet carries one or more `[anchor: <path>[:<line>] "<substring>"]` tails. Line numbers are advisory; the quoted substring must be present (case-insensitive) in the file. `ext:`-prefixed paths (other repos) are skipped as `external`.
- Stale annotation (locked): append ` [STALE — <YYYY-MM-DD>: <reason>]` to the failing bullet line; idempotent (skip lines already containing `[STALE`).
- Layer headings (locked): `## Seed refresh (<date>)`, `## Scout corrections (<date>)`, `## Discussion additions (<date>)`, `## Orchestrator curation (<date>)`. Later layers override earlier claims; nothing is deleted.
- Config keys (locked, flat, grounding-style): `context_lifecycle.enabled` (true), `context_lifecycle.seed_offer` (`"prompt"`), `context_lifecycle.curation` (true), `context_lifecycle.hook_enabled` (true), `context_lifecycle.hook_warn_pct` (90), `context_lifecycle.hook_urge_pct` (95), `context_lifecycle.verify_max_age_commits` (50), `context_lifecycle.discussion_logs` (true).
- Hook tone contract: messages may never contain `CRITICAL`, `URGENT`, `immediately`, `STOP` (case-sensitive as written). CI-linted.
- Every core-file patch: wrap in `<!-- FORK:context BEGIN -->` / `<!-- FORK:context END -->` (markdown) or `// FORK:context` (code), and add/extend its `docs/FORK-PATCHES.json` entry + `docs/FORK-DELTA.md` row **in the same task**. `tests/fork-delta-manifest.test.cjs` must pass at every commit.
- Workflow byte budgets (`tests/workflow-size-budget.test.cjs`) must pass; if a patch busts a budget, move prose to `gsd-core/references/context-lifecycle.md` and leave a one-line pointer.
- Line numbers in this plan are advisory: always locate the quoted anchor text first (`grep -n`), then edit. If an anchor is missing, stop and re-scout the file — do not guess.
- Full verification at the end of every task: the task's named test file passes AND `npm run test:unit` EXITS 0 (check `$?`; never judge by tail output).
- TEXT_MODE fallbacks for every new interactive step (numbered-list prompt alternative).

---

### Task 1: Rename `rocket-*` capability ids to plain ids

**Files:**
- Rename dir: `capabilities/rocket-learn/` → `capabilities/learn/`
- Rename dir: `capabilities/rocket-strategy/` → `capabilities/strategy/`
- Rename dir: `capabilities/rocket-grounding/` → `capabilities/grounding/`
- Modify: `capabilities/{learn,strategy,grounding}/capability.json` (the `"id"` field; also drop "Rocket"/"Rocket capability pack" phrasing from `title`/`description`)
- Modify: `src/learn-command-router.cts`, `src/grounding-command-router.cts`, `src/project-command-router.cts` (comment references)
- Modify: `tests/strategy-config-and-marker-contracts.test.cjs`, `tests/feat-learn.test.cjs`, `tests/feat-grounding-gate.test.cjs` (id references)
- Modify: `docs/FORK-DELTA.md`, `docs/FORK-PATCHES.json` (any `rocket-` mentions)
- Regenerate: `gsd-core/bin/lib/capability-registry.cjs`

**Interfaces:**
- Produces: capability ids `learn`, `strategy`, `grounding` that Task 3's `context` id sits beside.

- [ ] **Step 1: Write the failing guard test** — append to `tests/strategy-config-and-marker-contracts.test.cjs`:

```js
test('no rocket- prefixed capability ids remain (plain-id convention)', () => {
  const capsDir = path.resolve(__dirname, '..', 'capabilities');
  const dirs = fs.readdirSync(capsDir);
  assert.ok(!dirs.some((d) => d.startsWith('rocket-')), `rocket-prefixed dirs remain: ${dirs.filter((d) => d.startsWith('rocket-'))}`);
  for (const id of ['learn', 'strategy', 'grounding']) {
    const cap = JSON.parse(fs.readFileSync(path.join(capsDir, id, 'capability.json'), 'utf8'));
    assert.equal(cap.id, id);
  }
});
```

(Use the file's existing `fs`/`path` requires; add them if that file lacks them.)

- [ ] **Step 2: Run it, verify it fails** — `node --test tests/strategy-config-and-marker-contracts.test.cjs` → FAIL (rocket- dirs exist).
- [ ] **Step 3: Rename** — `git mv capabilities/rocket-learn capabilities/learn` (and the other two). Edit each `capability.json`: `"id": "learn"` etc.; in `grounding`'s `title` use `"Source-grounding enforcement"`, description drops `(Rocket capability pack)`. Do the same de-branding in `learn`/`strategy` manifests.
- [ ] **Step 4: Sweep references** — `grep -rn "rocket-" src/ tests/ docs/FORK-DELTA.md docs/FORK-PATCHES.json capabilities/` and update every hit (router doc-comments say `capabilities/learn/capability.json` now; test fixtures/ids updated). Then `npm run gen:capability-registry` and `npm run build:lib`.
- [ ] **Step 5: Verify zero remnants + green** — `grep -rn "rocket-" --include="*.cts" --include="*.cjs" --include="*.json" --include="*.md" src/ capabilities/ gsd-core/ commands/ scripts/ tests/ docs/ | grep -vi therocketcode` → empty. `npm run test:unit; echo "EXIT=$?"` → `EXIT=0`.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "refactor: rename rocket-* capability ids to plain ids (learn, strategy, grounding)"`

### Task 2: `context.cts` core module (provenance parse + anchor verify)

**Files:**
- Create: `src/context.cts`
- Test: `tests/feat-context-core.test.cjs`

**Interfaces:**
- Produces (consumed by Task 3 router and Task 10 gate):
  - `parseContextProvenance(text: string): { phase: string|null, author: string, date: string, quality: 'rich'|'artifact-distilled'|'thin', note: string } | null`
  - `extractAnchors(text: string): Array<{ path: string, line: number|null, fact: string, bulletLine: number }>` — scans only inside `## Verified Facts` and MASTER `## Load-bearing verified facts` sections
  - `verifyAnchors(cwd: string, anchors: Anchor[]): Array<{ anchor: Anchor, status: 'ok'|'stale'|'missing'|'external', reason: string }>`
  - `annotateStale(filePath: string, results: Result[], date: string): number` — returns count annotated; idempotent
  - `verifyContextFile(cwd: string, filePath: string, date: string): { file: string, total: number, ok: number, stale: number, missing: number, external: number, annotated: number, results: Result[] }`

- [ ] **Step 1: Write the failing tests** — `tests/feat-context-core.test.cjs`:

```js
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { cleanup } = require('./helpers.cjs');
const ctx = require(path.resolve(__dirname, '..', 'gsd-core', 'bin', 'lib', 'context.cjs'));

const CAPSULE = `---
phase: 7
context_provenance:
  author: orchestrator
  date: 2026-07-18
  quality: rich
  note: "seeded at full context"
---

# Phase 7 Context Capsule

## Verified Facts

- The router registers five verbs [anchor: src/app.js:12 "five verbs"]
- External system claim [anchor: ext:orbit/src/x.ts "queue"]
- Gone claim [anchor: src/app.js "hexagonal moon base"]
- Missing file claim [anchor: src/nope.js "anything"]

## Locked Decisions

- Not scanned here [anchor: src/app.js "never checked"]
`;

describe('context core', () => {
  test('parses context_provenance frontmatter', () => {
    const p = ctx.parseContextProvenance(CAPSULE);
    assert.equal(p.quality, 'rich');
    assert.equal(p.author, 'orchestrator');
    assert.equal(p.date, '2026-07-18');
  });
  test('returns null when no provenance (plain discuss-phase CONTEXT)', () => {
    assert.equal(ctx.parseContextProvenance('# Phase 3 Context\n\nplain'), null);
  });
  test('extracts anchors only from Verified Facts sections', () => {
    const a = ctx.extractAnchors(CAPSULE);
    assert.equal(a.length, 4);
    assert.deepEqual(a.map((x) => x.path), ['src/app.js', 'ext:orbit/src/x.ts', 'src/app.js', 'src/nope.js']);
    assert.equal(a[0].line, 12);
    assert.equal(a[2].line, null);
  });
  test('verifyContextFile classifies ok/external/stale/missing and annotates idempotently', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-ctx-'));
    try {
      fs.mkdirSync(path.join(dir, 'src'));
      fs.writeFileSync(path.join(dir, 'src', 'app.js'), '// registers Five Verbs here\n');
      const cap = path.join(dir, '07-CONTEXT.md');
      fs.writeFileSync(cap, CAPSULE);
      const r = ctx.verifyContextFile(dir, cap, '2026-07-18');
      assert.equal(r.ok, 1, 'substring match is case-insensitive');
      assert.equal(r.external, 1);
      assert.equal(r.stale, 1);
      assert.equal(r.missing, 1);
      assert.equal(r.annotated, 2, 'stale + missing lines annotated');
      const text = fs.readFileSync(cap, 'utf8');
      assert.match(text, /hexagonal moon base.*\[STALE — 2026-07-18/);
      const r2 = ctx.verifyContextFile(dir, cap, '2026-07-19');
      assert.equal(r2.annotated, 0, 'already-annotated lines are skipped');
    } finally { cleanup(dir); }
  });
});
```

- [ ] **Step 2: Run to verify failure** — `node --test tests/feat-context-core.test.cjs` → FAIL (`Cannot find module .../context.cjs`).
- [ ] **Step 3: Implement `src/context.cts`**:

```ts
'use strict';
/**
 * Context-lifecycle core (capability: context). Deterministic halves of the
 * /gsd:context family: provenance parsing + anchored-claim verification.
 * Anchor grammar: [anchor: <path>[:<line>] "<substring>"]. Line advisory;
 * substring must be present case-insensitively (mirrors grounding's
 * checkSourceCitation doctrine). ext:-prefixed paths are external repos → skipped.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
import fs = require('node:fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
import path = require('node:path');

interface Provenance { phase: string | null; author: string; date: string; quality: string; note: string }
interface Anchor { path: string; line: number | null; fact: string; bulletLine: number }
interface Result { anchor: Anchor; status: 'ok' | 'stale' | 'missing' | 'external'; reason: string }

const ANCHOR_RE = /\[anchor:\s*([^\s"\]]+?)(?::(\d+))?\s+"([^"]+)"\]/g;
const FACT_SECTIONS = ['## Verified Facts', '## Load-bearing verified facts'];

function parseContextProvenance(text: string): Provenance | null {
  const fm = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!fm || !/context_provenance:/.test(fm[1])) return null;
  const grab = (k: string): string => {
    const m = new RegExp(`^\\s*${k}:\\s*"?([^"\\n]+)"?\\s*$`, 'm').exec(fm[1]);
    return m ? m[1].trim() : '';
  };
  const phase = /^phase:\s*(\S+)/m.exec(fm[1]);
  return { phase: phase ? phase[1] : null, author: grab('author'), date: grab('date'), quality: grab('quality'), note: grab('note') };
}

function sectionSlices(text: string): string[] {
  const lines = text.split('\n');
  const out: Array<{ start: number; end: number }> = [];
  let start = -1;
  lines.forEach((l, i) => {
    const isFact = FACT_SECTIONS.some((h) => l.startsWith(h));
    if (l.startsWith('## ')) { if (start >= 0) { out.push({ start, end: i }); start = -1; } if (isFact) start = i; }
  });
  if (start >= 0) out.push({ start, end: lines.length });
  return out.map(({ start: s, end: e }) => lines.slice(s, e).map((l, j) => `${s + j} ${l}`).join('\n'));
}

function extractAnchors(text: string): Anchor[] {
  const anchors: Anchor[] = [];
  for (const slice of sectionSlices(text)) {
    for (const numbered of slice.split('\n')) {
      const sep = numbered.indexOf(' ');
      const lineNo = Number(numbered.slice(0, sep));
      const line = numbered.slice(sep + 1);
      let m: RegExpExecArray | null;
      ANCHOR_RE.lastIndex = 0;
      while ((m = ANCHOR_RE.exec(line)) !== null) {
        anchors.push({ path: m[1], line: m[2] ? Number(m[2]) : null, fact: m[3], bulletLine: lineNo });
      }
    }
  }
  return anchors;
}

function verifyAnchors(cwd: string, anchors: Anchor[]): Result[] {
  return anchors.map((anchor) => {
    if (anchor.path.startsWith('ext:')) return { anchor, status: 'external' as const, reason: 'external repo — verify manually' };
    const abs = path.resolve(cwd, anchor.path);
    if (!fs.existsSync(abs)) return { anchor, status: 'missing' as const, reason: `file not found: ${anchor.path}` };
    const content = fs.readFileSync(abs, 'utf8').toLowerCase();
    if (!content.includes(anchor.fact.toLowerCase())) return { anchor, status: 'stale' as const, reason: `fact not found in ${anchor.path}: "${anchor.fact}"` };
    return { anchor, status: 'ok' as const, reason: 'fact present (line advisory)' };
  });
}

function annotateStale(filePath: string, results: Result[], date: string): number {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  let annotated = 0;
  for (const r of results) {
    if (r.status !== 'stale' && r.status !== 'missing') continue;
    const i = r.anchor.bulletLine;
    if (i >= 0 && i < lines.length && !lines[i].includes('[STALE')) {
      lines[i] = `${lines[i]} [STALE — ${date}: ${r.reason}]`;
      annotated += 1;
    }
  }
  if (annotated > 0) fs.writeFileSync(filePath, lines.join('\n'));
  return annotated;
}

function verifyContextFile(cwd: string, filePath: string, date: string) {
  const text = fs.readFileSync(filePath, 'utf8');
  const results = verifyAnchors(cwd, extractAnchors(text));
  const count = (s: string): number => results.filter((r) => r.status === s).length;
  const annotated = annotateStale(filePath, results, date);
  return { file: filePath, total: results.length, ok: count('ok'), stale: count('stale'), missing: count('missing'), external: count('external'), annotated, results };
}

export = { parseContextProvenance, extractAnchors, verifyAnchors, annotateStale, verifyContextFile };
```

- [ ] **Step 4: Build + run tests to pass** — `npm run build:lib && node --test tests/feat-context-core.test.cjs` → all PASS. (If the multi-anchor-per-line iteration or section slicing fails a test, fix the implementation — the tests are the contract.)
- [ ] **Step 5: Full suite + commit** — `npm run test:unit; echo "EXIT=$?"` → `EXIT=0`. `git add src/context.cts tests/feat-context-core.test.cjs gsd-core/bin/lib/context.cjs && git commit -m "feat(context): core module — provenance parse + anchored-claim verification"`

### Task 3: Capability manifest + command router (`gsd-tools context verify|provenance`)

**Files:**
- Create: `capabilities/context/capability.json`
- Create: `src/context-command-router.cts`
- Test: `tests/feat-context-router.test.cjs`
- Regenerate: `gsd-core/bin/lib/capability-registry.cjs`

**Interfaces:**
- Consumes: Task 2's `context.cjs` exports.
- Produces: CLI `gsd-tools context verify [--phase <N>|--file <path>] [--milestone]` (JSON report) and `gsd-tools context provenance --file <path>` (parsed provenance or `null`), dispatched via the registry `default:` path. Consumed by Tasks 5, 8, 10, 11.

- [ ] **Step 1: Write failing router tests** — `tests/feat-context-router.test.cjs`, modeled on the learn router seam pattern (`_core` injection):

```js
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { cleanup } = require('./helpers.cjs');
const { routeContextCommand } = require(path.resolve(__dirname, '..', 'gsd-core', 'bin', 'lib', 'context-command-router.cjs'));

function run(args, cwd) {
  const out = []; const errs = [];
  routeContextCommand({ args, cwd, raw: true, error: (m) => errs.push(m), _core: { output: (v) => out.push(v) } });
  return { out, errs };
}

describe('context command router', () => {
  test('provenance returns parsed frontmatter, null for plain files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-cr-'));
    try {
      const f = path.join(dir, 'C.md');
      fs.writeFileSync(f, '---\nphase: 2\ncontext_provenance:\n  author: orchestrator\n  date: 2026-07-18\n  quality: thin\n  note: "x"\n---\n# C\n');
      const { out } = run(['context', 'provenance', '--file', f], dir);
      assert.equal(out[0].quality, 'thin');
      fs.writeFileSync(f, '# plain\n');
      assert.equal(run(['context', 'provenance', '--file', f], dir).out[0], null);
    } finally { cleanup(dir); }
  });
  test('verify --file reports and annotates; unknown subcommand errors', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-cr2-'));
    try {
      const f = path.join(dir, 'C.md');
      fs.writeFileSync(f, '## Verified Facts\n\n- claim [anchor: gone.js "x"]\n');
      const { out } = run(['context', 'verify', '--file', f], dir);
      assert.equal(out[0].missing, 1);
      assert.match(fs.readFileSync(f, 'utf8'), /\[STALE — /);
      const { errs } = run(['context', 'frobnicate'], dir);
      assert.match(errs.join(' '), /Unknown context subcommand/);
    } finally { cleanup(dir); }
  });
  test('verify --phase resolves the phase capsule under .planning/phases', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-cr3-'));
    try {
      const pdir = path.join(dir, '.planning', 'phases', '07-build');
      fs.mkdirSync(pdir, { recursive: true });
      fs.writeFileSync(path.join(pdir, '07-CONTEXT.md'), '## Verified Facts\n\n- ok [anchor: ext:x "y"]\n');
      const { out } = run(['context', 'verify', '--phase', '7'], dir);
      assert.equal(out[0].external, 1);
    } finally { cleanup(dir); }
  });
});
```

- [ ] **Step 2: Run to verify failure** — `node --test tests/feat-context-router.test.cjs` → FAIL (module missing).
- [ ] **Step 3: Write `capabilities/context/capability.json`** (grounding's manifest is the template; same field set):

```json
{
  "id": "context",
  "role": "feature",
  "version": "2.2.0",
  "title": "Context lifecycle — durable project knowledge",
  "description": "The knowledge lifecycle: MASTER-CONTEXT index, quality-stamped phase capsules inside <N>-CONTEXT.md, append-only layers, deterministic anchor verification (gsd-tools context verify), the calm context-pressure flush hook, and the re-anchor procedure. Doctrine: plans are perishable; context is durable.",
  "tier": "full",
  "requires": [],
  "engines": { "gsd": ">=1.6.0" },
  "runtimeCompat": { "supported": ["*"], "unsupported": [] },
  "skills": [],
  "agents": [],
  "hooks": [],
  "config": {
    "context_lifecycle.enabled": { "type": "boolean", "default": true, "description": "Master switch for the context lifecycle (seeding offers, freshness gate, curation step, re-anchor step). false = every consumer behaves as if no capsule exists." },
    "context_lifecycle.seed_offer": { "type": "string", "default": "prompt", "description": "Roadmap-time seeding behavior: prompt (offer once, skippable) | auto (seed without asking, quality-stamped) | off." },
    "context_lifecycle.curation": { "type": "boolean", "default": true, "description": "After researcher/planner output, return control to the orchestrator to review against MASTER-CONTEXT + capsule and append an '## Orchestrator curation' layer before the checker runs." },
    "context_lifecycle.hook_enabled": { "type": "boolean", "default": true, "description": "Enable the calm context-pressure flush messages from the context-monitor hook (main session only)." },
    "context_lifecycle.hook_warn_pct": { "type": "number", "default": 90, "description": "used_pct threshold for the first calm flush suggestion." },
    "context_lifecycle.hook_urge_pct": { "type": "number", "default": 95, "description": "used_pct threshold for the single firmer repeat." },
    "context_lifecycle.verify_max_age_commits": { "type": "number", "default": 50, "description": "Capsule age (commits since provenance date) beyond which plan-phase runs context verify before consuming it and scout is offered pre-discussion." },
    "context_lifecycle.discussion_logs": { "type": "boolean", "default": true, "description": "Append elicitation Q&A to PROJECT-DISCUSSION-LOG.md / <N>-DISCUSSION-LOG.md." }
  },
  "commands": [ { "family": "context", "module": "context-command-router.cjs", "router": "routeContextCommand" } ],
  "steps": [],
  "contributions": [],
  "gates": []
}
```

- [ ] **Step 4: Write `src/context-command-router.cts`** — copy the learn-router skeleton exactly (same imports, `routeHubCommandFamily`, `_core` seam), with:

```ts
subcommands: ['verify', 'provenance'],
handlers: {
  verify: () => {
    const today = new Date().toISOString().slice(0, 10);
    const fileFlag = args.indexOf('--file');
    const phaseFlag = args.indexOf('--phase');
    let files: string[] = [];
    if (fileFlag !== -1) files = [args[fileFlag + 1]];
    else if (phaseFlag !== -1) files = resolvePhaseCapsules(cwd, args[phaseFlag + 1]);
    else if (args.includes('--milestone')) files = resolveMilestoneFiles(cwd);
    else return makeInvalidArgs('target', 'context verify requires --file, --phase or --milestone', ERROR_REASON.USAGE);
    if (files.length === 0) return makeInvalidArgs('target', 'no matching CONTEXT file found', ERROR_REASON.USAGE);
    const reports = files.map((f) => context.verifyContextFile(cwd, f, today));
    c.output(reports.length === 1 ? reports[0] : reports, raw);
  },
  provenance: () => {
    const fileFlag = args.indexOf('--file');
    if (fileFlag === -1 || !args[fileFlag + 1]) return makeInvalidArgs('file', 'context provenance requires --file <path>', ERROR_REASON.USAGE);
    c.output(context.parseContextProvenance(fs.readFileSync(path.resolve(cwd, args[fileFlag + 1]), 'utf8')), raw);
  },
},
unknownMessage: (_s, available) => `Unknown context subcommand. Available: ${available.join(', ')}`,
```

with two file-local helpers: `resolvePhaseCapsules(cwd, phase)` — zero-pad the phase, glob `.planning/phases/<padded>-*/<padded>-CONTEXT.md` via `fs.readdirSync`; `resolveMilestoneFiles(cwd)` — `.planning/MASTER-CONTEXT.md` (if present) + every `NN-CONTEXT.md` under `.planning/phases/*/`. Lazy-require `./context.cjs` inside the route function (learn-router convention).

- [ ] **Step 5: Regenerate + build + pass** — `npm run gen:capability-registry && npm run build:lib && node --test tests/feat-context-router.test.cjs` → PASS.
- [ ] **Step 6: Full suite + commit** — `npm run test:unit; echo "EXIT=$?"` → `EXIT=0`. `git add -A && git commit -m "feat(context): capability manifest + context command family (verify, provenance)"`

### Task 4: Templates (MASTER-CONTEXT, phase capsule, milestone capsule)

**Files:**
- Create: `gsd-core/templates/master-context.md`
- Create: `gsd-core/templates/context-capsule.md`
- Create: `gsd-core/templates/milestone-capsule.md`
- Test: extend `tests/feat-context-core.test.cjs`

**Interfaces:**
- Produces: the three templates Task 5's workflow renders. The capsule template's frontmatter must parse with Task 2's `parseContextProvenance` and its example anchors with `extractAnchors`.

- [ ] **Step 1: Failing test** — append to `tests/feat-context-core.test.cjs`:

```js
test('capsule template parses with core module (provenance + anchor grammar)', () => {
  const tpl = fs.readFileSync(path.resolve(__dirname, '..', 'gsd-core', 'templates', 'context-capsule.md'), 'utf8');
  const p = ctx.parseContextProvenance(tpl);
  assert.ok(p, 'template frontmatter must carry context_provenance');
  assert.ok(ctx.extractAnchors(tpl).length >= 1, 'template must demonstrate the anchor grammar');
  for (const f of ['master-context.md', 'milestone-capsule.md']) {
    assert.ok(fs.existsSync(path.resolve(__dirname, '..', 'gsd-core', 'templates', f)), `${f} missing`);
  }
});
```

Run → FAIL.

- [ ] **Step 2: Write `gsd-core/templates/context-capsule.md`** — frontmatter exactly as the Global Constraints define (placeholders `[N]`, `[date]`, quality default `artifact-distilled`), then the six sections with one-line guidance each and a worked example bullet under Verified Facts: ``- [Claim in one sentence] [anchor: src/example.js:42 "exact substring from the file"]``. Sections: `## Verified Facts`, `## Locked Decisions`, `## Cross-Repo Touchpoints`, `## Phase-Scoped Pitfalls`, `## What Done Looks Like`, `## References`. Close with an HTML comment documenting the append-only layer headings and the supersession rule (later layers override; never delete).
- [ ] **Step 3: Write `gsd-core/templates/master-context.md`** — the eight spec sections (§5.1): header note (written-by/date/re-verify guidance), `## Milestone thesis`, `## Topology`, `## Standing rules`, `## Load-bearing verified facts` (anchor grammar applies here), `## Protect list`, `## Process` (pre-filled with the re-anchor + curation procedure verbatim from the spec §7.2), `## Key references`. Top comment: "INDEX, not archive — target ≤150 lines; overflow into deep docs and point at them from Key references."
- [ ] **Step 4: Write `gsd-core/templates/milestone-capsule.md`** — slim: frontmatter (`milestone: [label]`, `context_provenance` block), `## Why this milestone`, `## Carried-forward decisions & deferrals` (each entry: what, from-phase, why routed here), `## Verified Facts` (anchor grammar), `## Open questions`.
- [ ] **Step 5: Pass + commit** — `node --test tests/feat-context-core.test.cjs` → PASS; `npm run test:unit; echo "EXIT=$?"` → `EXIT=0`. `git add gsd-core/templates/ tests/feat-context-core.test.cjs && git commit -m "feat(context): master-context, phase-capsule, milestone-capsule templates"`

### Task 5: `/gsd:context` skill — workflow + command + registration surfaces

**Files:**
- Create: `gsd-core/workflows/context.md`
- Create: `commands/gsd/context.md`
- Modify: `src/clusters.cts` (register `gsd-context`), `commands/gsd/ns-project.md` (`requires:` + table row), `gsd-core/workflows/help/modes/full.md` (help entry), `docs/INVENTORY.md` + `docs/INVENTORY-MANIFEST.json`, `tests/enh-2790-skill-consolidation.test.cjs` (allowlist)
- Test: `tests/feat-context-skill.test.cjs`

**Interfaces:**
- Consumes: Task 3 CLI verbs, Task 4 templates.
- Produces: the `gsd-context` skill dispatched as `Skill(gsd-context, "<mode> [flags]")`, modes `seed|scout|flush|master`, consumed by Tasks 8, 10, 11 and the hook message text (Task 6).

- [ ] **Step 1: Failing contract test** — `tests/feat-context-skill.test.cjs`:

```js
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

describe('gsd-context skill registration + workflow contract', () => {
  test('workflow exists with the four modes and the seed-quality contract', () => {
    const wf = read('gsd-core/workflows/context.md');
    for (const mode of ['seed', 'scout', 'flush', 'master']) assert.ok(wf.includes(`## Mode: ${mode}`), `mode ${mode} missing`);
    assert.match(wf, /quality:\s*rich \| artifact-distilled \| thin/, 'quality stamping contract');
    assert.match(wf, /never delegate capsule writing to fresh-context agents/i, 'orchestrator-writes-itself rule');
    assert.match(wf, /context verify/, 'seed must verify its own output');
    assert.match(wf, /## Seed refresh/, 'idempotent re-seed appends a layer, never clobbers');
  });
  test('command file + registration surfaces', () => {
    assert.ok(fs.existsSync(path.resolve(__dirname, '..', 'commands/gsd/context.md')));
    assert.match(read('commands/gsd/ns-project.md'), /gsd-context/);
    assert.match(read('gsd-core/workflows/help/modes/full.md'), /context/);
  });
});
```

Run → FAIL.

- [ ] **Step 2: Write `gsd-core/workflows/context.md`** with four `## Mode:` sections:
  - **`## Mode: seed`** (`--milestone` | `--phase <N>`): read ROADMAP.md phases + PROJECT.md + STATE.md + all strategy artifacts + `research/` + investigation docs if present; THE ORCHESTRATOR WRITES CAPSULES ITSELF ("never delegate capsule writing to fresh-context agents — their empty context is the thing this feature exists to fix; where the runtime offers context-inheriting forks you MAY fork per phase, otherwise write sequentially inline"). Render `context-capsule.md` per phase into `{phase_dir}/{padded}-CONTEXT.md`; stamp `quality: rich | artifact-distilled | thin` honestly (decision table in the workflow: rich = this session did substantial verified exploration; artifact-distilled = synthesized from artifacts only; thin = neither). If a CONTEXT.md already exists WITH provenance → append `## Seed refresh (<date>)` layer only. If it exists WITHOUT provenance (plain discuss output) → do not touch; report it. `--milestone` additionally renders `master-context.md` → `.planning/MASTER-CONTEXT.md` when cross-phase content exists (multi-repo `planning.sub_repos`, brownfield Mode, existing investigation/research corpus, or `rich` quality); after writing, run `gsd_run context verify --milestone` and fix anchors that fail at birth. Commit `.planning/` changes.
  - **`## Mode: scout`** (`--phase <N>`): spawn 2–3 explorer subagents ("Explore" type) with a confirm-or-refute prompt over the capsule's Verified Facts; append findings as `## Scout corrections (<date>)` noting "corrections override the corresponding claims above". Offered pre-discussion when provenance is `rich` and older than `context_lifecycle.verify_max_age_commits`.
  - **`## Mode: flush`**: calm knowledge checkpoint — update MASTER-CONTEXT.md (supersede stale entries in place per its curation rules, add new load-bearing facts), enrich the active phase capsule (append layer), `state.record-session`. Explicitly: "this is a checkpoint, not an emergency save; do not stop the user's work."
  - **`## Mode: master`**: curate `.planning/MASTER-CONTEXT.md` — re-bound to ~150 lines, supersede dead facts, push depth into deep docs + Key references, then `gsd_run context verify --milestone`.
  All interactive moments get TEXT_MODE numbered-list fallbacks.
- [ ] **Step 3: Write `commands/gsd/context.md`** — mirror `commands/gsd/roadmap.md`'s structure: `<objective>` (one paragraph + doctrine line), `<execution_context>` `@$HOME/.claude/gsd-core/workflows/context.md`, `<flags>` for the four modes, `<process>` "parse mode token, execute the workflow mode end-to-end".
- [ ] **Step 4: Register across surfaces** — `src/clusters.cts` (add `gsd-context` following `gsd-roadmap`'s entry shape), `ns-project.md` (requires + row: "context — seed/verify/grow durable project knowledge"), help `full.md` row, INVENTORY + manifest regen (follow the repo's inventory regen script if present, else edit both files), consolidation-test allowlist.
- [ ] **Step 5: Pass + commit** — `node --test tests/feat-context-skill.test.cjs` → PASS; `npm run test:unit; echo "EXIT=$?"` → `EXIT=0` (this also proves clusters/consolidation/byte-budget suites accept the new skill). `git add -A && git commit -m "feat(context): /gsd:context skill — seed, scout, flush, master modes"`

### Task 6: Revive the context-monitor hook (calm flush)

**Files:**
- Modify: `hooks/gsd-context-monitor.js` (full rewrite of the no-op body; keep the `gsd-hook-version` header line)
- Test: `tests/feat-context-hook.test.cjs`
- Rebuild: `npm run build:hooks` (refreshes `hooks/dist/`)

**Interfaces:**
- Consumes: statusline bridge file `{os.tmpdir()}/claude-ctx-{session_id}.json` (`used_pct`, `remaining_percentage`, `timestamp`) — already produced by `hooks/gsd-statusline.js`; hook stdin JSON (`session_id`, `cwd`, `hook_event_name`).
- Produces: `hookSpecificOutput.additionalContext` calm flush messages; nothing else.

- [ ] **Step 1: Failing tests** — `tests/feat-context-hook.test.cjs`: spawn the hook with `execFileSync('node', [HOOK], { input: JSON.stringify(payload) })` against a temp `os.tmpdir()` metrics file (write it directly; use a unique fake `session_id` per test; `cleanup` the temp project dir):

```js
// Cases (each asserts on parsed stdout JSON or empty stdout):
// 1. no metrics file → empty stdout, exit 0 (subagent/main discrimination)
// 2. metrics used_pct 50 → empty stdout (below threshold)
// 3. used_pct 91 + .planning/STATE.md present in cwd → additionalContext contains
//    '/gsd:context flush' and 'MASTER-CONTEXT.md'
// 4. used_pct 91, NO .planning in cwd → empty stdout (non-GSD projects get nothing)
// 5. used_pct 91 twice in a row (same session) → second call empty (debounce);
//    used_pct 96 after a 91 → fires despite debounce (escalation)
// 6. hook_event_name 'PreCompact' + .planning present → message contains
//    're-anchor' and 'context verify' (fires regardless of thresholds)
// 7. cwd config .planning/config.json {"context_lifecycle.hook_enabled": false}
//    → empty stdout at 96%
// 8. TONE LINT: for every emitted message across cases, assert none of
//    ['CRITICAL','URGENT','immediately','STOP'] appears
```

Write all eight as real `test()` blocks (build payloads/metrics inline; the debounce state file is `{tmpdir}/claude-ctx-{session_id}-warned.json` — remove it in cleanup). Run → FAIL (current no-op emits nothing for case 3/6).

- [ ] **Step 2: Rewrite the hook** — structure copied from the original implementation (`git show 07f44cc1:hooks/gsd-context-monitor.js` is the reference: stdin drain + 3s timeout guard, session_id → metrics path, stale-metrics check at 60s, debounce file with `callsSinceWarn`/`lastLevel`, escalation bypass), with these deltas:
  - Thresholds on **used_pct**: warn ≥ `hook_warn_pct` (default 90), urge ≥ `hook_urge_pct` (default 95); read overrides + `hook_enabled` from `{cwd}/.planning/config.json` keys `context_lifecycle.*` (try/catch; absent file = defaults).
  - **GSD-active gate:** no `.planning/STATE.md` under `cwd` → exit silently (all events).
  - `hook_event_name === 'PreCompact'` → always emit (if GSD-active + enabled): `"Compaction is coming. Final knowledge flush: append unsaved decisions and discoveries to the current phase capsule and MASTER-CONTEXT.md (run /gsd:context flush). After compaction, the first act is re-anchoring: read MASTER-CONTEXT.md + the phase capsule + the last SUMMARY, then run gsd-tools context verify."`
  - Warn message: `"Context is ${usedPct}% used. Good moment for a knowledge checkpoint: run /gsd:context flush — update MASTER-CONTEXT.md (supersede stale entries), enrich the current phase capsule, and record position in STATE.md. Then carry on."` Urge message: same intro + `"If you haven't flushed yet this session, do it now — knowledge not written down will not survive compaction."`
  - `Stop`/`SubagentStop` events → exit 0 silently.
  - Output shape: `{ hookSpecificOutput: { hookEventName: data.hook_event_name || 'PostToolUse', additionalContext: message } }`.
  - Header comment: state the tone contract and that this deliberately replaces the disabled upstream warning hook (link: `docs/superpowers/specs/2026-07-18-context-lifecycle-design.md`). Never spawn child processes (Windows cwd-lock rule not triggered).
- [ ] **Step 3: Build + pass** — `npm run build:hooks && node --test tests/feat-context-hook.test.cjs` → all 8 PASS.
- [ ] **Step 4: Full suite + commit** — `npm run test:unit; echo "EXIT=$?"` → `EXIT=0`. `git add hooks/ tests/feat-context-hook.test.cjs && git commit -m "feat(context): revive context-monitor as calm knowledge-flush hook"`

### Task 7: discuss-phase — append-never-replace + discussion log

**Files:**
- Modify: `gsd-core/workflows/discuss-phase.md` (anchor: the `write_context` step, "**File location:** ${phase_dir}/${padded_phase}-CONTEXT.md"; and `load_prior_context`)
- Modify: `gsd-core/workflows/discuss-phase/resume.md` (anchor: the "Update it" / "View it" / "Skip" options block)
- Modify: `docs/FORK-PATCHES.json` + `docs/FORK-DELTA.md`
- Test: `tests/feat-context-append.test.cjs`

**Interfaces:**
- Consumes: `gsd-tools context provenance --file` (Task 3).
- Produces: the append contract every capsule consumer relies on.

- [ ] **Step 1: Failing contract test** — `tests/feat-context-append.test.cjs` (workflow-text contract, grep-based like the existing marker-contract tests):

```js
test('discuss-phase honors the capsule append contract', () => {
  const wf = read('gsd-core/workflows/discuss-phase.md');
  assert.match(wf, /context provenance/, 'provenance check before writing');
  assert.match(wf, /## Discussion additions/, 'append layer heading');
  assert.match(wf, /never replace|never overwrite/i);
  const resume = read('gsd-core/workflows/discuss-phase/resume.md');
  assert.match(resume, /context_provenance/, 'resume branch is capsule-aware');
  const dp = read('gsd-core/workflows/discuss-phase.md');
  assert.match(dp, /DISCUSSION-LOG\.md/, 'discussion log wiring');
});
```

Run → FAIL.

- [ ] **Step 2: Patch `resume.md`** — inside the existing-CONTEXT branch, add (FORK:context markers):
  when `gsd_run context provenance --file "$CONTEXT_PATH"` returns non-null, replace the "Update it" semantics with **"Extend it"**: load the capsule, present it to the user as *pre-seeded context* (summarize Verified Facts + Locked Decisions; note its `quality` stamp — `thin`/`artifact-distilled` capsules are starting points, not answers), ask ONLY questions the capsule does not answer, and instruct the write step to APPEND. `--auto` auto-selects Extend. Provenance-null files keep today's behavior byte-identical.
- [ ] **Step 3: Patch `write_context`** in `discuss-phase.md` (FORK:context markers): when extending a capsule, do not rewrite the file — append `## Discussion additions (<date>)` containing the `<decisions>` / `<deferred>` blocks produced by this discussion; prior layers stay byte-identical. Plain (non-capsule) files: unchanged template write.
- [ ] **Step 4: Discussion log** (same markers, config-gated on `context_lifecycle.discussion_logs`): after each Q&A round, append `### <date> — <topic>\nQ: …\nA: …\nRejected/considered: …` to `{phase_dir}/{padded}-DISCUSSION-LOG.md`. One instruction line + format snippet; heavy prose goes to `references/context-lifecycle.md` (Task 13) to protect the byte budget.
- [ ] **Step 5: Manifest** — add to `docs/FORK-PATCHES.json`:
  `{ "path": "gsd-core/workflows/discuss-phase.md", "feature": "context", "mode": "markers", "markers": 2, "anchors": ["## Discussion additions", "DISCUSSION-LOG\\.md"] }` and `{ "path": "gsd-core/workflows/discuss-phase/resume.md", "feature": "context", "mode": "markers", "markers": 1, "anchors": ["context_provenance", "Extend it"] }`. Add both rows to FORK-DELTA.md's patch table.
- [ ] **Step 6: Pass + commit** — new test PASS; `npm run test:unit; echo "EXIT=$?"` → `EXIT=0` (fork-delta guard + byte budgets prove the patches are legal). `git add -A && git commit -m "feat(context): discuss-phase append-never-replace contract + discussion log"`

### Task 8: roadmap — seed offer at the transition (fork-owned, no patch cost)

**Files:**
- Modify: `gsd-core/workflows/roadmap.md` (anchor: Step 5 "Route onward")
- Test: extend `tests/feat-context-append.test.cjs`

**Interfaces:**
- Consumes: `Skill(gsd-context, "seed --milestone …")` (Task 5); config `context_lifecycle.seed_offer`.

- [ ] **Step 1: Failing test** — assert `roadmap.md` matches `/gsd-context.*seed --milestone/` and `/seed_offer/`. Run → FAIL.
- [ ] **Step 2: Insert Step 5.5** between roadmap approval and the route-onward dispatch: read `context_lifecycle.enabled` + `seed_offer`; `off`/disabled → skip silently. `auto` (or `--auto` runs) → `Skill(gsd-context, "seed --milestone --auto")`. `prompt` → one AskUserQuestion ("Seed phase context capsules now, while this session's context is richest? Recommended right after roadmap approval." Yes/Skip; TEXT_MODE numbered fallback). Then continue to the existing discuss-phase dispatch unchanged. Note in the step: seeding quality is stamped honestly — a thin session produces `artifact-distilled` capsules, and that is fine.
- [ ] **Step 3: Pass + commit** — tests PASS; `npm run test:unit; echo "EXIT=$?"` → `EXIT=0`. `git add -A && git commit -m "feat(context): roadmap offers capsule seeding at the strategy->build transition"`

### Task 9: execute-phase — executor + verifier sectional injection

**Files:**
- Modify: `gsd-core/workflows/execute-phase.md` (anchors: the executor spawn `<files_to_read>` block listing "`.planning/adr/*.md, DOMAIN-MODEL.md, TEST-STRATEGY.md`"; and the verifier spawn input list)
- Modify: `docs/FORK-PATCHES.json` + `docs/FORK-DELTA.md`
- Test: extend `tests/feat-context-append.test.cjs`

- [ ] **Step 1: Failing test** — assert `execute-phase.md` matches `/Locked Decisions.*Phase-Scoped Pitfalls|Phase-Scoped Pitfalls.*Locked Decisions/s` (executor slice) and `/What Done Looks Like/` (verifier slice). Run → FAIL.
- [ ] **Step 2: Executor patch** (FORK:context markers) — in the always-read `<files_to_read>` list add: "If `{phase_dir}/{padded}-CONTEXT.md` carries `context_provenance` (check `gsd_run context provenance`), read ONLY its `## Locked Decisions` and `## Phase-Scoped Pitfalls` sections (plus any `## Scout corrections` / `## Orchestrator curation` layers that supersede them) — they bind autonomous deviation the same way the ADR does." The ≥500K full-CONTEXT branch stays unchanged.
- [ ] **Step 3: Verifier patch** (same markers) — verifier spawn inputs gain: "capsule `## What Done Looks Like` section (when provenance present) — acceptance-shaping input alongside roadmap success criteria; it can ADD checks, never remove roadmap criteria."
- [ ] **Step 4: Manifest** — `{ "path": "gsd-core/workflows/execute-phase.md", "feature": "context", "mode": "markers", "markers": 2, "anchors": ["Phase-Scoped Pitfalls", "What Done Looks Like"] }` + FORK-DELTA row.
- [ ] **Step 5: Pass + commit** — tests + `npm run test:unit; echo "EXIT=$?"` → `EXIT=0`. `git add -A && git commit -m "feat(context): executor/verifier sectional capsule injection in execute-phase"`

### Task 10: plan-phase — freshness gate + curation step

**Files:**
- Modify: `gsd-core/workflows/plan-phase.md` (anchors: §4 "Load CONTEXT.md"; the step where planner output returns before the checker spawn)
- Modify: `docs/FORK-PATCHES.json` + `docs/FORK-DELTA.md`
- Test: extend `tests/feat-context-append.test.cjs`

- [ ] **Step 1: Failing test** — assert plan-phase matches `/context verify/` and `/## Orchestrator curation/`. Run → FAIL.
- [ ] **Step 2: Freshness gate** (FORK:context markers) — in §4, after resolving `context_path`: if provenance non-null AND `git rev-list --count --since="<provenance.date>" HEAD` > `context_lifecycle.verify_max_age_commits` → run `gsd_run context verify --file "$context_path"`; if `stale+missing > 0`, print the STALE summary and instruct: "STALE-annotated claims are untrusted — the planner must not build on them without re-verification (they are visibly marked in the file)." Deterministic bash condition; never blocks, always annotates (mirror of the §1.6 gate pattern).
- [ ] **Step 3: Curation step** (same markers) — after planner output returns and before the checker spawn: if `context_lifecycle.curation` is true AND provenance non-null → "Return control to the orchestrator: review the plan(s) against MASTER-CONTEXT.md and the capsule (topology, standing rules, protect list, locked decisions). Append corrections/re-boundings as `## Orchestrator curation (<date>)` to the capsule. Only then spawn the checker." Config false or no capsule → skip silently (today's flow).
- [ ] **Step 4: Manifest** — `{ "path": "gsd-core/workflows/plan-phase.md", "feature": "context", "mode": "markers", "markers": 2, "anchors": ["context verify", "## Orchestrator curation"] }` + FORK-DELTA row.
- [ ] **Step 5: Pass + commit** — tests + `npm run test:unit; echo "EXIT=$?"` → `EXIT=0`. `git add -A && git commit -m "feat(context): plan-phase capsule freshness gate + orchestrator curation step"`

### Task 11: resume-project — the re-anchor step

**Files:**
- Modify: `gsd-core/workflows/resume-project.md` (anchor: the `load_state` step reading STATE.md + PROJECT.md)
- Modify: `docs/FORK-PATCHES.json` + `docs/FORK-DELTA.md`
- Test: extend `tests/feat-context-append.test.cjs`

- [ ] **Step 1: Failing test** — assert resume-project matches `/MASTER-CONTEXT\.md/` and `/context verify/`. Run → FAIL.
- [ ] **Step 2: Patch** (FORK:context markers) — immediately after `load_state`: "Re-anchor (when `.planning/MASTER-CONTEXT.md` exists and `context_lifecycle.enabled`): read MASTER-CONTEXT.md, the active phase's capsule (`gsd_run context provenance` to confirm), and the last completed phase's SUMMARY. Then `gsd_run context verify --phase <active>` and spot-check anything STALE-annotated before continuing. This is the standing first act of any resumed or post-compaction session." Absent MASTER file → skip silently.
- [ ] **Step 3: Manifest** — `{ "path": "gsd-core/workflows/resume-project.md", "feature": "context", "mode": "markers", "markers": 1, "anchors": ["MASTER-CONTEXT\\.md", "re-anchor"] }` (case-insensitive anchor via `[Rr]e-anchor`) + FORK-DELTA row.
- [ ] **Step 4: Pass + commit** — tests + `npm run test:unit; echo "EXIT=$?"` → `EXIT=0`. `git add -A && git commit -m "feat(context): re-anchor step in resume-project"`

### Task 12: Forward routing — transition promotion, milestone capsules

**Files:**
- Modify: `gsd-core/workflows/transition.md` (anchor: the decisions-extraction step "extracts decisions from SUMMARYs")
- Modify: `gsd-core/workflows/complete-milestone.md` (anchor: the acknowledge step writing "STATE.md `## Deferred Items`")
- Modify: `gsd-core/workflows/new-milestone.md` (anchor: its initialization/context-loading step)
- Modify: `docs/FORK-PATCHES.json` + `docs/FORK-DELTA.md`
- Test: extend `tests/feat-context-append.test.cjs`

- [ ] **Step 1: Failing tests** — assert: transition matches `/MASTER-CONTEXT\.md/`; complete-milestone matches `/milestones\/next\/.*-CAPSULE\.md/`; new-milestone matches `/-CAPSULE\.md/`. Run → FAIL.
- [ ] **Step 2: transition patch** (FORK:context markers) — after decisions extraction: "When MASTER-CONTEXT.md exists: promote master-worthy discoveries from this phase's SUMMARY (deviations, new invariants, disproven assumptions) into `## Load-bearing verified facts` (with anchors) or `## Standing rules`; append forward-relevant items to later-phase capsules as an `## Orchestrator curation` layer entry."
- [ ] **Step 3: complete-milestone patch** (markers) — in the acknowledge/deferral step: "Offer routing each acknowledged deferral into `.planning/milestones/next/<label>-CAPSULE.md` (create from `milestone-capsule.md` template if absent) so the next milestone's opening inherits it — in addition to the STATE.md Deferred Items entry."
- [ ] **Step 4: new-milestone patch** (markers) — early step: "If `.planning/milestones/next/<label>-CAPSULE.md` matches this milestone, read it and fold its carried-forward decisions/deferrals into the milestone's context; mark the capsule consumed by moving it to `.planning/milestones/consumed/`."
- [ ] **Step 5: Manifest** — three entries (`transition.md` markers:1 anchors `["MASTER-CONTEXT\\.md"]`; `complete-milestone.md` markers:1 anchors `["-CAPSULE\\.md"]`; `new-milestone.md` markers:1 anchors `["milestones/next", "-CAPSULE\\.md"]`) + FORK-DELTA rows.
- [ ] **Step 6: Pass + commit** — tests + `npm run test:unit; echo "EXIT=$?"` → `EXIT=0`. `git add -A && git commit -m "feat(context): phase-end promotion + cross-milestone capsule routing"`

### Task 13: Elicitation capture — new-project + strategy discussion logs + reference doc

**Files:**
- Create: `gsd-core/references/context-lifecycle.md`
- Modify: `gsd-core/workflows/new-project.md` (anchor: the deep-questioning Step 3 loop)
- Modify: `gsd-core/workflows/{model-domain,recommend-architecture,security-strategy,testing-strategy,frontend-architecture,infrastructure-strategy,cicd-strategy,legacy-inventory,discover-product}.md` (anchor per file: its elicitation/AskUserQuestion section)
- Modify: `docs/FORK-PATCHES.json` + `docs/FORK-DELTA.md`
- Test: extend `tests/feat-context-append.test.cjs`

- [ ] **Step 1: Failing test** — loop the nine strategy workflows + new-project, asserting each matches `/PROJECT-DISCUSSION-LOG\.md/`; assert the reference doc exists and contains `plans are perishable`. Run → FAIL.
- [ ] **Step 2: Write `gsd-core/references/context-lifecycle.md`** — the spec §13 doc: doctrine, when to seed, capsule-vs-plan table, layer headings + supersession rule, anchor grammar + `[STALE]` semantics, quality stamps table, the re-anchor procedure, the discussion-log format block (quoted once here, referenced from workflows), multi-runtime degradation table (hook runtimes vs manual-procedure runtimes).
- [ ] **Step 3: Patch each workflow** with ONE marked line after its elicitation loop: `<!-- FORK:context BEGIN -->` `After each elicitation round (config context_lifecycle.discussion_logs): append the round to .planning/PROJECT-DISCUSSION-LOG.md per the format in references/context-lifecycle.md.` `<!-- FORK:context END -->` (one-liner deliberately, for byte budgets).
- [ ] **Step 4: Manifest** — ten `mode: "markers", markers: 1, anchors: ["PROJECT-DISCUSSION-LOG\\.md"]` entries + FORK-DELTA rows + FORK-DELTA additive-files rows for the reference doc.
- [ ] **Step 5: Pass + commit** — tests + `npm run test:unit; echo "EXIT=$?"` → `EXIT=0` (byte budgets green — the one-liner pattern exists for this). `git add -A && git commit -m "feat(context): elicitation discussion logs + context-lifecycle reference doc"`

### Task 14: Enforcement — verifier strategy set + researcher ADR path

**Files:**
- Modify: `agents/gsd-verifier.md` (anchor: the strategy-fit gate line naming `FRONTEND-ARCHITECTURE.md` + `SECURITY-STRATEGY.md` "honor when present")
- Modify: `agents/gsd-phase-researcher.md` (anchor: its FORK:fidelity literal-sources block "read those literal sources first")
- Modify: `docs/FORK-PATCHES.json` + `docs/FORK-DELTA.md`
- Test: `tests/feat-context-enforcement.test.cjs`

- [ ] **Step 1: Failing tests** — `tests/feat-context-enforcement.test.cjs`: (a) `gsd-verifier.md` strategy-fit section must name all four of `DOMAIN-MODEL.md`, `TEST-STRATEGY.md`, `FRONTEND-ARCHITECTURE.md`, `SECURITY-STRATEGY.md`; (b) `gsd-phase-researcher.md` must match `/\.planning\/adr\//` and `/DOMAIN-MODEL\.md/`. Run → FAIL.
- [ ] **Step 2: Verifier patch** (FORK:context markers) — extend the strategy-fit gate: "also honor `.planning/DOMAIN-MODEL.md` (subdomain classification — implemented code must not silently reclassify a core subdomain's approach) and `.planning/TEST-STRATEGY.md` (per-subdomain test levels — the phase's tests must sit at the strategy's levels) when present. A violation is a gap, same severity as the FE/security fit checks."
- [ ] **Step 3: Researcher patch** (FORK:context markers) — inputs gain: "Read the latest `.planning/adr/*.md` and `.planning/DOMAIN-MODEL.md` if they exist BEFORE researching: recommendations must fit the decided rung and subdomain types; if research argues for breaking a rung, flag it explicitly — never silently contradict the ADR."
- [ ] **Step 4: Manifest** — `{ "path": "agents/gsd-verifier.md", "feature": "context", "mode": "markers", "markers": 1, "anchors": ["DOMAIN-MODEL\\.md", "TEST-STRATEGY\\.md"] }`, `{ "path": "agents/gsd-phase-researcher.md", "feature": "context", "mode": "markers", "markers": 1, "anchors": ["\\.planning/adr/"] }` + FORK-DELTA rows (both files already carry other-feature entries — one entry per (path, feature) is the manifest rule).
- [ ] **Step 5: Pass + commit** — tests + `npm run test:unit; echo "EXIT=$?"` → `EXIT=0`. `git add -A && git commit -m "feat(context): verifier strategy-set alignment + researcher ADR grounding"`

### Task 15: Enforcement — grounding `recommended`-row hole

**Files:**
- Modify: `src/grounding.cts` (anchor: the `recommended` branch in `resolveRequiredSources` pushing to `pending` + warning)
- Test: extend `tests/feat-grounding-gate.test.cjs`

**Interfaces:**
- Changes: `resolveRequiredSources` — a Strategy-Plan step with `status === 'recommended'` whose artifact file EXISTS on disk now lands in `required` (with a `notes` entry: "artifact exists but Strategy Plan row is unflipped — run `gsd-tools project strategy-done <step>`"). `recommended` + file absent stays a pending warning. `skipped` unchanged.

- [ ] **Step 1: Failing test** — in `tests/feat-grounding-gate.test.cjs`, build a temp project where PROJECT.md's `## Strategy Plan` marks `model-domain` as `recommended` and `.planning/DOMAIN-MODEL.md` exists; assert `resolveRequiredSources(dir).required` includes the DOMAIN-MODEL entry and the note mentions `strategy-done`; assert `recommended` + missing file stays out of `required`. Run → FAIL.
- [ ] **Step 2: Implement** — in the `recommended` branch (`// FORK:context` comment): file exists → push to `required` with the note; else keep today's pending/warning path.
- [ ] **Step 3: Build + pass** — `npm run build:lib && node --test tests/feat-grounding-gate.test.cjs` → PASS (existing cases must still pass — the change is additive to `required`, so re-run the whole file).
- [ ] **Step 4: Full suite + commit** — `npm run test:unit; echo "EXIT=$?"` → `EXIT=0`. `git add -A && git commit -m "fix(context): existing-but-unflipped strategy artifacts become required grounding sources"`

### Task 16: Enforcement — deviations in SUMMARY frontmatter

**Files:**
- Modify: `gsd-core/templates/summary.md` (anchor: the frontmatter guidance block)
- Modify: `agents/gsd-executor.md` (anchor: the deviation-tracking rule "Track all deviations for Summary")
- Modify: `docs/FORK-PATCHES.json` + `docs/FORK-DELTA.md`
- Test: extend `tests/feat-context-enforcement.test.cjs`

- [ ] **Step 1: Failing test** — assert `templates/summary.md` contains a `deviations:` frontmatter example with `rule`, `what`, `why` keys; assert `gsd-executor.md` matches `/deviations:.*frontmatter|frontmatter.*deviations:/s`. Run → FAIL.
- [ ] **Step 2: Template patch** (anchors-only mode — frontmatter edit): add to the frontmatter example + guidance:

```yaml
deviations:  # structured mirror of ## Deviations from Plan — REQUIRED whenever that section is non-empty
  - rule: "2"          # deviation rule number
    what: "added missing config validation"
    why: "plan assumed it existed"
```

with the guidance line: "frontmatter-only readers (the default-budget planner) see ONLY this — the prose section is invisible to them; an empty prose section means this key is omitted."
- [ ] **Step 3: Executor patch** (`FORK:context` markers beside the existing FORK:fidelity blocks): the summary-writing instruction adds "mirror every `## Deviations from Plan` entry into the `deviations:` frontmatter list (rule/what/why)."
- [ ] **Step 4: Manifest** — `{ "path": "gsd-core/templates/summary.md", "feature": "context", "mode": "anchors-only", "anchors": ["deviations:"] }`, extend/add the `gsd-executor.md` context entry (markers +1, anchor `"deviations:"`) + FORK-DELTA rows.
- [ ] **Step 5: Pass + commit** — tests + `npm run test:unit; echo "EXIT=$?"` → `EXIT=0`. `git add -A && git commit -m "feat(context): structured deviations frontmatter — phase N reality visible to phase N+1"`

### Task 17: Docs, changeset, E2E simulation, final gate

**Files:**
- Modify: `README.md` (feature list — "What this fork adds" section), `docs/FORK-DELTA.md` (final sweep: all context rows present)
- Create: `.changeset/context-lifecycle.md`
- Create: `docs/superpowers/plans/2026-07-18-context-e2e-simulation.md` (the run-book)

- [ ] **Step 1: README + FORK-DELTA sweep** — add the context capability to the fork-features list (one paragraph, doctrine line included); verify every task's FORK-DELTA row landed (`grep -c '"feature": "context"' docs/FORK-PATCHES.json` should be ≥ 18 across Tasks 7–16; reconcile any gap).
- [ ] **Step 2: Changeset** — `npm run changeset` (or write the file directly): `type: Changed`, one-paragraph entry: "New `context` capability — the knowledge lifecycle: MASTER-CONTEXT index, quality-stamped phase capsules, append-only layers, `gsd-tools context verify`, calm context-pressure flush hook, re-anchor procedure, enforcement alignment (verifier strategy set, grounding unflipped-row fix, researcher ADR grounding, structured deviations frontmatter). Capability ids de-branded: `rocket-learn`→`learn`, `rocket-strategy`→`strategy`, `rocket-grounding`→`grounding`." (Release-transient file — never in the guarded additive set.)
- [ ] **Step 3: Write the E2E simulation run-book** (`docs/superpowers/plans/2026-07-18-context-e2e-simulation.md`) — the subagent-driven realistic validation to execute after implementation, on a scratch fixture project: (1) scripted `--auto` run new-project→strategy→roadmap with `seed_offer: auto`; assert capsules + provenance exist, `context verify --milestone` all-ok; (2) tamper one anchor fact in a source file; `context verify` → STALE annotation appears; (3) drive discuss-phase on the seeded phase; assert prior layers byte-identical + `## Discussion additions` appended; (4) plan-phase; assert planner output references capsule Locked Decisions and curation layer appears; (5) simulate the hook (inject 91% metrics file, fire PostToolUse) → flush message; run flush mode; (6) fresh session → resume-work; assert the re-anchor reads happen. Each step lists the exact commands/Skill dispatches and the assertion greps.
- [ ] **Step 4: Final gate** — `npm run lint && npm run test:unit; echo "EXIT=$?"` → `EXIT=0`; `grep -rn "rocket-" --include="*.cts" --include="*.cjs" --include="*.json" --include="*.md" src/ capabilities/ gsd-core/ commands/ tests/ | grep -vi therocketcode` → empty.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "docs(context): README feature entry, changeset, E2E simulation run-book"`

---

## Plan Self-Review (performed at write time)

- **Spec coverage:** §3 naming → Task 1; §5 artifacts → Tasks 4, 5; §6 commands → Tasks 3, 5; §7.1 capture → Tasks 8, 12, 13 + hook 6; §7.2 deliver → Tasks 7, 9, 11 (+ free planning-pipeline path, no task needed by design); §7.3 verify → Tasks 2, 3, 10; §7.4 grow → Tasks 10, 12, 16; §8 hook → Task 6; §9 enforcement → Tasks 14, 15, 16; §10 config → Task 3; §12 testing → per-task tests + Task 17 run-book; §13 docs → Tasks 13, 17. No uncovered spec section.
- **Placeholder scan:** no TBD/TODO; all code steps carry code; workflow patches carry the actual instruction text or a locked format.
- **Type consistency:** `parseContextProvenance`/`verifyContextFile` signatures match between Tasks 2 and 3; config keys match between Tasks 3, 6, 8, 10, 13; layer headings and anchor grammar are locked once in Global Constraints and referenced verbatim.
