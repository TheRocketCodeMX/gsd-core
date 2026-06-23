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

import fs from 'node:fs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import core = require('./core.cjs');
const { output, error } = core;
// eslint-disable-next-line @typescript-eslint/no-require-imports
import planningWorkspace = require('./planning-workspace.cjs');
const { planningPaths } = planningWorkspace;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModeResult {
  found: boolean;
  origin: string | null;
  design_input: string | null;
  code_quality: string | null;
  combination: string | null;
  is_placeholder: boolean;
  has_provided_design: boolean;
}

interface StrategyStep {
  step: string;
  status: string;
}

interface StrategyPlanResult {
  found: boolean;
  archetype: string | null;
  recommended_path: string | null;
  steps: StrategyStep[];
  next_recommended: string | null;
}

interface StrategySkippedResult {
  found: boolean;
  skill: string;
  skipped: boolean;
  reason: string | null;
  date: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Extract a `## <name>` section's body (anchored — `^## name$` to the next `^## `).
 * This is the robust form of the workflows' `sed -n '/## name/,/^## /p'`.
 */
function extractSection(content: string, sectionName: string): string | null {
  const lines = content.split('\n');
  let capturing = false;
  const result: string[] = [];
  const headingPattern = new RegExp(`^##\\s+${sectionName}\\s*$`);
  for (const line of lines) {
    if (headingPattern.test(line)) {
      capturing = true;
      continue;
    }
    if (capturing && /^##\s/.test(line)) break;
    if (capturing) result.push(line);
  }
  return result.length > 0 ? result.join('\n') : null;
}

/** Strip a trailing HTML comment and surrounding whitespace from a field value. */
function cleanFieldValue(value: string): string {
  return value.replace(/<!--[\s\S]*?-->/g, '').trim();
}

/** A value is a template placeholder if it still looks like `[a | b | c]`. */
function isPlaceholderValue(value: string | null): boolean {
  if (!value) return false;
  return /^\[.*\]$/.test(value.trim());
}

/** Pull `- **Field:** value` from a Mode section body. Anchored to line-start (a bullet)
 *  so it can't accidentally match a field-like phrase nested elsewhere in the section. */
function matchModeField(section: string, field: string): string | null {
  const re = new RegExp(`^\\s*[-*]?\\s*\\*\\*${field}:\\*\\*\\s*(.+)`, 'im');
  const m = section.match(re);
  return m ? cleanFieldValue(m[1]) : null;
}

function readProjectContent(cwd: string): string | null {
  const projectPath = planningPaths(cwd).project;
  if (!fs.existsSync(projectPath)) return null;
  try {
    return fs.readFileSync(projectPath, 'utf-8');
  } catch {
    return null;
  }
}

// ─── project.mode ───────────────────────────────────────────────────────────────

function cmdProjectMode(cwd: string, raw: boolean): void {
  const content = readProjectContent(cwd);
  const empty: ModeResult = {
    found: false, origin: null, design_input: null, code_quality: null,
    combination: null, is_placeholder: false, has_provided_design: false,
  };
  if (content === null) { output(empty, raw, ''); return; }

  const rawSection = extractSection(content, 'Mode');
  if (rawSection === null) { output(empty, raw, ''); return; }
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
  const has_provided_design =
    design_input !== null &&
    !isPlaceholderValue(design_input) &&
    !/^none\b/i.test(design_input.trim()) &&
    design_input.trim().length > 0;

  output(
    { found: true, origin, design_input, code_quality, combination, is_placeholder, has_provided_design },
    raw,
    has_provided_design ? 'has_provided_design' : (is_placeholder ? 'placeholder' : (origin || '')),
  );
}

// ─── project.strategy-plan ──────────────────────────────────────────────────────

function cmdProjectStrategyPlan(cwd: string, raw: boolean): void {
  const content = readProjectContent(cwd);
  const empty: StrategyPlanResult = {
    found: false, archetype: null, recommended_path: null, steps: [], next_recommended: null,
  };
  if (content === null) { output(empty, raw, ''); return; }

  const section = extractSection(content, 'Strategy Plan');
  if (section === null) { output(empty, raw, ''); return; }

  const archMatch = section.match(/\*\*Archetype:\*\*\s*(.+)/i);
  const archetype = archMatch ? cleanFieldValue(archMatch[1]) : null;
  const pathMatch = section.match(/\*\*Recommended path:\*\*\s*(.+)/i);
  const recommended_path = pathMatch ? cleanFieldValue(pathMatch[1]) : null;

  // Parse the `| Step | Status |` table; skip header, separator, and bracketed
  // placeholder rows (`| [model-domain] | [recommended] |`).
  const steps: StrategyStep[] = [];
  for (const line of section.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    // Split on pipes and drop the empty leading/trailing cells from the outer borders.
    // Taking the first two cells is robust to a stray extra column (off-spec but harmless).
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    const step = cells[0];
    const status = cells[1];
    if (/^step$/i.test(step) || /^-+$/.test(step)) continue;        // header / separator
    if (/^\[.*\]$/.test(step) || /^\[.*\]$/.test(status)) continue; // unfilled placeholder
    steps.push({ step, status });
  }

  const next = steps.find((s) => /^recommended$/i.test(s.status));
  const next_recommended = next ? next.step : null;

  output(
    { found: true, archetype, recommended_path, steps, next_recommended },
    raw,
    next_recommended || '',
  );
}

// ─── project.strategy-skipped ───────────────────────────────────────────────────

function cmdProjectStrategySkipped(cwd: string, skill: string | undefined, raw: boolean): void {
  const target = (skill || '').trim();
  const empty: StrategySkippedResult = {
    found: false, skill: target, skipped: false, reason: null, date: null,
  };
  if (!target) { error('project strategy-skipped requires a <skill> argument'); return; }

  const content = readProjectContent(cwd);
  if (content === null) { output(empty, raw, 'false'); return; }

  const section = extractSection(content, 'Strategy Plan');
  if (section === null) { output({ ...empty, found: true }, raw, 'false'); return; }

  // Ledger lines look like: `- <skill> — skipped (<reason>, <date>)`.
  // The em-dash separator matches what strategy-flow.md / the template prescribe.
  for (const line of section.split('\n')) {
    const m = line.match(/^\s*-\s*([^—|]+?)\s*—\s*skipped\s*\((.*)\)\s*$/i);
    if (!m) continue;
    if (m[1].trim().toLowerCase() !== target.toLowerCase()) continue;
    const inner = m[2].trim();
    // Split a trailing date (YYYY-MM-DD) off the reason if present.
    const dateMatch = inner.match(/,\s*(\d{4}-\d{2}-\d{2})\s*$/);
    const date = dateMatch ? dateMatch[1] : null;
    const reason = dateMatch ? inner.slice(0, dateMatch.index).trim() : inner;
    output({ found: true, skill: target, skipped: true, reason, date }, raw, 'true');
    return;
  }

  output({ found: true, skill: target, skipped: false, reason: null, date: null }, raw, 'false');
}

export = {
  cmdProjectMode,
  cmdProjectStrategyPlan,
  cmdProjectStrategySkipped,
};
