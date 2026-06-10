#!/usr/bin/env node
// gsd-hook-version: {{GSD_VERSION}}
// Context Monitor — DISABLED in @therocketcode/gsd-core.
//
// Upstream GSD shipped a PostToolUse/Stop/SubagentStop/PreCompact hook here that
// injected "CONTEXT WARNING / CONTEXT CRITICAL" messages into the agent's own
// conversation as the context window filled. This fork deliberately removes that
// behavior: agent-facing context warnings stress the model, derail work, and
// override the user's judgment about when to wrap up. The user can still see
// context usage passively in the statusline — that is enough.
//
// This file is intentionally kept as an inert no-op rather than deleted. It stays
// in the managed-hooks set so that an update OVERWRITES any previously-installed
// active version on EXISTING installs — guaranteeing the warning behavior is gone
// everywhere, not just on fresh installs. It reads and discards stdin, emits
// nothing, and exits 0 — it never injects context into the agent and never
// blocks tool execution.

// Drain and discard stdin so the caller's write side never sees EPIPE, then exit
// cleanly. Guard against stdin never closing (pipe issues on Windows/Git Bash).
const stdinTimeout = setTimeout(() => process.exit(0), 10000);
const done = () => { clearTimeout(stdinTimeout); process.exit(0); };
try {
  process.stdin.resume();
  process.stdin.on('data', () => {});
  process.stdin.on('end', done);
  process.stdin.on('error', done);
} catch {
  done();
}
