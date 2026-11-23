"use strict";
/**
 * Project — PROJECT.md section query operations (Mode, Strategy Plan, skip-ledger).
 *
 * Structured, placeholder-aware reads of PROJECT.md's `## Mode` and `## Strategy Plan`
 * sections — replacing the fragile inline `sed`/`grep` reads in the strategy workflows.
 * The key advantage over grep: `is_placeholder` distinguishes a FILLED value (e.g.
 * `brownfield-extend`) from the unfilled template enum placeholder
 * (`[greenfield | brownfield-extend | rewrite/refactor]`), which grep cannot.
 *
 * ADR-457 build-at-publish: TypeScript source of truth; compiled to a gitignored
 * gsd-core/bin/lib/project.cjs at pack/test time.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
// FORK: re-homed in the v2.0.0 realignment — upstream retired the core.cjs
// re-export spine (epic #1267); output()/error() now live in io.cjs.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const io = require("./io.cjs");
const { output, error } = io;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const planningWorkspace = require("./planning-workspace.cjs");
const { planningDir } = planningWorkspace;
// eslint-disable-next-line @typescript-eslint/no-require-imports -- onboard-projection.cjs is an export= CommonJS module
const onboardProjection = require("./onboard-projection.cjs");
const { listCodebaseMapFiles, REQUIRED_CODEBASE_MAP_FILES } = onboardProjection;
const shell_command_projection_cjs_1 = require("./shell-command-projection.cjs");
const text_lines_cjs_1 = require("./text-lines.cjs");
/**
 * The step names a `## Strategy Plan` row may carry: the canonical strategy spine
 * (gsd-core/references/strategy-flow.md, "Canonical spine") plus `map-codebase`,
 * the brownfield-extend exploration strategy-flow.md prepends. Each is a shipped
 * `gsd-<name>` skill. tests/project-query-verbs.test.cjs keeps this in step with
 * the spine line.
 */
const KNOWN_STRATEGY_STEPS = new Set([
    'legacy-inventory',
    'discover-product',
    'model-domain',
    'recommend-architecture',
    'security-strategy',
    'frontend-architecture',
    'testing-strategy',
    'infrastructure-strategy',
    'cicd-strategy',
    'map-codebase',
]);
const STEP_NAME_RE = /^[a-z][a-z0-9-]*$/;
function isValidStrategyStep(step) {
    return STEP_NAME_RE.test(step) && KNOWN_STRATEGY_STEPS.has(step);
}
// ─── Helpers ────────────────────────────────────────────────────────────────────
/**
 * Extract a `## <name>` section's body (anchored — `^## name$` to the next `^## `).
 * This is the robust form of the workflows' `sed -n '/## name/,/^## /p'`.
 */
function extractSection(content, sectionName) {
    const lines = (0, text_lines_cjs_1.splitLines)(content);
    let capturing = false;
    const result = [];
    const headingPattern = new RegExp(`^##\\s+${sectionName}\\s*$`);
    for (const line of lines) {
        if (headingPattern.test(line)) {
            capturing = true;
            continue;
        }
        if (capturing && /^##\s/.test(line))
            break;
        if (capturing)
            result.push(line);
    }
    return result.length > 0 ? result.join('\n') : null;
}
/** Strip a trailing HTML comment and surrounding whitespace from a field value. */
function cleanFieldValue(value) {
    return value.replace(/<!--[\s\S]*?-->/g, '').trim();
}
/** A value is a template placeholder if it still looks like `[a | b | c]`. */
function isPlaceholderValue(value) {
    if (!value)
        return false;
    return /^\[.*\]$/.test(value.trim());
}
/** Pull `- **Field:** value` from a Mode section body. Anchored to line-start (a bullet)
 *  so it can't accidentally match a field-like phrase nested elsewhere in the section. */
function matchModeField(section, field) {
    const re = new RegExp(`^\\s*[-*]?\\s*\\*\\*${field}:\\*\\*\\s*(.+)`, 'im');
    const m = section.match(re);
    return m ? cleanFieldValue(m[1]) : null;
}
/**
 * Parse the skip-ledger lines of a Strategy Plan section body into a map keyed by
 * the lower-cased skill name. Ledger lines look like `- <skill> — skipped (<reason>, <date>)`
 * (the em-dash separator matches what strategy-flow.md / the template prescribe).
 * Single owner of the ledger grammar: `strategy-skipped` and `strategy-plan` (#86)
 * both read through it, so the two verbs can never disagree about a skip.
 */
function parseSkipLedger(section) {
    const ledger = new Map();
    for (const line of section.split('\n')) {
        const m = line.match(/^\s*-\s*([^—|]+?)\s*—\s*skipped\s*\((.*)\)\s*$/i);
        if (!m)
            continue;
        const key = m[1].trim().toLowerCase();
        if (ledger.has(key))
            continue; // first line wins (matches the pre-#86 scan order)
        const inner = m[2].trim();
        // Split a trailing date (YYYY-MM-DD) off the reason if present.
        const dateMatch = inner.match(/,\s*(\d{4}-\d{2}-\d{2})\s*$/);
        const date = dateMatch ? dateMatch[1] : null;
        const reason = dateMatch ? inner.slice(0, dateMatch.index).trim() : inner;
        ledger.set(key, { reason, date });
    }
    return ledger;
}
/**
 * #92: PROJECT.md is SHARED across workstreams — it lives at the planning root
 * (gsd-core/references/workstream-flag.md), never under `.planning/workstreams/<ws>/`.
 * `planningPaths(cwd).project` is workstream-scoped, so under an active workstream
 * (GSD_WORKSTREAM / `--ws`) every verb here used to return found:false. This calls
 * upstream's own shared-root rule — the exact expression init.new-milestone uses
 * for `project_path` (`planningDir(cwd, null)` suppresses the workstream segment
 * and still honours GSD_PROJECT) — for readers and the strategy-done writer alike.
 */
function projectMdPath(cwd) {
    return node_path_1.default.join(planningDir(cwd, null), 'PROJECT.md');
}
function readProjectContent(cwd) {
    const projectPath = projectMdPath(cwd);
    if (!node_fs_1.default.existsSync(projectPath))
        return null;
    try {
        return node_fs_1.default.readFileSync(projectPath, 'utf-8');
    }
    catch {
        return null;
    }
}
// ─── project.mode ───────────────────────────────────────────────────────────────
function cmdProjectMode(cwd, raw) {
    const content = readProjectContent(cwd);
    const empty = {
        found: false, origin: null, design_input: null, code_quality: null,
        combination: null, is_placeholder: false, has_provided_design: false,
    };
    if (content === null) {
        output(empty, raw, '');
        return;
    }
    const rawSection = extractSection(content, 'Mode');
    if (rawSection === null) {
        output(empty, raw, '');
        return;
    }
    // Mode fields are always top-level bullets — ignore any nested subheading (### …) so a
    // field-like line under a subsection can't leak into the parse.
    const section = rawSection.split(/\n#{3,}\s/)[0];
    const origin = matchModeField(section, 'Origin');
    const design_input = matchModeField(section, 'Design input');
    const code_quality = matchModeField(section, 'Code-quality baseline');
    const combination = matchModeField(section, 'Combination');
    // The Mode block is "unfilled" when its primary axis is still the bracket placeholder.
    const is_placeholder = isPlaceholderValue(origin) || (origin === null && isPlaceholderValue(design_input));
    // A provided design is present only when Design input is FILLED and not "none".
    const has_provided_design = design_input !== null &&
        !isPlaceholderValue(design_input) &&
        !/^none\b/i.test(design_input.trim()) &&
        design_input.trim().length > 0;
    output({ found: true, origin, design_input, code_quality, combination, is_placeholder, has_provided_design }, raw, has_provided_design ? 'has_provided_design' : (is_placeholder ? 'placeholder' : (origin || '')));
}
// ─── project.strategy-plan ──────────────────────────────────────────────────────
/**
 * matrix1201-B F3: `map-codebase` is upstream's workflow and never runs `strategy-done`, so
 * its row would stay `recommended` after mapping and /gsd-next would route back to it. The
 * step is satisfied by its artifact: a complete codebase map (the same seven documents
 * new-project's `has_codebase_map` counts) reads as `done`. Read-only: PROJECT.md is untouched.
 */
function stepStatus(cwd, step, status) {
    if (step !== 'map-codebase' || /^(done|skipped)$/i.test(status))
        return status;
    return listCodebaseMapFiles(cwd).length === REQUIRED_CODEBASE_MAP_FILES.length ? 'done' : status;
}
/**
 * The filled `| Step | Status |` rows of a Strategy Plan section, in order. Skips
 * the header, separator, and bracketed placeholder rows
 * (`| [model-domain] | [recommended] |`). Taking the first two cells is robust to
 * a stray extra column (off-spec but harmless).
 */
function parseStrategyRows(section) {
    const rows = [];
    for (const line of section.split('\n')) {
        if (!line.trim().startsWith('|'))
            continue;
        const cells = line.split('|').slice(1, -1).map((c) => c.trim());
        if (cells.length < 2)
            continue;
        const [step, status] = cells;
        if (/^step$/i.test(step) || /^-+$/.test(step))
            continue; // header / separator
        if (/^\[.*\]$/.test(step) || /^\[.*\]$/.test(status))
            continue; // unfilled placeholder
        rows.push({ step, status });
    }
    return rows;
}
function cmdProjectStrategyPlan(cwd, raw) {
    const content = readProjectContent(cwd);
    const empty = {
        found: false, archetype: null, recommended_path: null, steps: [], next_recommended: null,
    };
    if (content === null) {
        output(empty, raw, '');
        return;
    }
    const section = extractSection(content, 'Strategy Plan');
    if (section === null) {
        output(empty, raw, '');
        return;
    }
    const archMatch = section.match(/\*\*Archetype:\*\*\s*(.+)/i);
    const archetype = archMatch ? cleanFieldValue(archMatch[1]) : null;
    const pathMatch = section.match(/\*\*Recommended path:\*\*\s*(.+)/i);
    const recommended_path = pathMatch ? cleanFieldValue(pathMatch[1]) : null;
    const ledger = parseSkipLedger(section);
    const steps = [];
    for (const { step, status } of parseStrategyRows(section)) {
        const skipped = /^skipped$/i.test(status) || ledger.has(step.toLowerCase());
        steps.push({ step, status: stepStatus(cwd, step, status), skipped, invalid: !isValidStrategyStep(step) });
    }
    // #86: a ledgered skip is a decision — never the next target, even though its
    // row keeps the `recommended` status it was planned with. matrix119-A F9: an
    // invalid step name is never the next target either.
    const next = steps.find((s) => /^recommended$/i.test(s.status) && !s.skipped && !s.invalid);
    const next_recommended = next ? next.step : null;
    output({ found: true, archetype, recommended_path, steps, next_recommended }, raw, next_recommended || '');
}
// ─── project.strategy-skipped ───────────────────────────────────────────────────
/**
 * Is `<skill>` skipped? A skip-ledger line (with its reason and date) or a
 * Strategy Plan row whose own Status is `skipped` (reason/date null) — the same
 * two signals `strategy-plan` reads, so the two verbs agree.
 */
function cmdProjectStrategySkipped(cwd, skill, raw) {
    const target = (skill || '').trim();
    const empty = {
        found: false, skill: target, skipped: false, reason: null, date: null,
    };
    if (!target) {
        error('project strategy-skipped requires a <skill> argument');
        return;
    }
    const content = readProjectContent(cwd);
    if (content === null) {
        output(empty, raw, 'false');
        return;
    }
    const section = extractSection(content, 'Strategy Plan');
    if (section === null) {
        output({ ...empty, found: true }, raw, 'false');
        return;
    }
    const entry = parseSkipLedger(section).get(target.toLowerCase());
    if (entry) {
        output({ found: true, skill: target, skipped: true, reason: entry.reason, date: entry.date }, raw, 'true');
        return;
    }
    // matrix1210-B F3: a row whose own Status is `skipped` is a skip too, the same
    // rule strategy-plan applies (#86), even without a ledger line (no reason/date).
    if (parseStrategyRows(section).some((r) => r.step.toLowerCase() === target.toLowerCase() && /^skipped$/i.test(r.status))) {
        output({ found: true, skill: target, skipped: true, reason: null, date: null }, raw, 'true');
        return;
    }
    output({ found: true, skill: target, skipped: false, reason: null, date: null }, raw, 'false');
}
// ─── project.strategy-done ──────────────────────────────────────────────────────
/**
 * Deterministic WRITE verb: flip a `## Strategy Plan` table row's status to `done`.
 *
 * Closes the Strategy-Plan lifecycle loop (issue #21 P0-1): every strategy skill
 * calls this at its commit step. Without the flip, rows stay `recommended` forever,
 * `query grounding required` returns [] and the grounding gate passes vacuously.
 *
 * Contract:
 *   - idempotent — an already-`done` row reports { changed: false } and does not rewrite
 *   - unknown step / placeholder-only table / missing PROJECT.md → hard error
 *     (a write verb must not no-op silently: the caller believes the flip happened)
 */
function cmdProjectStrategyDone(cwd, step, raw) {
    const target = (step || '').trim();
    if (!target) {
        error('project strategy-done requires a <step> argument');
        return;
    }
    const projectPath = projectMdPath(cwd);
    if (!node_fs_1.default.existsSync(projectPath)) {
        error('project strategy-done: .planning/PROJECT.md not found');
        return;
    }
    const content = node_fs_1.default.readFileSync(projectPath, 'utf-8');
    const section = extractSection(content, 'Strategy Plan');
    if (section === null) {
        error('project strategy-done: PROJECT.md has no ## Strategy Plan section');
        return;
    }
    // Rewrite line-by-line, but only inside the Strategy Plan section, so a
    // same-named row in another table elsewhere in PROJECT.md can never be touched.
    const lines = (0, text_lines_cjs_1.splitLines)(content);
    let inSection = false;
    let matched = false;
    let changed = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^##\s+Strategy Plan\s*$/.test(line)) {
            inSection = true;
            continue;
        }
        if (inSection && /^##\s/.test(line))
            break;
        if (!inSection || !line.trim().startsWith('|'))
            continue;
        const cells = line.split('|').slice(1, -1).map((c) => c.trim());
        if (cells.length < 2)
            continue;
        const [stepCell, statusCell] = cells;
        if (/^step$/i.test(stepCell) || /^:?-+:?$/.test(stepCell))
            continue; // header / separator
        if (/^\[.*\]$/.test(stepCell) || /^\[.*\]$/.test(statusCell))
            continue; // unfilled placeholder
        if (stepCell.toLowerCase() !== target.toLowerCase())
            continue;
        matched = true;
        if (statusCell.toLowerCase() === 'done')
            break; // idempotent no-op
        // Preserve any extra columns; only the Status cell changes.
        const newCells = [...cells];
        newCells[1] = 'done';
        lines[i] = `| ${newCells.join(' | ')} |`;
        changed = true;
        break;
    }
    if (!matched) {
        error(`project strategy-done: step "${target}" not found in ## Strategy Plan`);
        return;
    }
    if (changed) {
        (0, shell_command_projection_cjs_1.platformWriteSync)(projectPath, lines.join('\n'));
    }
    output({ found: true, step: target, status: 'done', changed }, raw, changed ? 'done' : 'already-done');
}
module.exports = {
    cmdProjectMode,
    cmdProjectStrategyPlan,
    cmdProjectStrategySkipped,
    cmdProjectStrategyDone,
};
