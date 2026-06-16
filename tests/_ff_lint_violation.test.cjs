/* eslint-disable local/no-source-grep */
// PERMANENT LOAD-BEARING FIXTURE for #1279 — DO NOT "simplify" or delete.
//
// This file is a KNOWN `local/no-source-grep` violation used by `defaultProveFailFirst`'s lint-rule
// path to machine-prove the rule has teeth (the fail-first proof). The exact form below is the ONLY
// shape that fires `local/no-source-grep` under the project flat config (verified empirically, #1279
// RESEARCH): a `tests/**/*.test.cjs` file whose `readFileSync` argument is the
// `path.join('lib','foo.cjs')` form (a STANDALONE quoted source-dir token `'lib'` + a quoted
// `.cjs` extension) followed by a text-search method (`.includes`) on the bound variable.
//
//   - `'src/x.cjs'` as a single string literal does NOT fire (no standalone quoted dir token).
//   - a repo-root / tmp path does NOT fire (no source-dir token).
//
// The leading `/* eslint-disable local/no-source-grep */` keeps the project's own `eslint .` green
// (the violation lands in eslint's `suppressedMessages`, which the prover's `eslintJsonHasRule`
// reads — an inline-disabled violation still proves the rule has teeth, #1259 B1). If the prover
// ever reports `provenFailFirst:false` for the lint-rule kind, suspect THIS file's form first.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const s = fs.readFileSync(path.join('lib', 'foo.cjs'), 'utf-8');
module.exports = s.includes('x');
