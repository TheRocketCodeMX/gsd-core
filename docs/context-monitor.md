# Context Window Monitor — Disabled in this fork

> **This feature is intentionally disabled in `@therocketcode/gsd-core`.**
> The `gsd-context-monitor.js` hook still ships and is still wired (so updates
> cleanly overwrite any previously-installed active version), but it is an inert
> **no-op**: it reads and discards its input, injects **nothing** into the agent,
> and exits 0. Agents never receive context-limit warnings.

## Why we removed it

Upstream GSD shipped a `PostToolUse` / `Stop` / `SubagentStop` / `PreCompact`
hook that injected "CONTEXT WARNING" / "CONTEXT CRITICAL" messages into the
agent's own conversation as the context window filled. In practice this:

- **stresses the model** and derails it mid-task,
- **overrides the user's judgment** about when to wrap up or pause, and
- fires on a timer the agent can't see coming.

This fork's position: context usage is the **user's** call. The statusline still
shows context usage passively to the user (see `gsd-statusline.js`) — that is
enough. The agent is not nagged.

## What this means in practice

- **Fresh installs:** the hook is present but inert — no warnings, ever.
- **Existing installs (upgrading from an older GSD):** because the hook stays in
  the managed-hooks set, the normal update **overwrites** the old active version
  with this inert one — so the warning behavior is removed everywhere on update,
  not just on fresh installs.
- The statusline still writes its `/tmp/claude-ctx-{session_id}.json` bridge file
  (harmless); nothing reads it anymore.

## Re-enabling (not recommended)

There is no supported toggle to turn the warnings back on in this fork — the
behavior was removed at the source. If you genuinely want it back, restore the
upstream `hooks/gsd-context-monitor.js` implementation; the event wiring in
`hooks/hooks.json` and the installer is unchanged, so a restored implementation
would activate without further configuration.

---

## Related

- [Architecture](ARCHITECTURE.md)
- [Configuration](CONFIGURATION.md)
- [docs index](README.md)
