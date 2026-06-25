"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
// The catalog ships with the framework: gsd-core/references/learn-catalog.md.
// learn.cjs lives at gsd-core/bin/lib/, so the catalog is ../../references/.
function catalogPath() {
    return node_path_1.default.join(__dirname, '..', '..', 'references', 'learn-catalog.md');
}
// Short track label used by tests/UX (e.g. "Testing (the build wedge)" -> "Testing").
function trackToShort(track) {
    return track.split('(')[0].trim();
}
// Parse the per-track markdown tables. Data rows look like:
// | `id` | Concept text | `file.md § Section` | `prereq-a`, `prereq-b` | diagram |
function parseCatalog() {
    const text = node_fs_1.default.readFileSync(catalogPath(), 'utf8');
    const lines = text.split('\n');
    const nodes = [];
    const tracks = [];
    let currentTrack = '';
    for (const line of lines) {
        const trackMatch = line.match(/^##\s+Track\s+\d+\s+[—-]\s+(.+?)\s*$/);
        if (trackMatch) {
            currentTrack = trackToShort(trackMatch[1]);
            if (!tracks.includes(currentTrack))
                tracks.push(currentTrack);
            continue;
        }
        if (!/^\|\s*`[^`]+`\s*\|/.test(line))
            continue; // data row starts with | `id`
        const cells = line.split('|').slice(1, -1).map((c) => c.trim());
        if (cells.length < 5)
            continue;
        const idMatch = cells[0].match(/`([^`]+)`/);
        if (!idMatch)
            continue;
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
function prereqChain(nodes, id) {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const seen = new Set();
    const out = [];
    const walk = (nid) => {
        const node = byId.get(nid);
        if (!node)
            return;
        for (const p of node.prereqs) {
            if (seen.has(p))
                continue;
            seen.add(p);
            walk(p);
            out.push(p);
        }
    };
    walk(id);
    return out;
}
// ---- progress (user-global state) ----
function progressDir() {
    return process.env.GSD_LEARN_PROGRESS_DIR
        || node_path_1.default.join(node_os_1.default.homedir(), '.claude', 'gsd-core');
}
function progressFile() {
    return node_path_1.default.join(progressDir(), 'LEARNING-PROGRESS.md');
}
function emptyProgress() {
    return { version: '1.0', updated: '', calibration_lean: { over: 0, under: 0, on_target: 0 }, concepts: [] };
}
function readProgress() {
    const p = progressFile();
    if (!node_fs_1.default.existsSync(p))
        return emptyProgress();
    const text = node_fs_1.default.readFileSync(p, 'utf8');
    const m = text.match(/```json\s*([\s\S]*?)```/);
    if (!m)
        return emptyProgress();
    try {
        return { ...emptyProgress(), ...JSON.parse(m[1]) };
    }
    catch {
        return emptyProgress();
    }
}
function writeProgress(prog) {
    const dir = progressDir();
    if (!node_fs_1.default.existsSync(dir))
        node_fs_1.default.mkdirSync(dir, { recursive: true });
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
    node_fs_1.default.writeFileSync(progressFile(), body);
}
function parseFlags(argv) {
    const out = {};
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
function cmdNode(id) {
    const { nodes } = parseCatalog();
    const node = nodes.find((n) => n.id === id);
    if (!node)
        return { error: `unknown node: ${id}` };
    return { ...node, prereq_chain: prereqChain(nodes, id) };
}
function cmdProgressRead() {
    return readProgress();
}
function cmdProgressUpdate(argv) {
    const f = parseFlags(argv);
    if (!f.id)
        return { error: '--id required' };
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
        prog.calibration_lean[key]++;
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
    if (!candidate)
        return { done: true, message: 'All catalog nodes completed.' };
    return { ...candidate, prereq_chain: prereqChain(nodes, candidate.id) };
}
module.exports = {
    parseCatalog,
    prereqChain,
    cmdCatalog,
    cmdNode,
    cmdProgressRead,
    cmdProgressUpdate,
    cmdNext,
};
