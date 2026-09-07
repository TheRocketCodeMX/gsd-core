'use strict';

/**
 * Broken-windows ledger — behavioral + property tests.
 *
 * Module: gsd-core/bin/lib/broken-windows.cjs (compiled from src/broken-windows.cts)
 * CLI:    gsd-tools windows <status|append|waive|fixed>
 *
 * Issue: #1950 — enforced cross-phase defect register gating /gsd-ship.
 *
 * Coverage map (acceptance criteria from #1950):
 *   - Executor writes stubs to ledger          → append (CLI + pure)
 *   - /gsd-ship fails while any entry is open   → openCount + cmdWindowsStatus
 *   - Waive requires non-empty reason           → markWaived / cmdWindowsWaive
 *   - Marking fixed removes from blocking set   → markFixed / cmdWindowsMarkFixed
 *   - Open-window count in progress surface     → cmdWindowsStatus emits open_count
 *   - Tests cover all four + clean-on-empty     → empty ledger + full lifecycle
 *
 * Hermetic: each CLI test uses its own tmpdir via createTempDir and cleans up
 * via t.after() (CONTRIBUTING.md pattern 2). No shared state between tests.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createTempDir, cleanup, runGsdTools } = require('./helpers.cjs');
const fc = require('./helpers/fast-check-setup.cjs');

const brokenWindowsLib = require('../gsd-core/bin/lib/broken-windows.cjs');
const {
  REASON,
  WindowsError,
  LEDGER_FILE_NAME,
  emptyLedger,
  parseLedger,
  renderLedger,
  appendWindow,
  markWaived,
  markFixed,
  amendWindow,
  reconcileLedger,
  openCount,
  cmdWindowsAppend,
} = brokenWindowsLib;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Construct a minimal valid WindowEntry input for tests. */
function makeEntry(overrides = {}) {
  return {
    kind: 'stub',
    phase: '2',
    description: 'hardcoded empty list',
    ...overrides,
  };
}

/** Validator: matches a WindowsError carrying a specific REASON code. */
function reasonIs(code) {
  return (err) => err instanceof WindowsError && err.reason === code;
}

// ---------------------------------------------------------------------------
// Pure: emptyLedger + openCount
// ---------------------------------------------------------------------------

describe('broken-windows: emptyLedger + openCount', () => {
  test('emptyLedger returns a ledger with zero counts and schema_version 1', () => {
    const led = emptyLedger('2026-07-19T00:00:00Z');
    assert.equal(led.schema_version, 1);
    assert.equal(led.open_count, 0);
    assert.equal(led.waived_count, 0);
    assert.equal(led.fixed_count, 0);
    assert.equal(led.total_count, 0);
    assert.equal(led.last_updated, '2026-07-19T00:00:00Z');
    assert.deepEqual(led.entries, []);
  });

  test('openCount of empty ledger is 0 (clean-ship baseline)', () => {
    assert.equal(openCount(emptyLedger('now')), 0);
  });
});

// ---------------------------------------------------------------------------
// Pure: appendWindow
// ---------------------------------------------------------------------------

describe('broken-windows: appendWindow', () => {
  test('appending to an empty ledger assigns id=1, status=open, records timestamps', () => {
    const led0 = emptyLedger('2026-07-19T00:00:00Z');
    const { ledger, entry } = appendWindow(led0, makeEntry(), { now: '2026-07-19T12:00:00Z' });

    assert.equal(entry.id, 1);
    assert.equal(entry.status, 'open');
    assert.equal(entry.recorded_at, '2026-07-19T12:00:00Z');
    assert.equal(entry.resolved_at, null);
    assert.equal(ledger.open_count, 1);
    assert.equal(ledger.total_count, 1);
    assert.equal(ledger.last_updated, '2026-07-19T12:00:00Z');
  });

  test('second append gets id=2 (ids are dense and monotonic)', () => {
    let led = emptyLedger('now');
    ({ ledger: led } = appendWindow(led, makeEntry({ description: 'first' }), { now: 't1' }));
    ({ ledger: led } = appendWindow(led, makeEntry({ description: 'second' }), { now: 't2' }));
    assert.equal(led.entries[0].id, 1);
    assert.equal(led.entries[1].id, 2);
    assert.equal(led.total_count, 2);
    assert.equal(openCount(led), 2);
  });

  test('append rejects unknown kind (fail-closed on schema drift)', () => {
    const led = emptyLedger('now');
    assert.throws(
      () => appendWindow(led, makeEntry({ kind: 'bogus' })),
      reasonIs(REASON.WINDOWS_INVALID_KIND),
    );
  });

  test('append rejects empty description (no vacuous windows)', () => {
    const led = emptyLedger('now');
    assert.throws(
      () => appendWindow(led, makeEntry({ description: '' })),
      reasonIs(REASON.WINDOWS_APPEND_MISSING_FIELD),
    );
    assert.throws(
      () => appendWindow(led, makeEntry({ description: '   ' })),
      reasonIs(REASON.WINDOWS_APPEND_MISSING_FIELD),
    );
  });

  test('append rejects path-traversal in --file (security boundary)', () => {
    const led = emptyLedger('now');
    assert.throws(
      () => appendWindow(led, makeEntry({ file: '../../etc/passwd' })),
      reasonIs(REASON.WINDOWS_INVALID_FILE),
    );
  });

  test('append rejects 4-backtick run in description (H1 regression — would brick the JSON fence)', () => {
    const led = emptyLedger('now');
    assert.throws(
      () => appendWindow(led, makeEntry({ description: 'see ```` four backticks' })),
      reasonIs(REASON.WINDOWS_INVALID_TEXT),
    );
    // 3-backtick run is fine — the fence is 4-tick so 3-tick content is safe.
    const led2 = emptyLedger('now');
    const { ledger } = appendWindow(led2, makeEntry({ description: 'see ```js``` inline' }), { now: 't' });
    assert.equal(ledger.entries[0].description, 'see ```js``` inline');
    // And reparses cleanly:
    assert.doesNotThrow(() => parseLedger(renderLedger(ledger)));
  });

  test('renderTable escapes backslash before pipe (CodeQL: incomplete-sanitization — PR #2441)', () => {
    // A description containing `\|` must NOT split the markdown table cell.
    // Escape order: `\` → `\\` first, then `|` → `\|`. If pipe is escaped first,
    // `\|` in input becomes `\\|` in output which markdown renders as `\` + cell-sep.
    const led0 = emptyLedger('2026-07-19T00:00:00Z');
    const { ledger } = appendWindow(
      led0,
      makeEntry({ description: 'path with \\| separator and | pipe and \\ backslash' }),
      { now: '2026-07-19T12:00:00Z' },
    );
    const rendered = renderLedger(ledger);

    // The JSON block (source of truth) preserves the description verbatim and reparses.
    const reparsed = parseLedger(rendered);
    assert.equal(reparsed.entries[0].description, 'path with \\| separator and | pipe and \\ backslash');

    // The table row for this entry has exactly 10 cells (one per column). Counting
    // unescaped pipes inside the row would surface a split. The cell's rendered
    // form is `path with \\| separator and \| pipe and \\ backslash` — every pipe
    // is preceded by a backslash, so splitting on /(?<!\\)\|/ yields 10 cells.
    const tableLine = rendered.split('\n').find((l) => l.includes('path with'));
    assert.ok(tableLine, 'table row for the test entry must exist');
    // Walk the line and count pipes that are NOT preceded by a backslash.
    let unescapedPipes = 0;
    for (let i = 0; i < tableLine.length; i++) {
      if (tableLine[i] === '|' && tableLine[i - 1] !== '\\') unescapedPipes++;
    }
    // 10 cells = 11 cell-separator pipes per row (leading + 9 internal + trailing).
    assert.equal(unescapedPipes, 11, 'table row must have exactly 11 unescaped pipes (10 cells) — backslash-pipe in description must NOT add a split');
  });
});

// ---------------------------------------------------------------------------
// Pure: markWaived (acceptance: waive requires non-empty reason)
// ---------------------------------------------------------------------------

describe('broken-windows: markWaived', () => {
  test('waive with non-empty reason succeeds; waived_count increments; open_count decrements', () => {
    let led = emptyLedger('now');
    ({ ledger: led } = appendWindow(led, makeEntry(), { now: 't1' }));
    led = markWaived(led, 1, 'Manual QA covers it', { now: 't2' });

    assert.equal(led.entries[0].status, 'waived');
    assert.equal(led.entries[0].reason, 'Manual QA covers it');
    assert.equal(led.entries[0].resolved_at, 't2');
    assert.equal(led.open_count, 0);
    assert.equal(led.waived_count, 1);
    assert.equal(openCount(led), 0); // waived does not block
  });

  test('waive with empty reason throws (boundary: limit-1 = 0 chars)', () => {
    let led = emptyLedger('now');
    ({ ledger: led } = appendWindow(led, makeEntry(), { now: 't1' }));
    assert.throws(
      () => markWaived(led, 1, ''),
      reasonIs(REASON.WINDOWS_WAIVE_REASON_EMPTY),
    );
  });

  test('waive with whitespace-only reason throws (boundary: limit = spaces)', () => {
    let led = emptyLedger('now');
    ({ ledger: led } = appendWindow(led, makeEntry(), { now: 't1' }));
    assert.throws(
      () => markWaived(led, 1, '   '),
      reasonIs(REASON.WINDOWS_WAIVE_REASON_EMPTY),
    );
  });

  test('waive with single-char reason succeeds (boundary: limit+1 = 1 char)', () => {
    let led = emptyLedger('now');
    ({ ledger: led } = appendWindow(led, makeEntry(), { now: 't1' }));
    led = markWaived(led, 1, 'x', { now: 't2' });
    assert.equal(led.entries[0].status, 'waived');
  });

  test('waive unknown id throws', () => {
    const led = emptyLedger('now');
    assert.throws(
      () => markWaived(led, 999, 'reason'),
      reasonIs(REASON.WINDOWS_ID_NOT_FOUND),
    );
  });

  test('waive on already-resolved entry throws (no double-resolution)', () => {
    let led = emptyLedger('now');
    ({ ledger: led } = appendWindow(led, makeEntry(), { now: 't1' }));
    led = markFixed(led, 1, { now: 't2' });
    assert.throws(
      () => markWaived(led, 1, 'late', { now: 't3' }),
      reasonIs(REASON.WINDOWS_ALREADY_RESOLVED),
    );
  });
});

// ---------------------------------------------------------------------------
// Pure: markFixed (acceptance: fixed removes from blocking set)
// ---------------------------------------------------------------------------

describe('broken-windows: markFixed', () => {
  test('fixed decrements open_count and increments fixed_count', () => {
    let led = emptyLedger('now');
    ({ ledger: led } = appendWindow(led, makeEntry(), { now: 't1' }));
    led = markFixed(led, 1, { now: 't2' });

    assert.equal(led.entries[0].status, 'fixed');
    assert.equal(led.entries[0].resolved_at, 't2');
    assert.equal(led.open_count, 0);
    assert.equal(led.fixed_count, 1);
    assert.equal(openCount(led), 0);
  });

  test('fixed on unknown id throws', () => {
    const led = emptyLedger('now');
    assert.throws(
      () => markFixed(led, 999),
      reasonIs(REASON.WINDOWS_ID_NOT_FOUND),
    );
  });

  test('fixed on already-resolved throws', () => {
    let led = emptyLedger('now');
    ({ ledger: led } = appendWindow(led, makeEntry(), { now: 't1' }));
    led = markWaived(led, 1, 'have it', { now: 't2' });
    assert.throws(
      () => markFixed(led, 1, { now: 't3' }),
      reasonIs(REASON.WINDOWS_ALREADY_RESOLVED),
    );
  });
});

// ---------------------------------------------------------------------------
// Pure: parseLedger / renderLedger roundtrip (property test, fast-check)
// ---------------------------------------------------------------------------

describe('broken-windows: parse/render roundtrip property', () => {
  const arbKind = fc.constantFrom('stub', 'todo', 'fixme', 'skipped-test', 'lint-warning', 'unmet-truth', 'unrun-verify', 'deviation');
  const arbStatus = fc.constantFrom('open', 'waived', 'fixed');
  const arbPhase = fc.integer({ min: 1, max: 99 }).map(n => String(n));
  const arbText = fc.string({ minLength: 1, maxLength: 80 }).map(s => s.replace(/[\r\n\t|]/g, ' ').trim() || 'x');

  const arbEntry = fc.record({
    id: fc.integer({ min: 1, max: 1000 }),
    kind: arbKind,
    phase: arbPhase,
    description: arbText,
    status: arbStatus,
  }).map((e) => ({
    id: e.id,
    kind: e.kind,
    phase: e.phase,
    file: e.id % 2 === 0 ? '' : `src/file${e.id}.ts`,
    line: e.id % 2 === 0 ? null : e.id * 10,
    description: e.description,
    status: e.status,
    reason: e.status === 'waived' ? 'justified' : '',
    recorded_at: '2026-07-19T00:00:00Z',
    resolved_at: e.status === 'open' ? null : '2026-07-19T01:00:00Z',
  }));

  const arbLedger = fc.array(arbEntry, { maxLength: 6 }).map((generated) => {
    // Ids are the ledger's addressing key, so a duplicate is corruption the
    // parser rejects (not a ledger any version of the tool could have written).
    // Dedupe here so the roundtrip property is quantified over LEGAL ledgers.
    const seen = new Set();
    const entries = [];
    for (const e of generated) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      entries.push(e);
    }
    const open = entries.filter(e => e.status === 'open').length;
    const waived = entries.filter(e => e.status === 'waived').length;
    const fixed = entries.filter(e => e.status === 'fixed').length;
    return {
      schema_version: 1,
      open_count: open,
      waived_count: waived,
      fixed_count: fixed,
      total_count: entries.length,
      last_updated: '2026-07-19T00:00:00Z',
      entries,
    };
  });

  test('property: render(parse(render(ledger))) === render(ledger)', () => {
    fc.assert(fc.property(arbLedger, (ledger) => {
      const rendered1 = renderLedger(ledger);
      const parsed = parseLedger(rendered1);
      const rendered2 = renderLedger(parsed);
      assert.equal(rendered2, rendered1, 'roundtrip must be stable');
    }));
  });

  test('property: parseLedger never hangs or crashes on arbitrary unicode strings', () => {
    fc.assert(fc.property(fc.string({ maxLength: 200 }), (raw) => {
      try { parseLedger(raw); } catch { /* malformed input is allowed to throw */ }
    }));
  });
});

// ---------------------------------------------------------------------------
// Pure: parseLedger fail-closed on malformed input
// ---------------------------------------------------------------------------

describe('broken-windows: parseLedger fail-closed', () => {
  test('rejects frontmatter with wrong schema_version', () => {
    const raw = [
      '---',
      'schema_version: 99',
      'open_count: 0',
      'waived_count: 0',
      'fixed_count: 0',
      'total_count: 0',
      'last_updated: 2026-07-19T00:00:00Z',
      '---',
      '',
      '```json',
      '[]',
      '```',
      '',
    ].join('\n');
    assert.throws(() => parseLedger(raw), reasonIs(REASON.WINDOWS_LEDGER_MALFORMED));
  });

  test('rejects frontmatter missing open_count', () => {
    const raw = [
      '---',
      'schema_version: 1',
      '---',
      '',
      '```json',
      '[]',
      '```',
      '',
    ].join('\n');
    assert.throws(() => parseLedger(raw), reasonIs(REASON.WINDOWS_LEDGER_MALFORMED));
  });

  test('rejects frontmatter with non-numeric open_count', () => {
    const raw = [
      '---',
      'schema_version: 1',
      'open_count: "zero"',
      '---',
      '',
      '```json',
      '[]',
      '```',
      '',
    ].join('\n');
    assert.throws(() => parseLedger(raw), reasonIs(REASON.WINDOWS_LEDGER_MALFORMED));
  });
});

// ---------------------------------------------------------------------------
// CLI: gsd-tools windows status (acceptance: clean-ship on empty)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// #3657: fence-width tolerant read (formatter-normalized ledgers)
// ---------------------------------------------------------------------------

// The formatter itself is never spawned here: the input class is "a ledger a
// CommonMark formatter already normalized" (Prettier narrows the written
// 4-backtick fence to the shortest legal width — 3 — because a canonical-JSON
// body never contains a backtick run). Narrowing a rendered ledger's fences
// reproduces that state deterministically.

describe('broken-windows: fence-width tolerant read (#3657)', () => {
  /** Narrow a rendered ledger text's fences to `width` backticks. */
  function narrowFences(raw, width = 3) {
    return raw
      .replace(/^````json$/m, '`'.repeat(width) + 'json')
      .replace(/^````$/m, '`'.repeat(width));
  }

  /** Rendered ledger with its fences narrowed to `width` backticks. */
  function renderNarrowed(ledger, width = 3) {
    return narrowFences(renderLedger(ledger), width);
  }

  /** Narrow the fences of an on-disk ledger in place (the formatter's effect). */
  function narrowLedgerOnDisk(p, width = 3) {
    fs.writeFileSync(p, narrowFences(fs.readFileSync(p, 'utf8'), width), 'utf8');
  }

  /** Ledger with one open stub entry, built through the pure API. */
  function ledgerWithEntry(description) {
    const { ledger } = appendWindow(
      emptyLedger('2026-07-19T00:00:00Z'),
      { kind: 'stub', phase: '2', description },
      { now: '2026-07-19T12:00:00Z' }
    );
    return ledger;
  }

  test('parseLedger accepts a formatter-narrowed 3-backtick JSON fence (#3657)', () => {
    const parsed = parseLedger(renderNarrowed(ledgerWithEntry('narrowed fence entry')));
    assert.equal(parsed.entries.length, 1);
    assert.equal(parsed.entries[0].description, 'narrowed fence entry');
    assert.equal(parsed.open_count, 1);
  });

  test('windows status recovers on a formatter-normalized ledger (#3657)', (t) => {
    const tmp = createTempDir();
    t.after(() => cleanup(tmp));
    const r0 = runGsdTools(
      ['windows', 'append', '--kind', 'todo', '--phase', '2', '--description', 'normalized ledger entry'],
      tmp
    );
    assert.ok(r0.success, `seed append failed: ${r0.error || ''}`);
    narrowLedgerOnDisk(path.join(tmp, '.planning', LEDGER_FILE_NAME));

    const res = runGsdTools(['windows', 'status', '--raw'], tmp);
    assert.ok(res.success, `status must recover on a normalized ledger: ${res.error || ''}`);
    const obj = JSON.parse(res.output);
    assert.equal(obj.ok, true);
    assert.equal(obj.ledger.open_count, 1);
  });

  test('windows append/waive/fixed recover on a normalized ledger and re-emit the 4-fence writer form (#3657)', (t) => {
    const tmp = createTempDir();
    t.after(() => cleanup(tmp));
    const ledgerPath = path.join(tmp, '.planning', LEDGER_FILE_NAME);
    const r0 = runGsdTools(
      ['windows', 'append', '--kind', 'todo', '--phase', '2', '--description', 'first'],
      tmp
    );
    assert.ok(r0.success, `seed append failed: ${r0.error || ''}`);
    narrowLedgerOnDisk(ledgerPath);

    const rAppend = runGsdTools(
      ['windows', 'append', '--kind', 'todo', '--phase', '2', '--description', 'second'],
      tmp
    );
    assert.ok(rAppend.success, `append must recover on a normalized ledger: ${rAppend.error || ''}`);
    narrowLedgerOnDisk(ledgerPath);

    const rWaive = runGsdTools(['windows', 'waive', '1', 'duplicate of second'], tmp);
    assert.ok(rWaive.success, `waive must recover on a normalized ledger: ${rWaive.error || ''}`);
    narrowLedgerOnDisk(ledgerPath);

    const rFixed = runGsdTools(['windows', 'fixed', '2'], tmp);
    assert.ok(rFixed.success, `fixed must recover on a normalized ledger: ${rFixed.error || ''}`);

    // Writer contract unchanged: after any write the ledger is back on the
    // 4-backtick fence form renderLedger emits (#1950 review H1).
    const after = fs.readFileSync(ledgerPath, 'utf8');
    assert.match(after, /^````json$/m, 'rewritten ledger must re-emit the 4-backtick writer fence');
    assert.doesNotMatch(after, /^```json$/m, 'the 3-backtick form is a formatter artifact, never written');

    const status = runGsdTools(['windows', 'status', '--raw'], tmp);
    assert.ok(status.success, `final status failed: ${status.error || ''}`);
    assert.equal(JSON.parse(status.output).ledger.open_count, 0);
  });

  test('windows append preserves trailing prose on a normalized ledger (#2893 via #3657)', (t) => {
    const tmp = createTempDir();
    t.after(() => cleanup(tmp));
    const ledgerPath = path.join(tmp, '.planning', LEDGER_FILE_NAME);
    const r0 = runGsdTools(
      ['windows', 'append', '--kind', 'todo', '--phase', '2', '--description', 'prose carrier'],
      tmp
    );
    assert.ok(r0.success, `seed append failed: ${r0.error || ''}`);

    // User prose below the closing fence (#2893), then a formatter pass.
    const withProse = fs.readFileSync(ledgerPath, 'utf8') + 'Manual notes below the ledger.\n';
    fs.writeFileSync(ledgerPath, withProse, 'utf8');
    narrowLedgerOnDisk(ledgerPath);

    const rAppend = runGsdTools(
      ['windows', 'append', '--kind', 'todo', '--phase', '2', '--description', 'second'],
      tmp
    );
    assert.ok(rAppend.success, `append on normalized ledger failed: ${rAppend.error || ''}`);
    const after = fs.readFileSync(ledgerPath, 'utf8');
    assert.ok(
      after.includes('Manual notes below the ledger.'),
      'trailing prose must survive a write to a formatter-normalized ledger'
    );
  });

  test('renderLedger keeps the 4-backtick writer fence (#3657)', () => {
    const out = renderLedger(emptyLedger());
    assert.match(out, /^````json$/m, 'writer must keep the #1950 H1 4-backtick open fence');
    assert.match(out, /^````$/m, 'writer must keep the 4-backtick close fence');
  });

  test('fence tolerance does not loosen malformed-ledger fail-closed (#3657)', () => {
    const frontmatter = [
      '---',
      'schema_version: 1',
      'open_count: 0',
      'waived_count: 0',
      'fixed_count: 0',
      'total_count: 0',
      'last_updated: 2026-07-19T00:00:00Z',
      '---',
    ].join('\n');
    const noBlock = [frontmatter, '', '# Broken Windows Ledger', '', 'prose only', ''].join('\n');
    assert.throws(() => parseLedger(noBlock), reasonIs(REASON.WINDOWS_LEDGER_MALFORMED));
    assert.throws(() => parseLedger(noBlock), /missing JSON code block/);

    const body = JSON.stringify([]);
    const unterminated = [frontmatter, '', '```json', body, ''].join('\n');
    assert.throws(() => parseLedger(unterminated), reasonIs(REASON.WINDOWS_LEDGER_MALFORMED));
    assert.throws(() => parseLedger(unterminated), /not terminated/);
  });

  test('reader accepts 3+ widths and rejects a shorter closing run (#3657)', () => {
    const ledger = ledgerWithEntry('width boundary entry');
    const five = renderNarrowed(ledger, 5);
    const parsedFive = parseLedger(five);
    assert.equal(parsedFive.entries.length, 1, 'a 5-backtick fence is valid CommonMark and must parse');

    // CommonMark: the closing run must be at least as long as the opening run.
    const shortClose = renderLedger(ledger).replace(/^````$/m, '```');
    assert.throws(
      () => parseLedger(shortClose),
      reasonIs(REASON.WINDOWS_LEDGER_MALFORMED),
      'a 3-backtick line must not close a 4-backtick block'
    );
  });

  test('3-backtick run inside a description never terminates the block (#1950 H1 under #3657 tolerance)', () => {
    const description = 'see ```js x``` inline';
    const ledger = ledgerWithEntry(description);
    const parsed4 = parseLedger(renderLedger(ledger));
    assert.equal(parsed4.entries[0].description, description, '4-fence roundtrip keeps the inline run');
    // A hand-narrowed 3-fence file: the inline ``` sits inside a JSON string on
    // a content line, so the line-anchored close scan must skip it.
    const parsed3 = parseLedger(renderNarrowed(ledger));
    assert.equal(parsed3.entries[0].description, description);
  });

  test('fence tolerance is CRLF-safe (#3116 sibling)', () => {
    const crlf = renderNarrowed(ledgerWithEntry('crlf narrowed entry')).replace(/\n/g, '\r\n');
    const parsed = parseLedger(crlf);
    assert.equal(parsed.entries.length, 1);
    assert.equal(parsed.entries[0].description, 'crlf narrowed entry');
  });

  test('a json fence planted in a description never hijacks or bricks the ledger (#3657 security)', () => {
    // renderTable renders descriptions into the prose ABOVE the JSON block,
    // and append validation rejects only 4+ backtick runs (#1950 H1) — so a
    // hostile or accidental description can plant a second json fence above
    // the real one. The reader must resolve to the REAL block: renderLedger
    // always emits it as the final fenced section, and the counts cross-check
    // pins it. Both the smuggled-entries variant and the empty-array (brick)
    // variant must fail to influence the parse.
    const plantedBodies = [
      '[{"id":99,"kind":"stub","phase":"9","file":"","line":null,"description":"SMUGGLED","status":"open","reason":"","recorded_at":"t","resolved_at":null}]',
      '[]',
    ];
    for (const body of plantedBodies) {
      const hostile = `see old snapshot:\n\`\`\`json\n${body}\n\`\`\`\nend`;
      const ledger = ledgerWithEntry(hostile);
      const rendered = renderLedger(ledger);

      const parsed = parseLedger(rendered);
      assert.equal(parsed.entries.length, 1, `planted fence must not replace the entries: ${body.slice(0, 12)}`);
      assert.equal(parsed.entries[0].id, 1);
      assert.notEqual(parsed.entries[0].description, 'SMUGGLED');
      assert.ok(parsed.entries[0].description.includes('see old snapshot'));

      // Same file after a formatter narrows every fence to three backticks.
      const parsedNarrowed = parseLedger(narrowFences(rendered));
      assert.equal(parsedNarrowed.entries[0].id, 1, 'narrowed planted ledger still resolves the real block');
      assert.notEqual(parsedNarrowed.entries[0].description, 'SMUGGLED');
    }
  });
});

describe('broken-windows CLI: windows status', () => {
  test('status on a project with no ledger returns open_count=0 (backward-compat baseline)', (t) => {
    const tmp = createTempDir('bw-status-empty-');
    t.after(() => cleanup(tmp));

    const res = runGsdTools(['windows', 'status', '--raw'], tmp);
    assert.equal(res.success, true, `stderr: ${res.error || ''}`);
    const obj = JSON.parse(res.output);
    assert.equal(obj.ok, true);
    assert.equal(obj.ledger.open_count, 0);
    assert.deepEqual(obj.ledger.entries, []);
  });

  test('status on a malformed ledger fails closed', (t) => {
    const tmp = createTempDir('bw-status-malformed-');
    t.after(() => cleanup(tmp));
    fs.mkdirSync(path.join(tmp, '.planning'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, '.planning', LEDGER_FILE_NAME),
      'not valid markdown or frontmatter',
    );

    const res = runGsdTools(['windows', 'status', '--raw'], tmp);
    assert.equal(res.success, false);
    assert.ok(res.exitCode !== 0);
    assert.match(res.error, /malformed|invalid frontmatter|missing frontmatter/i);
  });

  test('status on an UNREADABLE ledger fails closed (H2 regression — EACCES must not be silently empty)', (t) => {
    // Skip on Windows where chmod 000 doesn't apply to root/admin or where the FS
    // ignores mode bits; CI lanes run as non-root so the EACCES path is real.
    const tmp = createTempDir('bw-status-eacces-');
    t.after(() => {
      try { fs.chmodSync(path.join(tmp, '.planning', LEDGER_FILE_NAME), 0o644); } catch { /* best-effort */ }
      cleanup(tmp);
    });
    fs.mkdirSync(path.join(tmp, '.planning'), { recursive: true });
    // A ledger with open_count=1 — if EACCES silently returned empty, ship gate would pass.
    const validLedger = [
      '---',
      'schema_version: 1',
      'open_count: 1',
      'waived_count: 0',
      'fixed_count: 0',
      'total_count: 1',
      'last_updated: 2026-07-19T00:00:00Z',
      '---',
      '',
      '````json',
      JSON.stringify([{
        id: 1, kind: 'stub', phase: '2', file: '', line: null,
        description: 'unreadable-test', status: 'open', reason: '',
        recorded_at: 't', resolved_at: null,
      }]),
      '````',
      '',
    ].join('\n');
    fs.writeFileSync(path.join(tmp, '.planning', LEDGER_FILE_NAME), validLedger);
    try { fs.chmodSync(path.join(tmp, '.planning', LEDGER_FILE_NAME), 0o000); } catch { return; }

    const res = runGsdTools(['windows', 'status', '--raw'], tmp);
    // If the chmod actually took (non-root), the read must fail. If running as
    // root (CI rarely does), the read may succeed — either way, the test must
    // never see a false-green "open_count: 0" from a file we KNOW has open_count=1.
    if (res.success) {
      const obj = JSON.parse(res.output);
      assert.notEqual(obj.ledger.open_count, 0, 'EACCES must NOT silently coerce an open_count=1 ledger to 0');
    } else {
      assert.match(res.error, /could not read|EACCES|malformed/i);
    }
  });
});

// ---------------------------------------------------------------------------
// CLI: gsd-tools windows append (acceptance: executor writes stubs)
// ---------------------------------------------------------------------------

describe('broken-windows CLI: windows append', () => {
  test('append creates the ledger if absent and records the entry', (t) => {
    const tmp = createTempDir('bw-append-create-');
    t.after(() => cleanup(tmp));

    const res = runGsdTools(
      ['windows', 'append', '--kind', 'stub', '--phase', '2',
       '--file', 'src/auth.ts', '--line', '42',
       '--description', 'hardcoded empty list in UserService.list'],
      tmp,
    );
    assert.equal(res.success, true, `stderr: ${res.error || ''}`);
    const obj = JSON.parse(res.output);
    assert.equal(obj.ok, true);
    assert.equal(obj.entry.id, 1);
    assert.equal(obj.entry.status, 'open');
    assert.equal(obj.ledger.open_count, 1);

    // File exists with the right frontmatter and is re-readable.
    const ledgerPath = path.join(tmp, '.planning', LEDGER_FILE_NAME);
    assert.equal(fs.existsSync(ledgerPath), true);

    // Second invocation observes the persisted entry (idempotent read).
    const res2 = runGsdTools(['windows', 'status', '--raw'], tmp);
    assert.equal(res2.success, true);
    const obj2 = JSON.parse(res2.output);
    assert.equal(obj2.ledger.open_count, 1);
    assert.equal(obj2.ledger.entries[0].id, 1);
  });

  test('append a second entry gets id=2', (t) => {
    const tmp = createTempDir('bw-append-second-');
    t.after(() => cleanup(tmp));

    const r1 = runGsdTools(
      ['windows', 'append', '--kind', 'todo', '--phase', '2', '--description', 'first todo'],
      tmp,
    );
    assert.equal(r1.success, true, `stderr: ${r1.error || ''}`);
    const r2 = runGsdTools(
      ['windows', 'append', '--kind', 'todo', '--phase', '2', '--description', 'second todo'],
      tmp,
    );
    assert.equal(r2.success, true);
    const obj2 = JSON.parse(r2.output);
    assert.equal(obj2.entry.id, 2);
    assert.equal(obj2.ledger.total_count, 2);
  });

  test('append rejects unknown kind', (t) => {
    const tmp = createTempDir('bw-append-badkind-');
    t.after(() => cleanup(tmp));
    const res = runGsdTools(
      ['windows', 'append', '--kind', 'bogus', '--phase', '2', '--description', 'x'],
      tmp,
    );
    assert.equal(res.success, false);
    assert.match(res.error, /invalid kind|allowed:/i);
  });

  test('append rejects path-traversal in --file', (t) => {
    const tmp = createTempDir('bw-append-traversal-');
    t.after(() => cleanup(tmp));
    const res = runGsdTools(
      ['windows', 'append', '--kind', 'stub', '--phase', '2',
       '--file', '../../etc/passwd', '--description', 'x'],
      tmp,
    );
    assert.equal(res.success, false);
    assert.match(res.error, /traversal|absolute|file/i);
  });

  test('append rejects missing description', (t) => {
    const tmp = createTempDir('bw-append-nodesc-');
    t.after(() => cleanup(tmp));
    const res = runGsdTools(
      ['windows', 'append', '--kind', 'stub', '--phase', '2'],
      tmp,
    );
    assert.equal(res.success, false);
    assert.match(res.error, /description|required|missing/i);
  });

  test('append --line boundary: 0 / 1 / large int (limit-1 / limit / limit+1)', (t) => {
    const tmp = createTempDir('bw-append-line-bva-');
    t.after(() => cleanup(tmp));

    // line=1: smallest valid line — limit boundary.
    const r1 = runGsdTools(['windows', 'append', '--kind', 'stub', '--phase', '2', '--line', '1', '--description', 'b'], tmp);
    assert.equal(r1.success, true, `--line 1 should succeed: ${r1.error || ''}`);
    assert.equal(JSON.parse(r1.output).entry.line, 1);

    // line=large: limit+1 boundary (just confirm it accepts arbitrary positive int).
    const r2 = runGsdTools(['windows', 'append', '--kind', 'stub', '--phase', '2', '--line', '999999', '--description', 'c'], tmp);
    assert.equal(r2.success, true, `--line 999999 should succeed: ${r2.error || ''}`);
    assert.equal(JSON.parse(r2.output).entry.line, 999999);

    // line=0: limit-1 boundary — invalid (lines are 1-indexed; 0 is not a line).
    // M2 fix: validateLine no longer treats 0 as omit; it rejects as non-positive.
    const rZero = runGsdTools(['windows', 'append', '--kind', 'stub', '--phase', '2', '--line', '0', '--description', 'a'], tmp);
    assert.equal(rZero.success, false, '--line 0 must fail (positive integers only)');
    assert.match(rZero.error, /line|positive integer/i);

    // line=-1 and line=abc: also invalid — fail closed.
    const rNeg = runGsdTools(['windows', 'append', '--kind', 'stub', '--phase', '2', '--line', '-1', '--description', 'd'], tmp);
    assert.equal(rNeg.success, false);
    assert.match(rNeg.error, /line|positive integer/i);
    const rGarbage = runGsdTools(['windows', 'append', '--kind', 'stub', '--phase', '2', '--line', 'abc', '--description', 'e'], tmp);
    assert.equal(rGarbage.success, false);
    assert.match(rGarbage.error, /line|positive integer/i);

    // line OMITTED entirely: valid, line is null.
    const rOmit = runGsdTools(['windows', 'append', '--kind', 'stub', '--phase', '2', '--description', 'f'], tmp);
    assert.equal(rOmit.success, true, `--line omitted should succeed: ${rOmit.error || ''}`);
    assert.equal(JSON.parse(rOmit.output).entry.line, null);
  });

  test('append rejects 4-backtick description via CLI (H1 regression)', (t) => {
    const tmp = createTempDir('bw-append-4tick-');
    t.after(() => cleanup(tmp));
    const res = runGsdTools(
      ['windows', 'append', '--kind', 'stub', '--phase', '2', '--description', 'has ```` four backticks'],
      tmp,
    );
    assert.equal(res.success, false);
    assert.match(res.error, /4-backtick|fence|invalid_text/i);
  });

  // ─── #2893: append must not destroy prose below the JSON ledger ──────────

  test('#2893 — append preserves prose below the JSON ledger block', (t) => {
    const tmp = createTempDir('bw-append-prose-');
    t.after(() => cleanup(tmp));

    // Create a WINDOWS.md with a NON-EMPTY ledger + prose below the JSON block.
    fs.mkdirSync(path.join(tmp, '.planning'), { recursive: true });
    const lp = path.join(tmp, '.planning', LEDGER_FILE_NAME);
    const initial = renderLedger({
      schema_version: 1, open_count: 1, waived_count: 0, fixed_count: 0, total_count: 1,
      last_updated: '2026-01-01T00:00:00Z',
      entries: [{ id: 1, phase: '1', kind: 'stub', file: '', line: null, description: 'pre-existing', status: 'open', reason: '', recorded_at: '2026-01-01T00:00:00Z', resolved_at: null }],
    });
    const prose = [
      '',
      '## Investigation Notes',
      '',
      'This window was opened because the flaky test in thread-status.test.ts',
      'turned out to be a real race condition against live data, not a pre-existing break.',
      '',
      '## ACPT-M03',
      '',
      'Went red on a green that PREDATED the diff — checkpoint refused, then fixed.',
    ].join('\n');
    fs.writeFileSync(lp, initial + prose, 'utf8');

    // First append.
    const res = runGsdTools(
      ['windows', 'append', '--kind', 'stub', '--phase', '2', '--description', 'test entry'],
      tmp,
    );
    assert.equal(res.success, true, `stderr: ${res.error || ''}`);
    assert.equal(JSON.parse(res.output).ok, true);

    // Second append — idempotency: prose must appear exactly once, not duplicated.
    const res2 = runGsdTools(
      ['windows', 'append', '--kind', 'todo', '--phase', '3', '--description', 'second entry'],
      tmp,
    );
    assert.equal(res2.success, true);

    const after = fs.readFileSync(lp, 'utf8');
    // Prose must survive.
    assert.match(after, /Investigation Notes/, 'prose heading must survive');
    assert.match(after, /thread-status\.test\.ts/, 'prose body must survive');
    assert.match(after, /ACPT-M03/, 'second prose heading must survive');
    assert.match(after, /PREDATED the diff/, 'second prose body must survive');
    // Prose must appear exactly once (not duplicated by the second write).
    assert.equal((after.match(/Investigation Notes/g) || []).length, 1,
      'prose heading must appear exactly once after two appends (idempotency)');
    // The old JSON body must NOT be duplicated as prose (the indexOf(open-fence) bug).
    // Count JSON fence opens — there must be exactly one.
    assert.equal((after.match(/````json/g) || []).length, 1,
      'exactly one JSON fence open must exist (no duplicated JSON body)');
    // The file must re-parse cleanly with the correct entry count.
    const reParsed = parseLedger(after);
    assert.equal(reParsed.entries.length, 3, 'ledger must have 3 entries after two appends');
  });
});

// ---------------------------------------------------------------------------
// CLI: gsd-tools windows waive (acceptance: waive-with-reason)
// ---------------------------------------------------------------------------

describe('broken-windows CLI: windows waive', () => {
  test('waive with reason succeeds; subsequent status reports open_count=0', (t) => {
    const tmp = createTempDir('bw-waive-ok-');
    t.after(() => cleanup(tmp));

    const r1 = runGsdTools(
      ['windows', 'append', '--kind', 'skipped-test', '--phase', '3',
       '--file', 'tests/x.test.cjs', '--line', '18',
       '--description', 't.skip logout flow'],
      tmp,
    );
    assert.equal(r1.success, true, `stderr: ${r1.error || ''}`);

    const r2 = runGsdTools(
      ['windows', 'waive', '1', 'Manual QA covers it; CI cannot reach logout URL'],
      tmp,
    );
    assert.equal(r2.success, true, `stderr: ${r2.error || ''}`);
    const obj = JSON.parse(r2.output);
    assert.equal(obj.ok, true);
    assert.equal(obj.ledger.entries[0].status, 'waived');
    assert.equal(obj.ledger.entries[0].reason, 'Manual QA covers it; CI cannot reach logout URL');

    const r3 = runGsdTools(['windows', 'status', '--raw'], tmp);
    assert.equal(r3.success, true);
    const status = JSON.parse(r3.output);
    assert.equal(status.ledger.open_count, 0); // waived does not block ship
    assert.equal(status.ledger.waived_count, 1);
  });

  test('waive with empty reason fails', (t) => {
    const tmp = createTempDir('bw-waive-empty-');
    t.after(() => cleanup(tmp));
    const r1 = runGsdTools(
      ['windows', 'append', '--kind', 'stub', '--phase', '2', '--description', 'x'],
      tmp,
    );
    assert.equal(r1.success, true, `stderr: ${r1.error || ''}`);

    const r2 = runGsdTools(['windows', 'waive', '1', ''], tmp);
    assert.equal(r2.success, false);
    assert.match(r2.error, /waive.*reason|non-empty|reason.*required/i);
  });

  test('waive unknown id fails', (t) => {
    const tmp = createTempDir('bw-waive-unknown-');
    t.after(() => cleanup(tmp));
    const res = runGsdTools(['windows', 'waive', '999', 'because'], tmp);
    assert.equal(res.success, false);
    assert.match(res.error, /no window|id 999|not found/i);
  });
});

// ---------------------------------------------------------------------------
// CLI: gsd-tools windows fixed (acceptance: fixed removes from blocking set)
// ---------------------------------------------------------------------------

describe('broken-windows CLI: windows fixed', () => {
  test('fixed removes the entry from the blocking set', (t) => {
    const tmp = createTempDir('bw-fixed-');
    t.after(() => cleanup(tmp));

    const r1 = runGsdTools(
      ['windows', 'append', '--kind', 'stub', '--phase', '2', '--description', 'x'],
      tmp,
    );
    assert.equal(r1.success, true, `stderr: ${r1.error || ''}`);

    const rBefore = runGsdTools(['windows', 'status', '--raw'], tmp);
    assert.equal(rBefore.success, true);
    assert.equal(JSON.parse(rBefore.output).ledger.open_count, 1);

    const r2 = runGsdTools(['windows', 'fixed', '1'], tmp);
    assert.equal(r2.success, true, `stderr: ${r2.error || ''}`);
    const obj = JSON.parse(r2.output);
    assert.equal(obj.ledger.open_count, 0);
    assert.equal(obj.ledger.fixed_count, 1);
    assert.equal(obj.ledger.entries[0].status, 'fixed');
  });

  test('fixed on unknown id fails', (t) => {
    const tmp = createTempDir('bw-fixed-unknown-');
    t.after(() => cleanup(tmp));
    const res = runGsdTools(['windows', 'fixed', '999'], tmp);
    assert.equal(res.success, false);
    assert.match(res.error, /no window|id 999|not found/i);
  });
});

// ---------------------------------------------------------------------------
// CLI: full lifecycle — append → waive → append → fixed → clean ship
// ---------------------------------------------------------------------------

describe('broken-windows CLI: lifecycle', () => {
  test('append two, waive one, fix one, then ship is clean', (t) => {
    const tmp = createTempDir('bw-lifecycle-');
    t.after(() => cleanup(tmp));

    const r1 = runGsdTools(['windows', 'append', '--kind', 'stub', '--phase', '2', '--description', 'a'], tmp);
    const r2 = runGsdTools(['windows', 'append', '--kind', 'todo', '--phase', '2', '--description', 'b'], tmp);
    const r3 = runGsdTools(['windows', 'waive', '1', 'deferred to follow-up'], tmp);
    const r4 = runGsdTools(['windows', 'fixed', '2'], tmp);
    assert.equal(r1.success && r2.success && r3.success && r4.success, true,
      `lifecycle steps failed: r1=${r1.error || 'ok'} r2=${r2.error || 'ok'} r3=${r3.error || 'ok'} r4=${r4.error || 'ok'}`);

    const rFinal = runGsdTools(['windows', 'status', '--raw'], tmp);
    assert.equal(rFinal.success, true);
    const status = JSON.parse(rFinal.output);
    assert.equal(status.ledger.open_count, 0); // ship gate would pass
    assert.equal(status.ledger.waived_count, 1);
    assert.equal(status.ledger.fixed_count, 1);
    assert.equal(status.ledger.total_count, 2);
  });
});

// ---------------------------------------------------------------------------
// #3116: parseFrontmatterStrict throws on CRLF WINDOWS.md
// On repos with core.autocrlf=true (Windows default), .planning/WINDOWS.md is
// checked out CRLF. The `\n---` close-fence scan leaves the last line's CR
// attached, and `.` doesn't match CR, so the key:value regex fails.
// ---------------------------------------------------------------------------

describe('#3116: parseLedger handles CRLF ledgers', () => {
  // Build ledgers via renderLedger (the real writer) so the JSON fence
  // format (4-backtick) and structure always match what production emits.
  // parseLedger validates that frontmatter counts match the entries array,
  // so non-zero counts require real entries (appendWindow).

  test('CRLF empty ledger parses without throwing', () => {
    const ledger = emptyLedger();
    ledger.last_updated = '2026-08-06T09:43:08.354Z';
    const lfLedger = renderLedger(ledger);
    const crlfLedger = lfLedger.replace(/\n/g, '\r\n');

    // Must not throw — before the fix this throws WINDOWS_LEDGER_MALFORMED
    // on the last frontmatter key ("last_updated: ...\r")
    const parsed = parseLedger(crlfLedger);
    assert.equal(parsed.schema_version, 1);
    assert.equal(parsed.open_count, 0);
    assert.equal(parsed.last_updated, '2026-08-06T09:43:08.354Z');
  });

  test('CRLF ledger with entries parses correctly', () => {
    let ledger = emptyLedger();
    const { ledger: led1 } = appendWindow(ledger, makeEntry(), { now: '2026-08-06T12:00:00Z' });
    const { ledger: led2 } = appendWindow(led1, makeEntry({ description: 'second' }), { now: '2026-08-06T12:01:00Z' });
    ledger = led2;
    const lfLedger = renderLedger(ledger);
    const crlfLedger = lfLedger.replace(/\n/g, '\r\n');

    const parsed = parseLedger(crlfLedger);
    assert.equal(parsed.open_count, 2);
    assert.equal(parsed.total_count, 2);
    assert.equal(parsed.entries.length, 2);
  });

  test('CRLF and LF ledgers produce identical parse results', () => {
    let ledger = emptyLedger();
    const { ledger: led1 } = appendWindow(ledger, makeEntry(), { now: '2026-08-06T09:43:08Z' });
    ledger = led1;
    const lfLedger = renderLedger(ledger);

    const lfParsed = parseLedger(lfLedger);
    const crlfParsed = parseLedger(lfLedger.replace(/\n/g, '\r\n'));

    assert.deepEqual(crlfParsed, lfParsed);
  });
});

// ---------------------------------------------------------------------------
// #3689: writeLedgerAtomic table-vs-JSON drift guard
//
// `.planning/WINDOWS.md`'s markdown table is a rendered VIEW of the JSON
// fence (the sole source of truth). writeLedgerAtomic re-reads the file only
// to preserve trailing prose (#2893) and then writes renderLedger(ledger)
// unconditionally, with no check that the on-disk table agreed with the JSON
// beforehand — so a hand-edited table cell is silently reverted, and a
// table-only row silently vanishes, on the next append/waive/fixed. See
// .gsd/bug/fix-3689-windows-ledger-table-drift-guard/repro.cjs.
// ---------------------------------------------------------------------------

describe('#3689: windows ledger table-vs-JSON drift guard', () => {
  /** Build a pristine, real-CLI-written two-entry ledger; return its raw text. */
  function seedPristineLedger(t) {
    const seedCwd = createTempDir('bw-3689-seed-');
    t.after(() => cleanup(seedCwd));
    const r1 = runGsdTools(
      ['windows', 'append', '--kind', 'deviation', '--phase', '1', '--description', 'first entry', '--file', 'a/one.sh'],
      seedCwd,
    );
    assert.ok(r1.success, `seed append 1 failed: ${r1.error || ''}`);
    const r2 = runGsdTools(
      ['windows', 'append', '--kind', 'deviation', '--phase', '2', '--description', 'second entry', '--file', 'b/two.sh'],
      seedCwd,
    );
    assert.ok(r2.success, `seed append 2 failed: ${r2.error || ''}`);
    return fs.readFileSync(path.join(seedCwd, '.planning', LEDGER_FILE_NAME), 'utf8');
  }

  /** Index of the line opening the JSON fence (the fenced ```json line), or -1. */
  function jsonFenceLineIndex(lines) {
    return lines.findIndex((l) => /^`{3,}json[ \t]*$/.test(l.trim()));
  }

  /** Flip a table row's `| from |` cell to `| to |`, touching only the table region. */
  function flipTableStatus(raw, rowId, from, to) {
    const lines = raw.split('\n');
    const fenceIdx = jsonFenceLineIndex(lines);
    let flipped = false;
    const out = lines.map((line, idx) => {
      if (flipped || (fenceIdx !== -1 && idx >= fenceIdx)) return line;
      const rowRe = new RegExp(`^\\|\\s*${rowId}\\s*\\|`);
      if (rowRe.test(line) && line.includes(`| ${from} |`)) {
        flipped = true;
        return line.replace(`| ${from} |`, `| ${to} |`);
      }
      return line;
    });
    assert.ok(flipped, `must have found row ${rowId} with status "${from}" to flip`);
    return out.join('\n');
  }

  /** Insert an extra data row (present only in the table, not the JSON) before the fence. */
  function insertTableOnlyRow(raw, rowLine) {
    const lines = raw.split('\n');
    const fenceIdx = jsonFenceLineIndex(lines);
    assert.ok(fenceIdx > 0, 'must locate the JSON fence to insert before');
    let insertAt = fenceIdx;
    while (insertAt > 0 && lines[insertAt - 1].trim() === '') insertAt -= 1;
    lines.splice(insertAt, 0, rowLine);
    return lines.join('\n');
  }

  function writeLedgerFile(tmp, content) {
    fs.mkdirSync(path.join(tmp, '.planning'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.planning', LEDGER_FILE_NAME), content, 'utf8');
  }

  function readLedgerFile(tmp) {
    return fs.readFileSync(path.join(tmp, '.planning', LEDGER_FILE_NAME), 'utf8');
  }

  test('windows append refuses when the rendered table has drifted from the JSON (#3689)', (t) => {
    const pristine = seedPristineLedger(t);
    const tmp = createTempDir('bw-3689-drift-append-');
    t.after(() => cleanup(tmp));
    const drifted = flipTableStatus(pristine, 1, 'open', 'fixed');
    writeLedgerFile(tmp, drifted);
    const before = readLedgerFile(tmp);

    const res = runGsdTools(
      ['windows', 'append', '--kind', 'deviation', '--phase', '99', '--description', 'third entry', '--file', 'c/three.sh'],
      tmp,
      { GSD_JSON_ERRORS: '1' },
    );

    assert.equal(res.success, false, 'append must refuse on table drift');
    const parsed = JSON.parse(res.error);
    assert.equal(parsed.ok, false, `structured error must carry ok:false: ${res.error}`);
    // #3689: the typed reason distinguishes table drift from a generic
    // WINDOWS_LEDGER_MALFORMED parse failure. String literal (not
    // REASON.WINDOWS_LEDGER_TABLE_DRIFT) because that constant does not
    // exist on the shipped module today — referencing it would compare
    // undefined === undefined and pass vacuously before the fix lands.
    assert.equal(parsed.reason, 'windows_ledger_table_drift', `expected typed drift reason, got: ${res.error}`);
    assert.match(parsed.message, /\b1\b/, 'failure message must name the drifted row id');
    assert.equal(readLedgerFile(tmp), before, 'the file must be byte-identical to the pre-image after a refusal');
  });

  test('windows append refuses a table-only row instead of erasing it (#3689)', (t) => {
    const pristine = seedPristineLedger(t);
    const tmp = createTempDir('bw-3689-tableonly-');
    t.after(() => cleanup(tmp));
    const extraRow = '| 99 | 42 | deviation | z/table-only.sh | - | table only row | open | - | - | - |';
    const withExtraRow = insertTableOnlyRow(pristine, extraRow);
    writeLedgerFile(tmp, withExtraRow);
    const before = readLedgerFile(tmp);

    const res = runGsdTools(
      ['windows', 'append', '--kind', 'deviation', '--phase', '7', '--description', 'fourth entry', '--file', 'd/four.sh'],
      tmp,
      { GSD_JSON_ERRORS: '1' },
    );

    assert.equal(res.success, false, 'append must refuse rather than silently drop the table-only row');
    const parsed = JSON.parse(res.error);
    assert.equal(parsed.ok, false, `structured error must carry ok:false: ${res.error}`);
    assert.equal(parsed.reason, 'windows_ledger_table_drift', `expected typed drift reason, got: ${res.error}`);
    assert.match(parsed.message, /\b99\b/, 'failure message must name the drifted (table-only) row id');
    assert.ok(readLedgerFile(tmp).includes('table only row'), 'the table-only row must still be present after refusal');
    assert.equal(readLedgerFile(tmp), before, 'the file must be byte-identical to the pre-image after a refusal');
  });

  test('windows waive refuses on table drift (#3689)', (t) => {
    const pristine = seedPristineLedger(t);
    const tmp = createTempDir('bw-3689-drift-waive-');
    t.after(() => cleanup(tmp));
    const drifted = flipTableStatus(pristine, 1, 'open', 'fixed');
    writeLedgerFile(tmp, drifted);
    const before = readLedgerFile(tmp);

    const res = runGsdTools(['windows', 'waive', '2', 'covered by manual QA'], tmp, { GSD_JSON_ERRORS: '1' });

    assert.equal(res.success, false, 'waive must refuse on table drift');
    const parsed = JSON.parse(res.error);
    assert.equal(parsed.ok, false, `structured error must carry ok:false: ${res.error}`);
    assert.equal(parsed.reason, 'windows_ledger_table_drift', `expected typed drift reason, got: ${res.error}`);
    assert.match(parsed.message, /\b1\b/, 'failure message must name the drifted row id');
    assert.equal(readLedgerFile(tmp), before, 'the file must be byte-identical to the pre-image after a refusal');
  });

  test('windows fixed refuses on table drift (#3689)', (t) => {
    const pristine = seedPristineLedger(t);
    const tmp = createTempDir('bw-3689-drift-fixed-');
    t.after(() => cleanup(tmp));
    const drifted = flipTableStatus(pristine, 1, 'open', 'fixed');
    writeLedgerFile(tmp, drifted);
    const before = readLedgerFile(tmp);

    const res = runGsdTools(['windows', 'fixed', '2'], tmp, { GSD_JSON_ERRORS: '1' });

    assert.equal(res.success, false, 'fixed must refuse on table drift');
    const parsed = JSON.parse(res.error);
    assert.equal(parsed.ok, false, `structured error must carry ok:false: ${res.error}`);
    assert.equal(parsed.reason, 'windows_ledger_table_drift', `expected typed drift reason, got: ${res.error}`);
    assert.match(parsed.message, /\b1\b/, 'failure message must name the drifted row id');
    assert.equal(readLedgerFile(tmp), before, 'the file must be byte-identical to the pre-image after a refusal');
  });

  test('windows append detects drift on a non-first row (#3689)', (t) => {
    const pristine = seedPristineLedger(t);
    const tmp = createTempDir('bw-3689-drift-second-row-');
    t.after(() => cleanup(tmp));
    const drifted = flipTableStatus(pristine, 2, 'open', 'fixed');
    writeLedgerFile(tmp, drifted);
    const before = readLedgerFile(tmp);

    const res = runGsdTools(
      ['windows', 'append', '--kind', 'deviation', '--phase', '5', '--description', 'fifth entry', '--file', 'e/five.sh'],
      tmp,
      { GSD_JSON_ERRORS: '1' },
    );

    assert.equal(res.success, false, 'append must detect drift on the second data row, not just the first');
    const parsed = JSON.parse(res.error);
    assert.equal(parsed.ok, false, `structured error must carry ok:false: ${res.error}`);
    assert.equal(parsed.reason, 'windows_ledger_table_drift', `expected typed drift reason, got: ${res.error}`);
    assert.match(parsed.message, /\b2\b/, 'failure message must name the drifted row id (2), not just row 1');
    assert.equal(readLedgerFile(tmp), before, 'the file must be byte-identical to the pre-image after a refusal');
  });

  // --- Anti-tightening / negative-space pins: must stay green before AND after the fix ---

  test('windows append still succeeds when the table agrees with the JSON (#3689)', (t) => {
    const tmp = createTempDir('bw-3689-agree-');
    t.after(() => cleanup(tmp));
    const r1 = runGsdTools(
      ['windows', 'append', '--kind', 'deviation', '--phase', '1', '--description', 'first entry'],
      tmp,
    );
    assert.ok(r1.success, `seed append failed: ${r1.error || ''}`);

    const res = runGsdTools(
      ['windows', 'append', '--kind', 'deviation', '--phase', '2', '--description', 'second entry'],
      tmp,
    );
    assert.equal(res.success, true, `append must succeed on an agreeing table: ${res.error || ''}`);
    const obj = JSON.parse(res.output);
    assert.equal(obj.entry.id, 2);
    assert.equal(obj.ledger.total_count, 2);
  });

  test('windows append still creates the ledger when none exists (#3689)', (t) => {
    const tmp = createTempDir('bw-3689-nofile-');
    t.after(() => cleanup(tmp));
    assert.equal(fs.existsSync(path.join(tmp, '.planning', LEDGER_FILE_NAME)), false);

    const res = runGsdTools(
      ['windows', 'append', '--kind', 'stub', '--phase', '1', '--description', 'first ever entry'],
      tmp,
    );
    assert.equal(res.success, true, `append must create the ledger with no pre-image to disagree with: ${res.error || ''}`);
    assert.equal(fs.existsSync(path.join(tmp, '.planning', LEDGER_FILE_NAME)), true);
  });

  test('windows append preserves trailing prose when the guard passes (#2893 + #3689)', (t) => {
    const tmp = createTempDir('bw-3689-prose-');
    t.after(() => cleanup(tmp));
    const r1 = runGsdTools(
      ['windows', 'append', '--kind', 'stub', '--phase', '1', '--description', 'prose carrier'],
      tmp,
    );
    assert.ok(r1.success, `seed append failed: ${r1.error || ''}`);
    const ledgerPath = path.join(tmp, '.planning', LEDGER_FILE_NAME);
    fs.writeFileSync(ledgerPath, fs.readFileSync(ledgerPath, 'utf8') + 'Operator notes below the ledger.\n', 'utf8');

    const res = runGsdTools(
      ['windows', 'append', '--kind', 'stub', '--phase', '2', '--description', 'second entry'],
      tmp,
    );
    assert.equal(res.success, true, `append must succeed when the table agrees: ${res.error || ''}`);
    assert.ok(
      fs.readFileSync(ledgerPath, 'utf8').includes('Operator notes below the ledger.'),
      'trailing prose must survive an append that passes the drift guard',
    );
  });

  test('windows append tolerates a 3-backtick fence when locating the table (#3657 + #3689)', (t) => {
    const tmp = createTempDir('bw-3689-narrowfence-');
    t.after(() => cleanup(tmp));
    const r1 = runGsdTools(
      ['windows', 'append', '--kind', 'stub', '--phase', '1', '--description', 'narrowed fence entry'],
      tmp,
    );
    assert.ok(r1.success, `seed append failed: ${r1.error || ''}`);
    const ledgerPath = path.join(tmp, '.planning', LEDGER_FILE_NAME);
    fs.writeFileSync(
      ledgerPath,
      fs.readFileSync(ledgerPath, 'utf8')
        .replace(/^````json$/m, '```json')
        .replace(/^````$/m, '```'),
      'utf8',
    );

    const res = runGsdTools(
      ['windows', 'append', '--kind', 'stub', '--phase', '2', '--description', 'second entry'],
      tmp,
    );
    assert.equal(res.success, true, `append must tolerate a 3-backtick fence when the table agrees: ${res.error || ''}`);
  });

  test('windows append does not trip the guard on escaped pipes and backslashes (#3689)', (t) => {
    const tmp = createTempDir('bw-3689-escaping-');
    t.after(() => cleanup(tmp));
    const r1 = runGsdTools(
      ['windows', 'append', '--kind', 'stub', '--phase', '1',
       '--description', 'path with \\| separator and | pipe and \\ backslash'],
      tmp,
    );
    assert.ok(r1.success, `seed append with escaped content failed: ${r1.error || ''}`);

    const res = runGsdTools(
      ['windows', 'append', '--kind', 'stub', '--phase', '2', '--description', 'second entry'],
      tmp,
    );
    assert.equal(res.success, true, `append must not false-positive on escaped pipes/backslashes: ${res.error || ''}`);
  });

  test('windows append tolerates the empty-ledger table rendering (#3689)', (t) => {
    const tmp = createTempDir('bw-3689-emptytable-');
    t.after(() => cleanup(tmp));
    writeLedgerFile(tmp, renderLedger(emptyLedger('2026-08-24T00:00:00Z')));
    assert.ok(
      readLedgerFile(tmp).includes('_(none)_'),
      'precondition: seeded ledger renders the empty-table placeholder row',
    );

    const res = runGsdTools(
      ['windows', 'append', '--kind', 'stub', '--phase', '1', '--description', 'first real entry'],
      tmp,
    );
    assert.equal(res.success, true, `append must succeed against the empty-ledger placeholder table: ${res.error || ''}`);
    assert.equal(JSON.parse(res.output).entry.id, 1);
  });

  test('windows append tolerates trailing prose that itself contains a fenced JSON array (#2893 + #3689)', (t) => {
    const pristine = seedPristineLedger(t);
    const tmp = createTempDir('bw-3689-prose-jsonarray-');
    t.after(() => cleanup(tmp));
    // The pristine ledger has 2 entries. The trailing prose's fenced JSON
    // array below has a DIFFERENT length (3) than the real entries list, so
    // a wrong binding (matching the prose block instead of the ledger block)
    // is unambiguous: it would make onDiskEntries.length disagree with the
    // real 2-entry table, tripping the drift guard on a ledger that never
    // drifted.
    const withProse = `${pristine}Operator notes below the ledger.\n\n` +
      '```json\n[{"note": "a"}, {"note": "b"}, {"note": "c"}]\n```\n';
    writeLedgerFile(tmp, withProse);

    const res = runGsdTools(
      ['windows', 'append', '--kind', 'deviation', '--phase', '3', '--description', 'third entry', '--file', 'c/three.sh'],
      tmp,
      { GSD_JSON_ERRORS: '1' },
    );

    assert.equal(res.success, true, `append must succeed — the ledger table agrees with the real JSON entries, not the unrelated prose array: ${res.error || ''}`);
    const obj = JSON.parse(res.output);
    assert.equal(obj.entry.description, 'third entry');
    assert.equal(obj.ledger.total_count, 3);
    const written = readLedgerFile(tmp);
    assert.ok(written.includes('third entry'), 'new entry must be present in the written ledger');

    // #3689 bug discovery: the trailing prose text ABOVE the fenced array
    // must survive byte-for-byte. A wrong binding (locateJsonBlock resolving
    // to the prose's own fenced array instead of the real ledger block)
    // computes `trailingProse` from the PROSE fence's afterClose, silently
    // dropping everything between the real ledger block and the prose
    // block — including "Operator notes below the ledger." itself. Asserting
    // only append-succeeds (as this test did before) cannot catch that: the
    // write still succeeds, it just discards the operator's prose.
    const trailingProse = 'Operator notes below the ledger.\n\n' +
      '```json\n[{"note": "a"}, {"note": "b"}, {"note": "c"}]\n```\n';
    assert.ok(
      written.includes(trailingProse),
      'trailing prose above and including the fenced JSON array must survive byte-for-byte',
    );
  });

  test('windows append tolerates a description containing a newline (#3689)', (t) => {
    const tmp = createTempDir('bw-3689-newline-desc-');
    t.after(() => cleanup(tmp));
    // validateDescription (src/broken-windows.cts:198) rejects only empty
    // strings and 4-backtick runs, not \n — and renderTable's cell() escapes
    // `\` and `|` but not newlines, so this row physically spans two file
    // lines. A `|`-prefix scan of the pre-fence text stops dead at that
    // continuation line; the header-anchored fix must not.
    const r1 = runGsdTools(
      ['windows', 'append', '--kind', 'deviation', '--phase', '1', '--description', 'line one\nline two', '--file', 'a/one.sh'],
      tmp,
    );
    assert.ok(r1.success, `seed append with newline description failed: ${r1.error || ''}`);

    const res = runGsdTools(
      ['windows', 'append', '--kind', 'deviation', '--phase', '2', '--description', 'second entry', '--file', 'b/two.sh'],
      tmp,
    );
    assert.equal(
      res.success,
      true,
      `append must succeed on a ledger whose only row has an embedded newline, not brick with windows_ledger_table_drift: ${res.error || ''}`,
    );
    const obj = JSON.parse(res.output);
    assert.equal(obj.ledger.total_count, 2);
    assert.equal(obj.ledger.entries[0].description, 'line one\nline two');
    assert.equal(obj.ledger.entries[1].description, 'second entry');
  });

  test('windows append still detects drift on a ledger whose description contains a newline (#3689)', (t) => {
    const tmp = createTempDir('bw-3689-newline-desc-drift-');
    t.after(() => cleanup(tmp));
    const r1 = runGsdTools(
      ['windows', 'append', '--kind', 'deviation', '--phase', '1', '--description', 'line one\nline two', '--file', 'a/one.sh'],
      tmp,
    );
    assert.ok(r1.success, `seed append 1 failed: ${r1.error || ''}`);
    const r2 = runGsdTools(
      ['windows', 'append', '--kind', 'deviation', '--phase', '2', '--description', 'second entry', '--file', 'b/two.sh'],
      tmp,
    );
    assert.ok(r2.success, `seed append 2 failed: ${r2.error || ''}`);

    // Hand-edit a DIFFERENT row's (row 2, single-line) status cell. Proves the
    // wider header-anchored region does not blind the guard: row 1's embedded
    // newline must not swallow row 2's drift.
    const pristine = readLedgerFile(tmp);
    const drifted = flipTableStatus(pristine, 2, 'open', 'fixed');
    writeLedgerFile(tmp, drifted);
    const before = readLedgerFile(tmp);

    const res = runGsdTools(
      ['windows', 'append', '--kind', 'deviation', '--phase', '3', '--description', 'third entry', '--file', 'c/three.sh'],
      tmp,
      { GSD_JSON_ERRORS: '1' },
    );

    assert.equal(res.success, false, 'append must still detect drift on row 2 even though row 1 spans multiple physical lines');
    const parsed = JSON.parse(res.error);
    assert.equal(parsed.ok, false, `structured error must carry ok:false: ${res.error}`);
    assert.equal(parsed.reason, 'windows_ledger_table_drift', `expected typed drift reason, got: ${res.error}`);
    assert.match(parsed.message, /\b2\b/, 'failure message must name the drifted row id (2)');
    assert.equal(readLedgerFile(tmp), before, 'the file must be byte-identical to the pre-image after a refusal');
  });

  test('extractTableRegion terminates when the header literal starts the candidate region (#3689)', () => {
    // #3689: the backward header search's fallback bound `searchFrom = idx - 1`
    // becomes -1 when the ONLY candidate match sits at index 0 and fails the
    // atLineEnd check. String.prototype.lastIndexOf clamps a negative position
    // to 0 per spec, so the next iteration re-finds the same rejected match at
    // idx 0 forever — a candidate that STARTS with the header literal followed
    // by a non-newline character reproduces this exactly. This must return
    // promptly (a regression here hangs the test process, not fail it).
    const TABLE_HEADER_LINE =
      '| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |';
    const raw = `${TABLE_HEADER_LINE}X\n\`\`\`\`json\n[]\n\`\`\`\`\n`;
    const result = brokenWindowsLib.extractTableRegion(raw);
    // No line-anchored header match exists (the only occurrence is followed by
    // "X", not a newline/EOF), so the corrected backward search must exhaust
    // its bound and report "no header found" rather than hang.
    assert.equal(result, null, 'extractTableRegion must return null when no line-anchored header match exists');
  });
});

// ---------------------------------------------------------------------------
// #3689 property: table region extraction round-trips to renderTable
//
// CONTRACT PIN (not a guess — the fix MUST match this exactly):
// The #3689 fix must export from src/broken-windows.cts:
//   - `renderTable(entries: WindowEntry[]): string` — the existing private
//     renderer, promoted to an export.
//   - `extractTableRegion(raw: string): string | null` — returns the exact
//     table text of a rendered ledger, or null when no table region can be
//     located.
// The property below asserts
//   extractTableRegion(renderLedger(ledger)) === renderTable(ledger.entries)
// for every generated ledger. Neither symbol is exported by the shipped
// module today, so this property fails immediately on the `typeof`
// assertions below — that is a correct failure (the contract this test
// encodes does not exist yet), not a flake.
// ---------------------------------------------------------------------------

describe('#3689 property: table region extraction round-trip', () => {
  const arbPropKind = fc.constantFrom(
    'stub', 'todo', 'fixme', 'skipped-test', 'lint-warning', 'unmet-truth', 'unrun-verify', 'deviation',
  );
  // #3689: descriptions CAN contain an embedded newline — validateDescription
  // rejects only empty strings and 4-backtick runs (src/broken-windows.cts:198)
  // — which is exactly why the prior `|`-prefix table-region scan could brick
  // a clean ledger. Strip only `\r` (CRLF-normalize) so `\n` survives into the
  // generated description and this property exercises the multi-physical-line
  // row case the header-anchored fix must round-trip.
  const arbPropDescription = fc.oneof(
    fc.constant(''),
    fc.string({ maxLength: 40 }),
    fc.constant('has | a pipe'),
    fc.constant('has \\ a backslash'),
    fc.constant('both \\| combined'),
    fc.constant('line one\nline two'),
  ).map((s) => s.replace(/\r/g, ''));

  const arbPropEntry = fc.record({
    id: fc.integer({ min: 1, max: 500 }),
    kind: arbPropKind,
    phase: fc.integer({ min: 0, max: 99 }).map(String),
    file: fc.oneof(fc.constant(''), fc.constant('src/x.ts')),
    line: fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 9999 })),
    description: arbPropDescription,
    status: fc.constantFrom('open', 'waived', 'fixed'),
    reason: fc.oneof(fc.constant(''), fc.constant('justified')),
    recorded_at: fc.constant('2026-08-24T00:00:00Z'),
    resolved_at: fc.oneof(fc.constant(null), fc.constant('2026-08-24T01:00:00Z')),
  });

  test('property: the table region extracted from a rendered ledger round-trips to renderTable (#3689)', () => {
    fc.assert(fc.property(fc.array(arbPropEntry, { maxLength: 5 }), (entries) => {
      assert.equal(
        typeof brokenWindowsLib.extractTableRegion,
        'function',
        'extractTableRegion must be exported by the #3689 fix — writeLedgerAtomic\'s ' +
          'drift guard needs it to parse the on-disk table region independently of the ' +
          'JSON block; not yet exported, so this property fails today for the right reason.',
      );
      assert.equal(
        typeof brokenWindowsLib.renderTable,
        'function',
        'renderTable must be exported so this property can compare against the real ' +
          'renderer instead of a test-side reimplementation; not yet exported (module-private today).',
      );

      const ledger = {
        schema_version: 1,
        open_count: entries.filter((e) => e.status === 'open').length,
        waived_count: entries.filter((e) => e.status === 'waived').length,
        fixed_count: entries.filter((e) => e.status === 'fixed').length,
        total_count: entries.length,
        last_updated: '2026-08-24T00:00:00Z',
        entries,
      };
      const rendered = renderLedger(ledger);
      const extracted = brokenWindowsLib.extractTableRegion(rendered);
      const expected = brokenWindowsLib.renderTable(entries);
      assert.equal(extracted, expected, 'extracted table region must match renderTable(entries) exactly');
    }));
  });
});

// ---------------------------------------------------------------------------
// #1950-H2 / #3689 review finding: writeLedgerAtomic's pre-image read must
// not treat every fs error as "no ledger yet". A bare catch there would let
// EACCES/EIO/etc. fall through as if the file were absent, silently skipping
// the drift guard and overwriting an unreadable pre-image — a guard that can
// be bypassed by making the file unreadable is not a guard. This had no
// coverage.
//
// Injection method: monkeypatch `fs.readFileSync` and restore it in a
// `finally` (CONTRIBUTING.md fault-injection convention; mirrors
// tests/verify-command-grounding.test.cjs "row 24 — unreadable phase
// degrades, never throws"). `fs.chmodSync(path, 0o000)` is not used: root
// (how CI/Docker run) bypasses mode bits entirely, so that approach would
// pass with zero real coverage. This must go in-process (not through
// runGsdTools) because a monkeypatch in the parent process is invisible to a
// child process.
// ---------------------------------------------------------------------------

describe('#1950-H2 / #3689: writeLedgerAtomic pre-image read failure', () => {
  test('windows append refuses when the pre-image is unreadable rather than silently overwriting it (#1950-H2 + #3689)', (t) => {
    const tmp = createTempDir('bw-3689-unreadable-preimage-');
    t.after(() => cleanup(tmp));

    // Seed a real, on-disk ledger via a genuine (unmocked) append. The
    // branch under test is reached only when readFileSync throws something
    // OTHER than ENOENT, which requires a pre-image to actually exist.
    cmdWindowsAppend(tmp, ['--kind', 'stub', '--phase', '1', '--description', 'seed entry'], {});
    const ledgerPath = path.join(tmp, '.planning', LEDGER_FILE_NAME);
    assert.ok(fs.existsSync(ledgerPath), 'guard: seed append must have written a ledger file');
    const pristine = fs.readFileSync(ledgerPath, 'utf8');

    const originalReadFileSync = fs.readFileSync;
    let caught;
    try {
      fs.readFileSync = (p, ...rest) => {
        if (typeof p === 'string' && path.resolve(p) === path.resolve(ledgerPath)) {
          throw Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
        }
        return originalReadFileSync.call(fs, p, ...rest);
      };

      try {
        cmdWindowsAppend(tmp, ['--kind', 'stub', '--phase', '2', '--description', 'second entry'], {});
      } catch (e) {
        caught = e;
      }
    } finally {
      fs.readFileSync = originalReadFileSync;
    }

    assert.ok(caught, 'an unreadable pre-image must throw, not proceed to overwrite the file');
    assert.ok(caught instanceof WindowsError, 'must surface as a typed WindowsError, not a bare fs error');
    assert.equal(caught.reason, REASON.WINDOWS_LEDGER_MALFORMED);
    assert.match(caught.message, /EACCES/, 'message must name the errno that made the pre-image unreadable');
    assert.ok(
      caught.message.includes(ledgerPath),
      `message must name the unreadable path (${ledgerPath}): ${caught.message}`,
    );

    // Fail-closed: the on-disk ledger must be byte-identical to the
    // pre-image seeded above — no partial or silent overwrite occurred.
    assert.equal(
      fs.readFileSync(ledgerPath, 'utf8'),
      pristine,
      'an unreadable pre-image must not be overwritten',
    );
  });
});

// ---------------------------------------------------------------------------
// Fixtures for the reason/amend/reconcile surface
// ---------------------------------------------------------------------------

/** A full WindowEntry (not the append input shape) for raw-ledger fixtures. */
function makeRawEntry(overrides = {}) {
  return {
    id: 1,
    kind: 'stub',
    phase: '2',
    file: '',
    line: null,
    description: 'hardcoded empty list',
    status: 'open',
    reason: '',
    recorded_at: '2026-08-09T00:00:00Z',
    resolved_at: null,
    ...overrides,
  };
}

/**
 * Render a ledger file with EXPLICIT frontmatter counts, so a test can pin
 * counts that disagree with the entries — the hand-edit drift shape that
 * bricks every read (issue: markFixed took no reason, so operators hand-wrote
 * the rationale into WINDOWS.md and the counts drifted).
 */
function rawLedgerWithCounts(entries, counts) {
  return [
    '---',
    'schema_version: 1',
    `open_count: ${counts.open}`,
    `waived_count: ${counts.waived}`,
    `fixed_count: ${counts.fixed}`,
    `total_count: ${counts.total}`,
    'last_updated: 2026-08-09T00:00:00Z',
    '---',
    '',
    '# Broken Windows Ledger',
    '',
    '````json',
    JSON.stringify(entries, null, 2),
    '````',
    '',
  ].join('\n');
}

function writeLedger(tmp, raw) {
  fs.mkdirSync(path.join(tmp, '.planning'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '.planning', LEDGER_FILE_NAME), raw, 'utf8');
}

function readLedgerFile(tmp) {
  return fs.readFileSync(path.join(tmp, '.planning', LEDGER_FILE_NAME), 'utf8');
}

// ---------------------------------------------------------------------------
// Pure: markFixed carries a reason (parity with markWaived)
// ---------------------------------------------------------------------------

describe('broken-windows: markFixed with a recorded reason', () => {
  test('fixed with a reason records it in the reason column', () => {
    let led = emptyLedger('now');
    ({ ledger: led } = appendWindow(led, makeEntry(), { now: 't1' }));
    led = markFixed(led, 1, 'closed by commit abc123 — the query now scopes by org', { now: 't2' });

    assert.equal(led.entries[0].status, 'fixed');
    assert.equal(led.entries[0].reason, 'closed by commit abc123 — the query now scopes by org');
    assert.equal(led.entries[0].resolved_at, 't2');
    assert.equal(led.fixed_count, 1);
    assert.equal(led.open_count, 0);
  });

  test('fixed WITHOUT a reason keeps the pre-reason 3-arg signature (opts third) working', () => {
    // Backward compatibility: every existing caller passes `{ now }` third.
    // That call must still resolve the entry and leave reason empty — no
    // silent coercion of the opts object into the reason column.
    let led = emptyLedger('now');
    ({ ledger: led } = appendWindow(led, makeEntry(), { now: 't1' }));
    led = markFixed(led, 1, { now: 't2' });

    assert.equal(led.entries[0].status, 'fixed');
    assert.equal(led.entries[0].reason, '');
    assert.equal(led.entries[0].resolved_at, 't2', 'opts.now must still be honored when passed third');
  });

  test('fixed with reason third and opts fourth honors both', () => {
    let led = emptyLedger('now');
    ({ ledger: led } = appendWindow(led, makeEntry(), { now: 't1' }));
    led = markFixed(led, 1, 'evidence: LIVE-EVIDENCE.md §3', { now: 't2' });
    assert.equal(led.entries[0].reason, 'evidence: LIVE-EVIDENCE.md §3');
    assert.equal(led.entries[0].resolved_at, 't2');
  });

  test('whitespace-only fixed reason records as empty (no fake rationale)', () => {
    let led = emptyLedger('now');
    ({ ledger: led } = appendWindow(led, makeEntry(), { now: 't1' }));
    led = markFixed(led, 1, '   ', { now: 't2' });
    assert.equal(led.entries[0].reason, '');
  });

  test('fixed reason rejects a 4-backtick run (fence integrity — same discipline as description)', () => {
    let led = emptyLedger('now');
    ({ ledger: led } = appendWindow(led, makeEntry(), { now: 't1' }));
    assert.throws(
      () => markFixed(led, 1, 'see ```` the fence', { now: 't2' }),
      reasonIs(REASON.WINDOWS_INVALID_TEXT),
    );
  });

  test('waive reason rejects a 4-backtick run (the same hole on the waive path)', () => {
    let led = emptyLedger('now');
    ({ ledger: led } = appendWindow(led, makeEntry(), { now: 't1' }));
    assert.throws(
      () => markWaived(led, 1, 'see ```` the fence', { now: 't2' }),
      reasonIs(REASON.WINDOWS_INVALID_TEXT),
    );
  });

  test('a reason-carrying fixed entry reparses (the closure survives a round trip)', () => {
    let led = emptyLedger('now');
    ({ ledger: led } = appendWindow(led, makeEntry(), { now: 't1' }));
    led = markFixed(led, 1, 'closed: pipe | and backslash \\ in the rationale', { now: 't2' });
    const reparsed = parseLedger(renderLedger(led));
    assert.equal(reparsed.entries[0].reason, 'closed: pipe | and backslash \\ in the rationale');
    assert.equal(reparsed.fixed_count, 1);
  });
});

// ---------------------------------------------------------------------------
// Pure: amendWindow (mechanical edit of an existing entry)
// ---------------------------------------------------------------------------

describe('broken-windows: amendWindow', () => {
  test('amend rewrites the description of an OPEN entry, leaving status and counts alone', () => {
    let led = emptyLedger('now');
    ({ ledger: led } = appendWindow(led, makeEntry({ description: 'both halves of the defect' }), { now: 't1' }));
    led = amendWindow(led, 1, { description: 'only the surviving half' }, { now: 't2' });

    assert.equal(led.entries[0].description, 'only the surviving half');
    assert.equal(led.entries[0].status, 'open');
    assert.equal(led.entries[0].resolved_at, null);
    assert.equal(led.open_count, 1);
    assert.equal(led.total_count, 1);
    assert.equal(led.last_updated, 't2');
  });

  test('amend rewrites a RESOLVED entry (closure text is editable after resolution)', () => {
    // The whole point: a hand-annotated closure must be normalizable by the
    // tool. assertOpen must NOT gate amend.
    let led = emptyLedger('now');
    ({ ledger: led } = appendWindow(led, makeEntry(), { now: 't1' }));
    led = markFixed(led, 1, 'first pass', { now: 't2' });
    led = amendWindow(led, 1, { reason: 'closed by 413.7 — evidence: EVIDENCE.md §3' }, { now: 't3' });

    assert.equal(led.entries[0].status, 'fixed');
    assert.equal(led.entries[0].reason, 'closed by 413.7 — evidence: EVIDENCE.md §3');
    assert.equal(led.entries[0].resolved_at, 't2', 'amend must not re-stamp resolved_at');
    assert.equal(led.fixed_count, 1);
  });

  test('amend corrects a stale file pointer and line', () => {
    let led = emptyLedger('now');
    ({ ledger: led } = appendWindow(led, makeEntry({ file: 'src/wrong.ts', line: 10 }), { now: 't1' }));
    led = amendWindow(led, 1, { file: 'src/right.ts', line: 42 }, { now: 't2' });
    assert.equal(led.entries[0].file, 'src/right.ts');
    assert.equal(led.entries[0].line, 42);
  });

  test('amend with an empty field set throws USAGE (a no-op write is a mistake)', () => {
    let led = emptyLedger('now');
    ({ ledger: led } = appendWindow(led, makeEntry(), { now: 't1' }));
    assert.throws(() => amendWindow(led, 1, {}, { now: 't2' }), reasonIs(REASON.WINDOWS_USAGE));
  });

  test('amend on an unknown id throws ID_NOT_FOUND', () => {
    const led = emptyLedger('now');
    assert.throws(
      () => amendWindow(led, 999, { description: 'x' }, { now: 't' }),
      reasonIs(REASON.WINDOWS_ID_NOT_FOUND),
    );
  });

  test('amend re-validates every field it writes (traversal, empty description, 4-backtick, line)', () => {
    let led = emptyLedger('now');
    ({ ledger: led } = appendWindow(led, makeEntry(), { now: 't1' }));
    assert.throws(() => amendWindow(led, 1, { file: '../../etc/passwd' }), reasonIs(REASON.WINDOWS_INVALID_FILE));
    assert.throws(() => amendWindow(led, 1, { description: '   ' }), reasonIs(REASON.WINDOWS_APPEND_MISSING_FIELD));
    assert.throws(() => amendWindow(led, 1, { description: 'four ```` ticks' }), reasonIs(REASON.WINDOWS_INVALID_TEXT));
    assert.throws(() => amendWindow(led, 1, { reason: 'four ```` ticks' }), reasonIs(REASON.WINDOWS_INVALID_TEXT));
    assert.throws(() => amendWindow(led, 1, { line: 0 }), reasonIs(REASON.WINDOWS_APPEND_MISSING_FIELD));
  });

  test('amended ledger reparses (fence stays valid)', () => {
    let led = emptyLedger('now');
    ({ ledger: led } = appendWindow(led, makeEntry(), { now: 't1' }));
    led = amendWindow(led, 1, { description: 'narrowed | with a pipe' }, { now: 't2' });
    const reparsed = parseLedger(renderLedger(led));
    assert.equal(reparsed.entries[0].description, 'narrowed | with a pipe');
  });
});

// ---------------------------------------------------------------------------
// Pure: reconcileLedger (the ONLY lenient path — count self-heal)
// ---------------------------------------------------------------------------

describe('broken-windows: reconcileLedger', () => {
  const driftedRaw = () => rawLedgerWithCounts(
    [
      makeRawEntry({ id: 1, status: 'open' }),
      makeRawEntry({ id: 2, status: 'fixed', reason: 'hand-written rationale', resolved_at: '2026-08-09T01:00:00Z' }),
    ],
    // Frontmatter claims 2 open / 0 fixed; the entries say 1 open / 1 fixed.
    { open: 2, waived: 0, fixed: 0, total: 2 },
  );

  test('parseLedger STILL fails closed on count drift (reconcile must not leak into normal reads)', () => {
    assert.throws(() => parseLedger(driftedRaw()), reasonIs(REASON.WINDOWS_LEDGER_MALFORMED));
  });

  test('reconcileLedger re-derives the counts from the entries', () => {
    const res = reconcileLedger(driftedRaw(), { now: '2026-08-09T02:00:00Z' });
    assert.equal(res.repaired, true);
    assert.equal(res.ledger.open_count, 1);
    assert.equal(res.ledger.fixed_count, 1);
    assert.equal(res.ledger.waived_count, 0);
    assert.equal(res.ledger.total_count, 2);
    assert.equal(res.ledger.last_updated, '2026-08-09T02:00:00Z');
    // Entries survive verbatim — reconcile repairs the counts, never the data.
    assert.equal(res.ledger.entries[1].reason, 'hand-written rationale');
  });

  test('reconcileLedger reports the pre-repair counts so the drift is auditable', () => {
    const res = reconcileLedger(driftedRaw(), { now: 't' });
    assert.deepEqual(res.before, { open_count: 2, waived_count: 0, fixed_count: 0, total_count: 2 });
  });

  test('a reconciled ledger parses under the STRICT reader', () => {
    const res = reconcileLedger(driftedRaw(), { now: 't' });
    const reparsed = parseLedger(renderLedger(res.ledger));
    assert.equal(reparsed.open_count, 1);
    assert.equal(reparsed.fixed_count, 1);
  });

  test('reconcileLedger on an already-consistent ledger reports repaired=false and does not bump last_updated', () => {
    const consistent = rawLedgerWithCounts([makeRawEntry({ id: 1 })], { open: 1, waived: 0, fixed: 0, total: 1 });
    const res = reconcileLedger(consistent, { now: '2026-08-09T02:00:00Z' });
    assert.equal(res.repaired, false);
    assert.equal(res.ledger.last_updated, '2026-08-09T00:00:00Z');
  });

  test('reconcileLedger still fails on real corruption (it repairs counts, not a broken JSON block)', () => {
    const corrupt = [
      '---',
      'schema_version: 1',
      'open_count: 1',
      'waived_count: 0',
      'fixed_count: 0',
      'total_count: 1',
      'last_updated: 2026-08-09T00:00:00Z',
      '---',
      '',
      '````json',
      '[ { "id": 1, "kind": ',
      '````',
      '',
    ].join('\n');
    assert.throws(() => reconcileLedger(corrupt, { now: 't' }), reasonIs(REASON.WINDOWS_LEDGER_MALFORMED));
  });

  test('reconcileLedger still enforces the entry shape (a bogus status is corruption, not drift)', () => {
    const bogus = rawLedgerWithCounts([makeRawEntry({ id: 1, status: 'halfway' })], { open: 1, waived: 0, fixed: 0, total: 1 });
    assert.throws(() => reconcileLedger(bogus, { now: 't' }), reasonIs(REASON.WINDOWS_LEDGER_MALFORMED));
  });
});

// ---------------------------------------------------------------------------
// CLI: windows fixed <id> "<reason>"
// ---------------------------------------------------------------------------

describe('broken-windows CLI: windows fixed with a reason', () => {
  test('fixed <id> "<reason>" records the rationale in the ledger', (t) => {
    const tmp = createTempDir('bw-fixed-reason-');
    t.after(() => cleanup(tmp));

    const r1 = runGsdTools(['windows', 'append', '--kind', 'stub', '--phase', '2', '--description', 'x'], tmp);
    assert.equal(r1.success, true, `stderr: ${r1.error || ''}`);

    const r2 = runGsdTools(['windows', 'fixed', '1', 'closed by 413.5-07 — live evidence §(f)'], tmp);
    assert.equal(r2.success, true, `stderr: ${r2.error || ''}`);
    const obj = JSON.parse(r2.output);
    assert.equal(obj.ledger.entries[0].status, 'fixed');
    assert.equal(obj.ledger.entries[0].reason, 'closed by 413.5-07 — live evidence §(f)');
    assert.equal(obj.ledger.open_count, 0);
    assert.equal(obj.ledger.fixed_count, 1);

    // Persisted, and the file still reads under the strict parser.
    const r3 = runGsdTools(['windows', 'status', '--raw'], tmp);
    assert.equal(r3.success, true, `stderr: ${r3.error || ''}`);
    assert.equal(JSON.parse(r3.output).ledger.entries[0].reason, 'closed by 413.5-07 — live evidence §(f)');
  });

  test('fixed <id> with NO reason still works (backward compatibility at the CLI)', (t) => {
    const tmp = createTempDir('bw-fixed-noreason-');
    t.after(() => cleanup(tmp));
    const r1 = runGsdTools(['windows', 'append', '--kind', 'stub', '--phase', '2', '--description', 'x'], tmp);
    assert.equal(r1.success, true, `stderr: ${r1.error || ''}`);
    const r2 = runGsdTools(['windows', 'fixed', '1'], tmp);
    assert.equal(r2.success, true, `stderr: ${r2.error || ''}`);
    const obj = JSON.parse(r2.output);
    assert.equal(obj.ledger.entries[0].status, 'fixed');
    assert.equal(obj.ledger.entries[0].reason, '');
  });
});

// ---------------------------------------------------------------------------
// CLI: windows amend
// ---------------------------------------------------------------------------

describe('broken-windows CLI: windows amend', () => {
  test('amend rewrites description + file on an open row and keeps it open', (t) => {
    const tmp = createTempDir('bw-amend-open-');
    t.after(() => cleanup(tmp));

    const r1 = runGsdTools(
      ['windows', 'append', '--kind', 'deviation', '--phase', '412', '--file', 'src/stale.ts', '--description', 'both halves'],
      tmp,
    );
    assert.equal(r1.success, true, `stderr: ${r1.error || ''}`);

    const r2 = runGsdTools(
      ['windows', 'amend', '1', '--description', 'only the surviving half', '--file', 'src/correct.ts'],
      tmp,
    );
    assert.equal(r2.success, true, `stderr: ${r2.error || ''}`);
    const obj = JSON.parse(r2.output);
    assert.equal(obj.ledger.entries[0].description, 'only the surviving half');
    assert.equal(obj.ledger.entries[0].file, 'src/correct.ts');
    assert.equal(obj.ledger.entries[0].status, 'open');
    assert.equal(obj.ledger.open_count, 1);
  });

  test('amend normalizes a hand-annotated closure on a FIXED row', (t) => {
    const tmp = createTempDir('bw-amend-fixed-');
    t.after(() => cleanup(tmp));
    const r1 = runGsdTools(['windows', 'append', '--kind', 'unmet-truth', '--phase', '413', '--description', 'TRUTH NOT MET: rollup != proxy'], tmp);
    assert.equal(r1.success, true, `stderr: ${r1.error || ''}`);
    const r2 = runGsdTools(['windows', 'fixed', '1'], tmp);
    assert.equal(r2.success, true, `stderr: ${r2.error || ''}`);

    const r3 = runGsdTools(['windows', 'amend', '1', '--reason', 'MET 2026-08-09 (Plan 413.7) — equality proven to 0.00000000'], tmp);
    assert.equal(r3.success, true, `stderr: ${r3.error || ''}`);
    const obj = JSON.parse(r3.output);
    assert.equal(obj.ledger.entries[0].status, 'fixed');
    assert.equal(obj.ledger.entries[0].reason, 'MET 2026-08-09 (Plan 413.7) — equality proven to 0.00000000');
    assert.equal(obj.ledger.fixed_count, 1);
  });

  test('amend with no field flags fails (usage)', (t) => {
    const tmp = createTempDir('bw-amend-nofields-');
    t.after(() => cleanup(tmp));
    const r1 = runGsdTools(['windows', 'append', '--kind', 'stub', '--phase', '2', '--description', 'x'], tmp);
    assert.equal(r1.success, true, `stderr: ${r1.error || ''}`);
    const r2 = runGsdTools(['windows', 'amend', '1'], tmp);
    assert.equal(r2.success, false);
    assert.match(r2.error, /at least one|--description|--reason|usage/i);
  });

  test('amend on an unknown id fails', (t) => {
    const tmp = createTempDir('bw-amend-unknown-');
    t.after(() => cleanup(tmp));
    const r1 = runGsdTools(['windows', 'append', '--kind', 'stub', '--phase', '2', '--description', 'x'], tmp);
    assert.equal(r1.success, true, `stderr: ${r1.error || ''}`);
    const r2 = runGsdTools(['windows', 'amend', '999', '--description', 'y'], tmp);
    assert.equal(r2.success, false);
    assert.match(r2.error, /no window|id 999|not found/i);
  });
});

// ---------------------------------------------------------------------------
// CLI: windows reconcile
// ---------------------------------------------------------------------------

describe('broken-windows CLI: windows reconcile', () => {
  test('reconcile repairs a hand-drifted ledger that every other verb refuses', (t) => {
    const tmp = createTempDir('bw-reconcile-');
    t.after(() => cleanup(tmp));

    // The exact failure this fix exists to end: a hand-edited closure whose
    // frontmatter counts no longer match the entries. status/append/fixed all
    // fail closed on it; reconcile is the repair verb.
    writeLedger(tmp, rawLedgerWithCounts(
      [
        makeRawEntry({ id: 1, status: 'open' }),
        makeRawEntry({ id: 2, status: 'fixed', reason: 'hand-written', resolved_at: '2026-08-09T01:00:00Z' }),
      ],
      { open: 2, waived: 0, fixed: 0, total: 2 },
    ));

    const blocked = runGsdTools(['windows', 'status', '--raw'], tmp);
    assert.equal(blocked.success, false, 'the drifted ledger must fail closed before reconcile');
    assert.match(blocked.error, /counts disagree/i);

    const rec = runGsdTools(['windows', 'reconcile'], tmp);
    assert.equal(rec.success, true, `stderr: ${rec.error || ''}`);
    const obj = JSON.parse(rec.output);
    assert.equal(obj.ok, true);
    assert.equal(obj.repaired, true);
    assert.equal(obj.ledger.open_count, 1);
    assert.equal(obj.ledger.fixed_count, 1);

    // And the ledger is usable again through the normal (strict) path.
    const after = runGsdTools(['windows', 'status', '--raw'], tmp);
    assert.equal(after.success, true, `stderr: ${after.error || ''}`);
    assert.equal(JSON.parse(after.output).ledger.open_count, 1);
    assert.match(readLedgerFile(tmp), /open_count: 1/);
  });

  test('reconcile on a consistent ledger is a no-op that reports repaired=false', (t) => {
    const tmp = createTempDir('bw-reconcile-noop-');
    t.after(() => cleanup(tmp));
    const r1 = runGsdTools(['windows', 'append', '--kind', 'stub', '--phase', '2', '--description', 'x'], tmp);
    assert.equal(r1.success, true, `stderr: ${r1.error || ''}`);
    const before = readLedgerFile(tmp);

    const rec = runGsdTools(['windows', 'reconcile'], tmp);
    assert.equal(rec.success, true, `stderr: ${rec.error || ''}`);
    assert.equal(JSON.parse(rec.output).repaired, false);
    assert.equal(readLedgerFile(tmp), before, 'a no-op reconcile must not rewrite the file');
  });

  test('reconcile re-renders a hand-mangled but count-consistent ledger (normalized, not repaired)', (t) => {
    const tmp = createTempDir('bw-reconcile-normalize-');
    t.after(() => cleanup(tmp));
    // Counts agree, so the strict reader accepts it — but a formatter narrowed the
    // four-backtick fence to three (upstream #3733: the reader accepts any
    // CommonMark-legal fence width, the writer still emits four). Reconcile
    // re-renders. (Pre-1.13.0 this fixture mangled the fence onto one line —
    // a shape upstream's reader now refuses outright, so it is no longer the
    // "count-consistent but not renderer-shaped" case this test is about.)
    const mangled = rawLedgerWithCounts([makeRawEntry({ id: 1 })], { open: 1, waived: 0, fixed: 0, total: 1 })
      .replace('````json\n[', '```json\n[').replace(/\r?\n````\r?\n$/, '\n```\n');
    writeLedger(tmp, mangled);

    const rec = runGsdTools(['windows', 'reconcile'], tmp);
    assert.equal(rec.success, true, `stderr: ${rec.error || ''}`);
    const obj = JSON.parse(rec.output);
    assert.equal(obj.repaired, false, 'counts were already true');
    assert.equal(obj.normalized, true, 'the file bytes were not what the renderer emits');
    assert.notEqual(readLedgerFile(tmp), mangled, 'the mangled bytes must be rewritten');
    assert.match(readLedgerFile(tmp), /````json\r?\n\[/);
  });

  test('reconcile with no ledger reports windows_ledger_missing (nothing to repair)', (t) => {
    const tmp = createTempDir('bw-reconcile-missing-');
    t.after(() => cleanup(tmp));
    const rec = runGsdTools(['windows', 'reconcile'], tmp);
    assert.equal(rec.success, false);
    assert.match(rec.error, /no ledger|missing/i);
  });

  test('reconcile does NOT paper over real corruption', (t) => {
    const tmp = createTempDir('bw-reconcile-corrupt-');
    t.after(() => cleanup(tmp));
    writeLedger(tmp, 'not a ledger at all');
    const rec = runGsdTools(['windows', 'reconcile'], tmp);
    assert.equal(rec.success, false);
    assert.match(rec.error, /malformed|frontmatter/i);
  });
});

// ---------------------------------------------------------------------------
// Review hardening (code review of the reason/amend/reconcile PR)
// ---------------------------------------------------------------------------

/** Build an in-memory ledger with one entry in the requested status. */
function ledgerWithOne(status, { reason = '', now = '2026-08-09T00:00:00Z' } = {}) {
  let led = emptyLedger(now);
  ({ ledger: led } = appendWindow(led, makeEntry(), { now }));
  if (status === 'waived') led = markWaived(led, 1, reason || 'deferred to v2', { now });
  else if (status === 'fixed') led = markFixed(led, 1, reason, { now });
  return led;
}

describe('broken-windows: the REASON enum is a frozen typed surface', () => {
  test('REASON keys are exactly the documented set (adding a code is a 3-place change)', () => {
    assert.deepEqual(Object.keys(REASON).sort(), [
      'WINDOWS_ALREADY_RESOLVED',
      'WINDOWS_APPEND_MISSING_FIELD',
      'WINDOWS_DUPLICATE_ID',
      'WINDOWS_ID_NOT_FOUND',
      'WINDOWS_INVALID_FILE',
      'WINDOWS_INVALID_ID',
      'WINDOWS_INVALID_KIND',
      'WINDOWS_INVALID_TEXT',
      'WINDOWS_LEDGER_MALFORMED',
      'WINDOWS_LEDGER_MISSING',
      'WINDOWS_LEDGER_TABLE_DRIFT', // upstream #3733 (align-1.13.0): table-region drift refusal
      'WINDOWS_OK',
      'WINDOWS_USAGE',
      'WINDOWS_WAIVE_REASON_EMPTY',
    ]);
  });
});

// Finding 1 — amend must not strip the justification off a ship-gate-exempt row.
describe('broken-windows: amend cannot empty a WAIVED entry reason', () => {
  test('amend --reason "" on a waived entry throws (a waiver without a reason is unjustified exemption)', () => {
    const led = ledgerWithOne('waived', { reason: 'blocked on upstream' });
    assert.throws(
      () => amendWindow(led, 1, { reason: '' }, { now: 't' }),
      reasonIs(REASON.WINDOWS_WAIVE_REASON_EMPTY),
    );
  });

  test('amend --reason "   " on a waived entry throws (whitespace normalizes to empty)', () => {
    const led = ledgerWithOne('waived', { reason: 'blocked on upstream' });
    assert.throws(
      () => amendWindow(led, 1, { reason: '   ' }, { now: 't' }),
      reasonIs(REASON.WINDOWS_WAIVE_REASON_EMPTY),
    );
  });

  test('amend rewrites a waived reason to another NON-empty value (re-wording stays legal)', () => {
    const led = ledgerWithOne('waived', { reason: 'blocked on upstream' });
    const out = amendWindow(led, 1, { reason: 'blocked on upstream #3200' }, { now: 't' });
    assert.equal(out.entries[0].reason, 'blocked on upstream #3200');
    assert.equal(out.entries[0].status, 'waived');
    assert.equal(out.waived_count, 1);
  });

  test('amend --reason "" on an OPEN entry is allowed (reason is optional off the waive path)', () => {
    let led = ledgerWithOne('open');
    led = amendWindow(led, 1, { reason: 'noted in passing' }, { now: 't' });
    const out = amendWindow(led, 1, { reason: '' }, { now: 't' });
    assert.equal(out.entries[0].reason, '');
    assert.equal(out.entries[0].status, 'open');
  });

  test('amend --reason "" on a FIXED entry is allowed (a fix is self-justifying)', () => {
    const led = ledgerWithOne('fixed', { reason: 'closed by refactor' });
    const out = amendWindow(led, 1, { reason: '' }, { now: 't' });
    assert.equal(out.entries[0].reason, '');
    assert.equal(out.entries[0].status, 'fixed');
  });

  test('CLI: amend --reason= on a waived row fails and leaves the recorded reason intact', (t) => {
    const tmp = createTempDir('bw-amend-waived-reason-');
    t.after(() => cleanup(tmp));
    const r1 = runGsdTools(['windows', 'append', '--kind', 'stub', '--phase', '2', '--description', 'x'], tmp);
    assert.equal(r1.success, true, `stderr: ${r1.error || ''}`);
    const r2 = runGsdTools(['windows', 'waive', '1', 'blocked on upstream'], tmp);
    assert.equal(r2.success, true, `stderr: ${r2.error || ''}`);

    const r3 = runGsdTools(['windows', 'amend', '1', '--reason='], tmp);
    assert.equal(r3.success, false, 'clearing a waived reason must be refused');
    assert.match(r3.error, /waived|reason/i);

    const after = runGsdTools(['windows', 'status'], tmp);
    assert.equal(after.success, true, `stderr: ${after.error || ''}`);
    assert.equal(JSON.parse(after.output).ledger.entries[0].reason, 'blocked on upstream');
  });
});

// Finding 2 — duplicate ids are corruption: every mutation verb rewrites BY id,
// so a duplicated id makes one `amend`/`fixed` clobber several rows at once.
describe('broken-windows: duplicate entry ids are rejected as corruption', () => {
  const dupeRaw = () => rawLedgerWithCounts(
    [
      makeRawEntry({ id: 1, description: 'first row' }),
      makeRawEntry({ id: 1, description: 'second row wearing the same id' }),
    ],
    // Counts AGREE with the entries — the dupe is the only defect, so a
    // failure here cannot be the count cross-check firing.
    { open: 2, waived: 0, fixed: 0, total: 2 },
  );

  test('parseLedger rejects duplicate ids (strict read)', () => {
    assert.throws(() => parseLedger(dupeRaw()), reasonIs(REASON.WINDOWS_DUPLICATE_ID));
  });

  test('reconcileLedger rejects duplicate ids too (the lenient path repairs counts, never dupes)', () => {
    assert.throws(() => reconcileLedger(dupeRaw(), { now: 't' }), reasonIs(REASON.WINDOWS_DUPLICATE_ID));
  });

  test('CLI: amend on a duplicate-id ledger fails instead of clobbering both rows', (t) => {
    const tmp = createTempDir('bw-dupe-amend-');
    t.after(() => cleanup(tmp));
    writeLedger(tmp, dupeRaw());
    const before = readLedgerFile(tmp);

    const r = runGsdTools(['windows', 'amend', '1', '--description', 'rewritten'], tmp);
    assert.equal(r.success, false, 'a dupe-id ledger must not be mutated');
    assert.match(r.error, /duplicate/i);
    assert.equal(readLedgerFile(tmp), before, 'the ledger must be left untouched');
  });

  test('CLI: reconcile refuses a duplicate-id ledger (it is data loss, not drift)', (t) => {
    const tmp = createTempDir('bw-dupe-reconcile-');
    t.after(() => cleanup(tmp));
    writeLedger(tmp, dupeRaw());
    const r = runGsdTools(['windows', 'reconcile'], tmp);
    assert.equal(r.success, false);
    assert.match(r.error, /duplicate/i);
  });
});

// Finding 4 — an unquoted multi-word reason used to truncate to its first word.
describe('broken-windows CLI: extra positionals are a usage error, never a silent truncation', () => {
  const seed = (tmp) => {
    const r = runGsdTools(['windows', 'append', '--kind', 'stub', '--phase', '2', '--description', 'x'], tmp);
    assert.equal(r.success, true, `stderr: ${r.error || ''}`);
  };

  test('fixed <id> with an UNQUOTED multi-word reason fails and tells the operator to quote it', (t) => {
    const tmp = createTempDir('bw-fixed-unquoted-');
    t.after(() => cleanup(tmp));
    seed(tmp);

    const r = runGsdTools(['windows', 'fixed', '1', 'closed', 'by', 'refactor'], tmp);
    assert.equal(r.success, false, 'recording only the first word is worse than failing');
    assert.match(r.error, /quote/i);

    // The row is untouched — no half-recorded closure.
    const after = runGsdTools(['windows', 'status'], tmp);
    assert.equal(JSON.parse(after.output).ledger.entries[0].status, 'open');
  });

  test('fixed <id> with a QUOTED multi-word reason records the whole phrase', (t) => {
    const tmp = createTempDir('bw-fixed-quoted-');
    t.after(() => cleanup(tmp));
    seed(tmp);
    const r = runGsdTools(['windows', 'fixed', '1', 'closed by refactor'], tmp);
    assert.equal(r.success, true, `stderr: ${r.error || ''}`);
    assert.equal(JSON.parse(r.output).ledger.entries[0].reason, 'closed by refactor');
  });

  test('waive <id> with an UNQUOTED multi-word reason fails the same way', (t) => {
    const tmp = createTempDir('bw-waive-unquoted-');
    t.after(() => cleanup(tmp));
    seed(tmp);
    const r = runGsdTools(['windows', 'waive', '1', 'deferred', 'to', 'v2'], tmp);
    assert.equal(r.success, false);
    assert.match(r.error, /quote/i);
  });

  test('amend <id> rejects a stray positional (its text belongs to a flag)', (t) => {
    const tmp = createTempDir('bw-amend-stray-');
    t.after(() => cleanup(tmp));
    seed(tmp);
    const r = runGsdTools(['windows', 'amend', '1', 'rewritten', '--reason', 'r'], tmp);
    assert.equal(r.success, false);
    assert.match(r.error, /quote|positional/i);
  });
});

// Finding 5 — the string-or-opts third parameter silently swallowed anything else.
describe('broken-windows: markFixed rejects an unexpected third argument', () => {
  test('a numeric reason throws instead of being silently dropped', () => {
    const led = ledgerWithOne('open');
    assert.throws(() => markFixed(led, 1, 42), reasonIs(REASON.WINDOWS_INVALID_TEXT));
  });

  test('an array reason throws (typeof [] === "object" would have read as opts)', () => {
    const led = ledgerWithOne('open');
    assert.throws(() => markFixed(led, 1, ['closed by refactor']), reasonIs(REASON.WINDOWS_INVALID_TEXT));
  });

  test('a boolean reason throws', () => {
    const led = ledgerWithOne('open');
    assert.throws(() => markFixed(led, 1, true), reasonIs(REASON.WINDOWS_INVALID_TEXT));
  });

  test('an explicit null reason throws (compiled CJS has no type check — the API must fail loudly)', () => {
    const led = ledgerWithOne('open');
    assert.throws(() => markFixed(led, 1, null), reasonIs(REASON.WINDOWS_INVALID_TEXT));
  });

  test('an omitted (undefined) reason with explicit opts still works', () => {
    const led = ledgerWithOne('open');
    const out = markFixed(led, 1, undefined, { now: '2026-08-09T03:00:00Z' });
    assert.equal(out.entries[0].status, 'fixed');
    assert.equal(out.entries[0].resolved_at, '2026-08-09T03:00:00Z');
  });
});

// Finding 7 — `normalized` conflated with `repaired`, and a header-prose change
// in the tool made reconcile rewrite every ledger the previous version wrote.
describe('broken-windows: reconcile reports normalization independently of repair', () => {
  test('a count repair reports repaired=true and normalized=false (normalized means "bytes drifted while counts were true")', () => {
    const drifted = rawLedgerWithCounts(
      [makeRawEntry({ id: 1, status: 'open' })],
      { open: 2, waived: 0, fixed: 0, total: 2 },
    );
    const res = reconcileLedger(drifted, { now: 't' });
    assert.equal(res.repaired, true);
    assert.equal(res.normalized, false, 'a repair is not a normalization');
  });

  test('a ledger whose ONLY difference is the previous version header is left alone', () => {
    let led = emptyLedger('2026-08-09T00:00:00Z');
    ({ ledger: led } = appendWindow(led, makeEntry(), { now: '2026-08-09T00:00:00Z' }));
    const canonical = renderLedger(led);
    // Exactly the shape a ledger written by the previous tool version has:
    // identical bytes except for the header guidance lines this PR added.
    const previousVersion = canonical
      .split('\n')
      .filter((l) => !l.startsWith('> Re-word an entry') && !l.startsWith('> Never hand-edit'))
      .join('\n');
    assert.notEqual(previousVersion, canonical, 'fixture must actually differ from the canonical render');

    const res = reconcileLedger(previousVersion, { now: 't' });
    assert.equal(res.repaired, false, 'the counts were already true');
    assert.equal(res.normalized, false, 'header prose is not ledger state — rewriting it is pure churn');
  });

  test('CLI: reconcile does not rewrite a previous-version ledger byte-for-byte', (t) => {
    const tmp = createTempDir('bw-reconcile-oldheader-');
    t.after(() => cleanup(tmp));
    const r1 = runGsdTools(['windows', 'append', '--kind', 'stub', '--phase', '2', '--description', 'x'], tmp);
    assert.equal(r1.success, true, `stderr: ${r1.error || ''}`);
    const previousVersion = readLedgerFile(tmp)
      .split('\n')
      .filter((l) => !l.startsWith('> Re-word an entry') && !l.startsWith('> Never hand-edit'))
      .join('\n');
    writeLedger(tmp, previousVersion);

    const rec = runGsdTools(['windows', 'reconcile'], tmp);
    assert.equal(rec.success, true, `stderr: ${rec.error || ''}`);
    const obj = JSON.parse(rec.output);
    assert.equal(obj.repaired, false);
    assert.equal(obj.normalized, false);
    assert.equal(readLedgerFile(tmp), previousVersion, 'no rewrite: the file was already true');
  });
});

// Finding 6 — the ship:pre gate must not describe itself as a raw-frontmatter
// comparison: `open_count` is hand-editable, and the whole point of the JSON
// block being authoritative is that the gate reads the CROSS-CHECKED path.
describe('broken-windows: the ship:pre gate points at the cross-checked read', () => {
  const registry = require('../gsd-core/bin/lib/capability-registry.cjs');

  const shipGate = () => {
    const cap = registry.capabilities['broken-windows'];
    assert.ok(cap, 'the broken-windows capability must be in the registry');
    const gates = (cap.gates || []).filter((g) => g.point === 'ship:pre');
    assert.equal(gates.length, 1, 'exactly one ship:pre gate');
    return gates[0];
  };

  test('the gate predicate runs the cross-checked status read, not a raw frontmatter comparison', () => {
    const gate = shipGate();
    assert.equal(gate.blocking, true);
    assert.equal(gate.onError, 'halt');
    assert.equal(gate.when, 'workflow.windows_enforce');
    const pred = gate.check.predicate;
    assert.ok(pred, 'ship:pre gates are predicate-shaped in this codebase');
    // `artifact-frontmatter-equals` compares a HAND-EDITABLE scalar and is not
    // even in the evaluator's KIND_TABLE; `command-exit-zero` is the only
    // executable kind, and pointing it at `windows status` buys the entries
    // cross-check for free (a forged open_count fails the parse, exit != 0).
    assert.equal(pred.kind, 'command-exit-zero');
    assert.notEqual(pred.kind, 'artifact-frontmatter-equals');
    assert.match(pred.command, /windows status/, 'the gate must read through the cross-checked path');
    assert.equal(typeof pred.timeout, 'number');
  });

  test('the declared gate command matches what `windows status` actually emits (clean vs open)', (t) => {
    // The predicate greps a literal out of the status JSON, so the literal and
    // the emitter are coupled — this test is that coupling, made loud.
    const needle = shipGate().check.predicate.command.match(/'([^']+)'/)[1];
    const tmp = createTempDir('bw-gate-command-');
    t.after(() => cleanup(tmp));

    const clean = runGsdTools(['windows', 'status', '--raw'], tmp);
    assert.equal(clean.success, true, `stderr: ${clean.error || ''}`);
    assert.ok(clean.output.includes(needle), `clean status output must contain ${needle}`);

    const r1 = runGsdTools(['windows', 'append', '--kind', 'stub', '--phase', '2', '--description', 'x'], tmp);
    assert.equal(r1.success, true, `stderr: ${r1.error || ''}`);
    const open = runGsdTools(['windows', 'status', '--raw'], tmp);
    assert.equal(open.success, true, `stderr: ${open.error || ''}`);
    assert.ok(!open.output.includes(needle), `an open window must NOT match ${needle}`);
  });

  test('a hand-edited open_count=0 hiding an open entry does NOT read as clean (the cross-check the gate rides on)', (t) => {
    const tmp = createTempDir('bw-gate-crosscheck-');
    t.after(() => cleanup(tmp));
    // The forgery the gate must survive: frontmatter claims a clean ledger
    // while the authoritative entries still carry an open window.
    writeLedger(tmp, rawLedgerWithCounts(
      [makeRawEntry({ id: 1, status: 'open' })],
      { open: 0, waived: 0, fixed: 0, total: 1 },
    ));
    const r = runGsdTools(['windows', 'status', '--raw'], tmp);
    assert.equal(r.success, false, 'the gate read must fail closed, not report open_count 0');
    assert.match(r.error, /counts disagree/i);
  });
});
