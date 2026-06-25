import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

interface CatalogNode {
  id: string;
  name: string;
  track: string;
  source: string; // "reference.md § Section"
  prereqs: string[]; // node ids
  visual: string; // 'diagram' | 'code' | '—'
}

interface ConceptProgress {
  id: string;
  status: 'not-started' | 'in-progress' | 'completed';
  lean?: 'over' | 'under' | 'on-target';
  last_seen: string;
}
interface Progress {
  version: string;
  updated: string;
  calibration_lean: { over: number; under: number; on_target: number };
  concepts: ConceptProgress[];
}

// The catalog ships with the framework: gsd-core/references/learn-catalog.md.
// learn.cjs lives at gsd-core/bin/lib/, so the catalog is ../../references/.
function catalogPath(): string {
  return path.join(__dirname, '..', '..', 'references', 'learn-catalog.md');
}

// Short track label used by tests/UX (e.g. "Testing (the build wedge)" -> "Testing").
function trackToShort(track: string): string {
  return track.split('(')[0].trim();
}

// Parse the per-track markdown tables. Data rows look like:
// | `id` | Concept text | `file.md § Section` | `prereq-a`, `prereq-b` | diagram |
function parseCatalog(): { count: number; nodes: CatalogNode[]; tracks: string[] } {
  const text = fs.readFileSync(catalogPath(), 'utf8');
  const lines = text.split('\n');
  const nodes: CatalogNode[] = [];
  const tracks: string[] = [];
  let currentTrack = '';
  for (const line of lines) {
    const trackMatch = line.match(/^##\s+Track\s+\d+\s+[—-]\s+(.+?)\s*$/);
    if (trackMatch) {
      currentTrack = trackToShort(trackMatch[1]);
      if (!tracks.includes(currentTrack)) tracks.push(currentTrack);
      continue;
    }
    if (!/^\|\s*`[^`]+`\s*\|/.test(line)) continue; // data row starts with | `id`
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 5) continue;
    const idMatch = cells[0].match(/`([^`]+)`/);
    if (!idMatch) continue;
    const prereqCell = cells[3];
    const prereqs = prereqCell === '—'
      ? []
      : (prereqCell.match(/`([^`]+)`/g) || []).map((s) => s.replace(/`/g, ''));
    nodes.push({
      id: idMatch[1],
      name: cells[1],
      track: currentTrack,
      source: cells[2].replace(/`/g, ''),
      prereqs,
      visual: cells[4].replace(/[`*]/g, '').trim(),
    });
  }
  return { count: nodes.length, nodes, tracks };
}

function prereqChain(nodes: CatalogNode[], id: string): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const seen = new Set<string>();
  const out: string[] = [];
  const walk = (nid: string): void => {
    const node = byId.get(nid);
    if (!node) return;
    for (const p of node.prereqs) {
      if (seen.has(p)) continue;
      seen.add(p);
      walk(p);
      out.push(p);
    }
  };
  walk(id);
  return out;
}

// ---- progress (user-global state) ----

function progressDir(): string {
  return process.env.GSD_LEARN_PROGRESS_DIR
    || path.join(os.homedir(), '.claude', 'gsd-core');
}
function progressFile(): string {
  return path.join(progressDir(), 'LEARNING-PROGRESS.md');
}
function emptyProgress(): Progress {
  return { version: '1.0', updated: '', calibration_lean: { over: 0, under: 0, on_target: 0 }, concepts: [] };
}
function readProgress(): Progress {
  const p = progressFile();
  if (!fs.existsSync(p)) return emptyProgress();
  const text = fs.readFileSync(p, 'utf8');
  const m = text.match(/```json\s*([\s\S]*?)```/);
  if (!m) return emptyProgress();
  try {
    const parsed = JSON.parse(m[1]) as Partial<Progress>;
    return { ...emptyProgress(), ...parsed };
  } catch {
    return emptyProgress();
  }
}
function writeProgress(prog: Progress): void {
  const dir = progressDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const body = [
    '# Learning Progress',
    '',
    '> Tracked by `/gsd:learn`. The machine state is the JSON block below — edit via the command, not by hand.',
    '',
    '```json',
    JSON.stringify(prog, null, 2),
    '```',
    '',
  ].join('\n');
  fs.writeFileSync(progressFile(), body);
}
function parseFlags(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      out[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return out;
}

// ---- command handlers ----

function cmdCatalog() {
  return parseCatalog();
}
function cmdNode(id: string) {
  const { nodes } = parseCatalog();
  const node = nodes.find((n) => n.id === id);
  if (!node) return { error: `unknown node: ${id}` };
  return { ...node, prereq_chain: prereqChain(nodes, id) };
}
function cmdProgressRead(): Progress {
  return readProgress();
}
function cmdProgressUpdate(argv: string[]): Progress | { error: string } {
  const f = parseFlags(argv);
  if (!f.id) return { error: '--id required' };
  const prog = readProgress();
  const now = new Date().toISOString();
  let entry = prog.concepts.find((c) => c.id === f.id);
  if (!entry) {
    entry = { id: f.id, status: 'in-progress', last_seen: now };
    prog.concepts.push(entry);
  }
  if (f.status === 'not-started' || f.status === 'in-progress' || f.status === 'completed') {
    entry.status = f.status;
  }
  entry.last_seen = now;
  if (f.lean === 'over' || f.lean === 'under' || f.lean === 'on-target') {
    entry.lean = f.lean;
    const key = f.lean === 'on-target' ? 'on_target' : f.lean;
    (prog.calibration_lean as Record<string, number>)[key]++;
  }
  prog.updated = now;
  writeProgress(prog);
  return prog;
}
function cmdNext() {
  const { nodes } = parseCatalog();
  const prog = readProgress();
  const done = new Set(prog.concepts.filter((c) => c.status === 'completed').map((c) => c.id));
  const candidate = nodes.find((n) => !done.has(n.id) && n.prereqs.every((p) => done.has(p)));
  if (!candidate) return { done: true, message: 'All catalog nodes completed.' };
  return { ...candidate, prereq_chain: prereqChain(nodes, candidate.id) };
}

export = {
  parseCatalog,
  prereqChain,
  cmdCatalog,
  cmdNode,
  cmdProgressRead,
  cmdProgressUpdate,
  cmdNext,
};
