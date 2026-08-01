# Context Monitor — calm knowledge-flush nudge

> **In this fork the `gsd-context-monitor.js` hook is revived with a new purpose.**
> Upstream shipped it as a panicked context-limit warner; this fork replaced it
> with a **calm knowledge-flush nudge**. Same mechanism, opposite tone: at high
> context usage it gently suggests a knowledge checkpoint (`/gsd:context flush`)
> so durable knowledge is written down before compaction — it never nags the
> user about the context window itself.

## What it does now

The hook is part of the [`context` capability](../gsd-core/references/context-lifecycle.md) — the knowledge lifecycle. It fires on `PostToolUse` (metrics-driven) and `PreCompact` (unconditional final flush) and only in the **main session**:

- The statusline hook writes context metrics to `{os.tmpdir()}/claude-ctx-{session_id}.json`.
- On `PostToolUse` this hook reads those metrics and, when `used_pct` crosses a threshold, injects one calm flush suggestion as `additionalContext`.
- On `PreCompact` it always emits a final flush + re-anchor reminder (append unsaved knowledge to the capsule + `MASTER-CONTEXT.md`; after compaction, re-anchor first).
- `Stop` / `SubagentStop` are silent. Subagents (no metrics file) are silent — the nudge is main-session-only.

### Thresholds and debounce

| `used_pct` | Level | Behavior |
|---|---|---|
| `< hook_warn_pct` (default **90**) | Normal | No message |
| `≥ hook_warn_pct` (default **90**) | warn | One calm flush suggestion |
| `≥ hook_urge_pct` (default **95**) | urge | A single firmer repeat |

Debounce: `DEBOUNCE_CALLS` (5) tool uses between repeated warnings. A `warn → urge` escalation bypasses the debounce and fires once.

## Tone contract (CI-linted)

`tests/feat-context-hook.test.cjs` asserts the messages this hook emits **never** contain "CRITICAL", "URGENT", "immediately", or "STOP". The mechanism was never the problem — the upstream *tone* ("CONTEXT CRITICAL… STOP") derailed agents. The calm curation purpose is the whole point: a knowledge checkpoint, not an emergency save.

## Gates and safety

- **GSD-active gate:** fires only when `.planning/STATE.md` exists under the cwd.
- **Enable gate:** fires only when the context-lifecycle hook is enabled in `.planning/config.json`.
- Every fs op is guarded; any error → silent exit 0. The hook never crashes the session and never spawns child processes. A 3s stdin timeout guards against pipe hangs (#775).

## Configuration

Keys live in the `context_lifecycle` config slice (flat `context_lifecycle.*` or nested form both read):

| Key | Default | Meaning |
|---|---|---|
| `context_lifecycle.hook_enabled` | `true` | Enable the calm flush messages (main session only). |
| `context_lifecycle.hook_warn_pct` | `90` | `used_pct` threshold for the first calm flush suggestion. |
| `context_lifecycle.hook_urge_pct` | `95` | `used_pct` threshold for the single firmer repeat. |

## Multi-runtime

On Claude Code and Gemini the nudge ships as this hook (plus the PreCompact reminder). On other runtimes there is no hook — run `/gsd:context flush` manually at a natural break; the re-anchor procedure is carried as ambient practice in the generated instruction files. The *practice* is identical everywhere; only the delivery differs.

---

## Related

- [Context Lifecycle reference](../gsd-core/references/context-lifecycle.md)
- [Architecture](ARCHITECTURE.md)
- [Configuration](CONFIGURATION.md)
- [docs index](README.md)
