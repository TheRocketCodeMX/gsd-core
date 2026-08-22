/**
 * Canonical GSD artifact registry (ADR-457 build-at-publish: the hand-written
 * bin/lib/artifacts.cjs collapsed to a TypeScript source of truth). Behaviour
 * is preserved byte-for-behaviour from the prior hand-written .cjs; only types
 * are added.
 *
 * Enumerates the file names that gsd workflows officially produce at the
 * .planning/ root level. Used by gsd-health (W019) to flag unrecognized files
 * so stale or misnamed artifacts don't silently mislead agents or reviewers.
 *
 * Add entries here whenever a new workflow produces a .planning/ root file.
 */

// Exact-match canonical file names at .planning/ root.
//
// COMPLETENESS IS LOAD-BEARING. W019's remediation text says "Move … or delete if
// stale", so a root artifact missing from this list is the product advising a user to
// delete a file the product itself depends on (e2e-5 F1: 17 of the 23 real root
// artifacts were missing, TEST-STRATEGY.md among them — read back by
// verify-work's certification step and by transition's suite-health compare).
//
// `tests/artifacts.test.cjs` derives the truth mechanically: every `.planning/<NAME>.md`
// literal named anywhere in the shipped corpus (workflows, templates, references,
// commands, skills, agents, capabilities) must resolve here. A new writer that forgets
// this list fails at build time instead of months later in a user's health report.
export const CANONICAL_EXACT: ReadonlySet<string> = new Set([
  'PROJECT.md',
  'TESTING-STANDARDS.md',
  'ROADMAP.md',
  'STATE.md',
  'REQUIREMENTS.md',
  'MILESTONES.md',
  'BACKLOG.md',
  'LEARNINGS.md',
  'THREADS.md',
  'config.json',
  'CLAUDE.md',
  'RETROSPECTIVE.md',
  // Upstream workflows that write a root artifact.
  'WINDOWS.md',              // progress / broken-windows ledger
  'INGEST-CONFLICTS.md',     // ingest-docs
  'INBOX-TRIAGE.md',         // inbox
  'METHODOLOGY.md',          // discuss-phase-assumptions
  'MEMORY.md',               // progress forensic-audit
  'DECISIONS-INDEX.md',      // discuss-phase
  // Fork-owned surfaces — the strategy chain (Waves 0–5) and the context capability.
  // These names are the fork's; an upstream merge that resets this file drops them
  // and W019 starts advising users to delete their strategy documents.
  'PRODUCT-BRIEF.md',           // discover-product
  'DOMAIN-MODEL.md',            // model-domain
  'SECURITY-STRATEGY.md',       // security-strategy
  'FRONTEND-ARCHITECTURE.md',   // frontend-architecture
  'TEST-STRATEGY.md',           // testing-strategy
  'INFRA-STRATEGY.md',          // infrastructure-strategy
  'CICD-STRATEGY.md',           // cicd-strategy
  'LEGACY-INVENTORY.md',        // legacy-inventory
  'DESIGN-INVENTORY.md',        // design ingestion
  'PROJECT-DISCUSSION-LOG.md',  // strategy-chain discussion log
  'MASTER-CONTEXT.md',          // context capability (capsule index)
  'STATE-ARCHIVE.md', // state.cts's cmdStatePrune writes this at the .planning/ root
  'milestone.lock', // #3311: milestone (phase + session) claim (src/milestone-lock.cts); persistent, unlike the transient STATE.md.lock/WAITING.json
]);

// Pattern-match canonical file names (regex tests on the basename)
// Each pattern includes the name of the workflow that produces it as a comment.
export const CANONICAL_PATTERNS: ReadonlyArray<RegExp> = [
  /^v\d+\.\d+(?:\.\d+)?-MILESTONE-AUDIT\.md$/i, // gsd-complete-milestone (pre-archive)
  /^v\d+\.\d+(?:\.\d+)?-.*\.md$/i,               // other version-stamped planning docs
];

/**
 * Return true if `filename` (basename only, no path) matches a canonical
 * .planning/ root artifact — either an exact name or a known pattern.
 *
 * @param filename - Basename of the file (e.g. "STATE.md")
 */
export function isCanonicalPlanningFile(filename: string): boolean {
  if (CANONICAL_EXACT.has(filename)) return true;
  for (const pattern of CANONICAL_PATTERNS) {
    if (pattern.test(filename)) return true;
  }
  return false;
}
