---
type: Added
pr: 41
---
**`gsd-tools windows fixed <id> "<reason>"` now records WHY a window closed, and two new verbs end hand-editing `WINDOWS.md`** — `windows amend <id> --description/--reason/--file/--line` rewrites an existing entry at any status (narrow a row that closed only by halves, correct a stale file pointer, normalize a hand-annotated closure), and `windows reconcile` re-derives the frontmatter counts from the entries when a hand edit already drifted them. Previously `fixed` took no reason while `waive` required one, so rationale went into the file by hand — and that drift fail-closed every later read, including `windows append`, leaving the ledger unwritable by its own tool. `reconcile` is the only lenient read path: normal reads keep the fail-closed count cross-check, and reconcile still refuses genuine corruption. A waive reason containing a 4-backtick run is now rejected too (it would have terminated the ledger's JSON fence).
