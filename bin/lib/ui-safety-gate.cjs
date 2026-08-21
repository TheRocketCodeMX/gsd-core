'use strict';

/**
 * UI Safety Gate — shell-free implementation (#3706, #3718)
 *
 * Replaces the bash shell-based one-liner that silently degraded on Windows
 * PowerShell / cmd.exe because the locale env-var prefix was not recognised.
 * This module runs inside Node.js — no shell dependency, works identically
 * on bash, Git-Bash, PowerShell, and cmd.exe.
 *
 * Word-boundary anchoring:
 *   (^|[^a-zA-Z0-9])(TOKEN)([^a-zA-Z0-9]|$)
 * Equivalent to POSIX ERE [^[:alnum:]] — matches tokens only when they are not
 * interior substrings of alphanumeric compound words (e.g. "microfrontend" is NOT
 * matched; "micro-frontend" and "micro frontend" ARE matched).
 *
 * Public API:
 *   checkUiPresence(text: string): { hasUI: boolean, tokens: string[] }
 *
 * CLI usage — reads phase-section text from STDIN to avoid ARG_MAX limits:
 *   echo "$PHASE_SECTION" | node bin/lib/ui-safety-gate.cjs
 *   echo $?   → 0 if UI tokens found, 1 if not, 2 on usage error
 *
 * Exit codes mirror grep: 0 = match found, 1 = no match, 2 = usage error.
 */

const UI_TOKENS = [
  'UI',
  'interface',
  'frontend',
  'component',
  'layout',
  'page',
  'screen',
  'view',
  'form',
  'dashboard',
  'widget',
];

/**
 * Built once at module load — no per-call compilation overhead.
 * ASCII word boundaries — matches the original ASCII-grep intent of #3706.
 * Note: JS [a-zA-Z0-9] is ASCII-only and NOT equivalent to POSIX [[:alnum:]],
 * which is locale-sensitive and includes accented characters.
 */
const UI_GATE_PATTERN = new RegExp(
  '(^|[^a-zA-Z0-9])(' + UI_TOKENS.join('|') + ')([^a-zA-Z0-9]|$)',
  'i'
);

// Global-flagged variant for extracting ALL matches per line (matchAll).
const UI_GATE_PATTERN_GLOBAL = new RegExp(UI_GATE_PATTERN.source, 'gi');

// FORK:fidelity BEGIN
// Negation guard (#dogfood): a token immediately preceded by a negator ("no UI", "without a
// frontend", "not a screen") is a DENIAL, not a UI signal — a backend phase describing itself by
// contrast must not be flagged. Matches a negator (+ optional article) right before the token.
// The fail-safe-toward-UI bias is preserved for non-negated mentions.
// Kept in sync with the canonical src/ui-safety-gate.cts (this root copy is retained
// for source-repo/npm usage and legacy runtime fallback probing).
const NEGATOR_BEFORE_TOKEN = /(?:^|[^a-z])(?:no|not|without|never|sans|zero|n't)\s+(?:a\s+|an\s+|the\s+)?$/i;
// FORK:fidelity END

/**
 * Check a roadmap phase section string for frontend UI indicators.
 *
 * @param {string} text - The roadmap phase section content (may be multi-line, CRLF or LF).
 * @returns {{ hasUI: boolean, tokens: string[] }}
 *   hasUI — true if any UI token was matched as a standalone word.
 *   tokens — matched token strings (lowercased), deduplicated.
 */
function checkUiPresence(text) {
  if (typeof text !== 'string') {
    return { hasUI: false, tokens: [] };
  }

  // Normalise CRLF so the pattern sees consistent line boundaries.
  const normalised = text.replace(/\r\n/g, '\n');

  // #2150: an explicit `**UI hint**: yes|no` metadata line is the author's
  // authoritative declaration of whether the phase has a UI surface — progress.md
  // and new-project.md already parse this line (`UI hint.*yes`). The bare token
  // `UI` in the line itself must not count as a UI indicator, and the declaration
  // overrides token-sniffing. Line-anchored (`m`) so a mid-line prose mention is
  // not treated as the metadata line; word-boundary on the value so `nope`/`not`
  // do not match `no`.
  const hintMatch = normalised.match(/^\s*\*\*UI hint\*\*\s*:\s*(yes|no)\b/im);
  const hint = hintMatch ? hintMatch[1].toLowerCase() : null;

  // Strip ANY `**UI hint**:` line before token-sniffing so a hint without a
  // recognised yes/no (or one we did not short-circuit on) cannot false-positive
  // on the bare `UI` token.
  const sniffable = normalised
    .split('\n')
    .filter((line) => !/^\s*\*\*UI hint\*\*\s*:/i.test(line))
    .join('\n');

  const found = new Set();
  for (const line of sniffable.split('\n')) {
    // Reset lastIndex before each line so the global pattern restarts from 0.
    UI_GATE_PATTERN_GLOBAL.lastIndex = 0;
    for (const m of line.matchAll(UI_GATE_PATTERN_GLOBAL)) {
// FORK:fidelity BEGIN
      // Skip a token that's negated ("no UI", "without a frontend").
      const tokenStart = (m.index ?? 0) + (m[1] ? m[1].length : 0);
      if (NEGATOR_BEFORE_TOKEN.test(line.slice(0, tokenStart))) continue;
// FORK:fidelity END
      found.add(m[2].toLowerCase());
    }
  }

  if (hint === 'no') {
    return { hasUI: false, tokens: [] };
  }
  if (hint === 'yes') {
    return { hasUI: true, tokens: [...found] };
  }

  return { hasUI: found.size > 0, tokens: [...found] };
}

module.exports = { checkUiPresence, UI_TOKENS };

// ── CLI entry point ─────────────────────────────────────────────────────────
// Reads phase-section text from STDIN (not argv) to avoid OS ARG_MAX limits.
// Invoked by workflow .md bash blocks as: echo "$PHASE_SECTION" | node bin/lib/ui-safety-gate.cjs
// Exit 0 = UI found, 1 = no UI, 2 = startup error.

if (require.main === module) {
  // Collect stdin chunks asynchronously.
  const chunks = [];
  process.stdin.setEncoding('utf-8');

  process.stdin.on('data', (chunk) => chunks.push(chunk));

  process.stdin.on('end', () => {
    const input = chunks.join('');
    const result = checkUiPresence(input);
    // eslint-disable-next-line n/no-process-exit -- CLI entry point (require.main===module): async stdin handler, nothing else terminates the process (#3059)
    process.exit(result.hasUI ? 0 : 1);
  });

  process.stdin.on('error', (err) => {
    process.stderr.write(`ERROR: ui-safety-gate.cjs stdin read failed: ${err.message}\n`);
    // eslint-disable-next-line n/no-process-exit -- CLI entry point (require.main===module): async stdin handler, nothing else terminates the process (#3059)
    process.exit(2);
  });
}
