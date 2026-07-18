'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

describe('discuss-phase capsule append contract', () => {
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
});
