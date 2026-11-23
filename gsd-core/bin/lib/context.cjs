'use strict';
/**
 * Context-lifecycle core (capability: context). Deterministic halves of the
 * /gsd:context family: provenance parsing + anchored-claim verification.
 * Anchor grammar: [anchor: <path>[:<line>] "<substring>"]. Line advisory;
 * substring must be present case-insensitively (mirrors grounding's
 * checkSourceCitation doctrine). ext:-prefixed paths are external repos → skipped.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("node:fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path");
const text_lines_cjs_1 = require("./text-lines.cjs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const frontmatterMod = require("./frontmatter.cjs");
const { frontmatterRegion } = frontmatterMod;
const ANCHOR_RE = /\[anchor:\s*([^\s"\]]+?)(?::(\d+))?\s+"([^"]+)"\]/g;
const FACT_SECTIONS = ['## Verified Facts', '## Load-bearing verified facts'];
function parseContextProvenance(text) {
    // One fence owner (align-1.16.0, lint-frontmatter-fence-drift): `frontmatterRegion` locates the
    // block through `locateFrontmatterFence`; an unterminated block is not provenance.
    const found = frontmatterRegion(text);
    if (!found || !found.terminated)
        return null;
    const fmText = found.region;
    if (!/context_provenance:/.test(fmText))
        return null;
    const grab = (k) => {
        const m = new RegExp(`^\\s*${k}:\\s*"?([^"\\n]+)"?\\s*$`, 'm').exec(fmText);
        return m ? m[1].trim() : '';
    };
    const phase = /^phase:\s*(\S+)/m.exec(fmText);
    return { phase: phase ? phase[1] : null, author: grab('author'), date: grab('date'), quality: grab('quality'), note: grab('note') };
}
function sectionSlices(text) {
    const lines = text.split('\n');
    const out = [];
    let start = -1;
    lines.forEach((l, i) => {
        const isFact = FACT_SECTIONS.some((h) => l.startsWith(h));
        if (l.startsWith('## ')) {
            if (start >= 0) {
                out.push({ start, end: i });
                start = -1;
            }
            if (isFact)
                start = i;
        }
    });
    if (start >= 0)
        out.push({ start, end: lines.length });
    return out.map(({ start: s, end: e }) => lines.slice(s, e).map((l, j) => `${s + j} ${l}`).join('\n'));
}
function extractAnchors(text) {
    const anchors = [];
    for (const slice of sectionSlices(text)) {
        for (const numbered of slice.split('\n')) {
            const sep = numbered.indexOf(' ');
            const lineNo = Number(numbered.slice(0, sep));
            const line = numbered.slice(sep + 1);
            let m;
            ANCHOR_RE.lastIndex = 0;
            while ((m = ANCHOR_RE.exec(line)) !== null) {
                anchors.push({ path: m[1], line: m[2] ? Number(m[2]) : null, fact: m[3], bulletLine: lineNo });
            }
        }
    }
    return anchors;
}
function verifyAnchors(cwd, anchors) {
    return anchors.map((anchor) => {
        if (anchor.path.startsWith('ext:'))
            return { anchor, status: 'external', reason: 'external repo — verify manually' };
        const abs = path.resolve(cwd, anchor.path);
        if (!fs.existsSync(abs))
            return { anchor, status: 'missing', reason: `file not found: ${anchor.path}` };
        const content = fs.readFileSync(abs, 'utf8').toLowerCase();
        if (!content.includes(anchor.fact.toLowerCase()))
            return { anchor, status: 'stale', reason: `fact not found in ${anchor.path}: "${anchor.fact}"` };
        return { anchor, status: 'ok', reason: 'fact present (line advisory)' };
    });
}
function annotateStale(filePath, results, date) {
    const lines = (0, text_lines_cjs_1.splitLines)(fs.readFileSync(filePath, 'utf8'));
    let annotated = 0;
    for (const r of results) {
        if (r.status !== 'stale' && r.status !== 'missing')
            continue;
        const i = r.anchor.bulletLine;
        if (i >= 0 && i < lines.length && !lines[i].includes('[STALE')) {
            lines[i] = `${lines[i]} [STALE — ${date}: ${r.reason}]`;
            annotated += 1;
        }
    }
    if (annotated > 0)
        fs.writeFileSync(filePath, lines.join('\n'));
    return annotated;
}
function verifyContextFile(cwd, filePath, date) {
    const text = fs.readFileSync(filePath, 'utf8');
    const results = verifyAnchors(cwd, extractAnchors(text));
    const count = (s) => results.filter((r) => r.status === s).length;
    const annotated = annotateStale(filePath, results, date);
    return { file: filePath, total: results.length, ok: count('ok'), stale: count('stale'), missing: count('missing'), external: count('external'), annotated, results };
}
module.exports = { parseContextProvenance, extractAnchors, verifyAnchors, annotateStale, verifyContextFile };
