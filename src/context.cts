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
  return out.map(({ start: s, end: e }) => lines.slice(s, e).map((l, j) => `${s + j} ${l}`).join('\n'));
}

function extractAnchors(text: string): Anchor[] {
  const anchors: Anchor[] = [];
  for (const slice of sectionSlices(text)) {
    for (const numbered of slice.split('\n')) {
      const sep = numbered.indexOf(' ');
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
