<div align="center">

# GSD Core

**Git. Ship. Done.**

**English** · [Português](README.pt-BR.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja-JP.md) · [한국어](README.ko-KR.md)

**A light-weight meta-prompting, context engineering, and spec-driven development system for Claude Code, OpenCode, Gemini CLI, Kilo, Codex, Copilot, Cursor, Windsurf, and more.**

[![npm version](https://img.shields.io/npm/v/%40therocketcode%2Fgsd-core?style=for-the-badge&logo=npm&logoColor=white&color=CB3837)](https://www.npmjs.com/package/@therocketcode/gsd-core)
[![npm downloads](https://img.shields.io/npm/dm/%40therocketcode%2Fgsd-core?style=for-the-badge&logo=npm&logoColor=white&color=CB3837)](https://www.npmjs.com/package/@therocketcode/gsd-core)
[![Tests](https://img.shields.io/github/actions/workflow/status/TheRocketCodeMX/gsd-core/test.yml?branch=main&style=for-the-badge&logo=github&label=Tests)](https://github.com/TheRocketCodeMX/gsd-core/actions/workflows/test.yml)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/mYgfVNfA2r)
[![GitHub stars](https://img.shields.io/github/stars/TheRocketCodeMX/gsd-core?style=for-the-badge&logo=github&color=181717)](https://github.com/TheRocketCodeMX/gsd-core)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

## What is GSD Core

GSD Core is a context-engineering and spec-driven development framework that drives AI coding agents (Claude Code, Codex, Gemini CLI, Copilot, Cursor, and more) through a disciplined phase loop. It solves [context rot](docs/explanation/context-engineering.md) — the quality degradation that accumulates as an AI fills its context window — by running all heavy research, planning, and execution work in fresh-context subagents while keeping your main session lean.

<!-- FORK:identity BEGIN -->
> **This is a fork** of [`open-gsd/gsd-core`](https://github.com/open-gsd/gsd-core) (MIT), maintained by TheRocketCode and published as **`@therocketcode/gsd-core`**. It keeps everything upstream offers and adds the greenfield **discovery** spine and **testing methodology** described below.

---

## What this fork adds

On top of gsd-core's phase loop, this fork adds a connected **product → domain → architecture → tests** discovery spine, plus concrete test-infrastructure know-how.

**Greenfield discovery — each step feeds the next:**

- **`/gsd:discover-product`** — define *what to build and why*: real demand vs. interest, the narrowest wedge, the four product risks, outcome-framed → `PRODUCT-BRIEF.md`
- **`/gsd:model-domain`** — lightweight DDD: ubiquitous language + core/supporting/generic subdomain distillation → `DOMAIN-MODEL.md`
- **`/gsd:recommend-architecture`** — a two-axis recommendation (domain-logic ladder × deployment topology) that avoids over- *and* under-engineering, captured as an ADR → `ADR-NNNN.md`
- **`/gsd:testing-strategy`** — derives the **test shape from the architecture** (rich core → unit tests; CRUD-over-DB → integration tests), with coverage-as-floor + mutation testing → `TEST-STRATEGY.md`

**Testing know-how** the agent consults while writing tests: Testcontainers, parallel-safe DB isolation, authenticate-once / multi-role auth, synthetic test data, E2E tiering, and flaky-test avoidance.

The payoff: **one complexity assessment** made during discovery parameterizes both the architecture *and* the test strategy — a single thread from "what are we building" to "how do we test it."
<!-- FORK:identity END -->

---

## How it works

Each milestone repeats the same five-step loop, one phase at a time:

1. **Discuss** — capture implementation decisions before anything is planned
2. **Plan** — research, decompose, and verify the plan fits a fresh context window
3. **Execute** — run plans in parallel waves; each executor starts with a clean 200k-token context
4. **Verify** — walk through what was built; diagnose and fix before declaring done
5. **Ship** — create the PR, archive the phase, repeat for the next one

---

## Quickstart

```bash
npx @therocketcode/gsd-core@latest
```

The installer prompts for your runtime (Claude Code, OpenCode, Gemini CLI, Kilo, Codex, Copilot, Cursor, Windsurf, and more) and whether to install globally or locally. The installer is required for cross-runtime compatibility — do not copy files from `agents/` or `commands/` directly.

On another runtime or without Node.js? See [Install on your runtime](docs/how-to/install-on-your-runtime.md).

Once installed, start your first project:

```bash
/gsd-new-project
```

New here? Follow [Your first project](docs/tutorials/your-first-project.md) for a guided walkthrough from install to first shipped phase.

<!-- FORK:identity BEGIN -->
### Installing & updating

How you get the latest version depends on what you already have installed:

- **Nothing installed yet** — run the Quickstart command once:
  ```bash
  npx -y @therocketcode/gsd-core@latest --claude --global   # or --local for a single project
  ```
  After that you're on the self-update path below.

- **Already have this package (`@therocketcode/gsd-core`)** — just run `/gsd-update` in your session. The package coordinate is baked into the install, so a SessionStart check surfaces a banner ("GSD update available: X → Y. Run /gsd:update.") and `/gsd-update` pulls the new version. No special command, no reinstall.

- **Coming from the original upstream GSD (`@opengsd/gsd-core` / `get-shit-done`)** — its `/gsd-update` points at the upstream package and will never find this fork (different npm coordinate). Switch with a one-time install using the Quickstart command above. The installer overwrites the same-named `/gsd-*` files, re-points the baked identity at this fork (so future `/gsd-update` works), and the bundled legacy-cleanup removes superseded upstream hooks and stale update-check caches. After that, the self-update path applies. <!-- gsd-allow-legacy-name -->
<!-- FORK:identity END -->

---

## Documentation

**Tutorials** — learning by doing:
- [Your first project](docs/tutorials/your-first-project.md)
- [Onboarding an existing codebase](docs/tutorials/onboarding-an-existing-codebase.md)

**How-to guides** — task-focused recipes:
- [Install on your runtime](docs/how-to/install-on-your-runtime.md)
- [Plan a phase](docs/how-to/plan-a-phase.md)
- [Verify and ship](docs/how-to/verify-and-ship.md)
- … [see all how-to guides](docs/README.md#how-to-guides)

**Reference** — authoritative facts:
- [Commands](docs/COMMANDS.md)
- [Configuration](docs/CONFIGURATION.md)
- [CLI tools](docs/CLI-TOOLS.md)

**Explanation** — concepts and design decisions:
- [Context engineering](docs/explanation/context-engineering.md)
- [The phase loop](docs/explanation/the-phase-loop.md)
- [Architecture](docs/ARCHITECTURE.md)

Full index: [docs/README.md](docs/README.md). Other languages: [日本語](README.ja-JP.md) · [한국어](README.ko-KR.md) · [Português](README.pt-BR.md) · [简体中文](README.zh-CN.md).

---

## Why it works

Most AI-coding setups fail at scale because context bloat silently degrades output quality, there is no shared memory between sessions, and nothing verifies that code actually works. GSD Core solves all three: heavy work runs in fresh subagents, structured artifacts like `STATE.md` and `CONTEXT.md` survive session boundaries, and the verify step walks through what was built and generates fix plans before a phase is declared done. See [docs/explanation/context-engineering.md](docs/explanation/context-engineering.md) for the full reasoning.

Troubleshooting? See [docs/how-to/recover-and-troubleshoot.md](docs/how-to/recover-and-troubleshoot.md).

---

## Community

| Project | Platform |
|---------|----------|
| [gsd-opencode](https://github.com/rokicool/gsd-opencode) | Original OpenCode port |
| [Discord](https://discord.gg/mYgfVNfA2r) | Community support |

---

## Star History

<a href="https://star-history.com/#TheRocketCodeMX/gsd-core&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=TheRocketCodeMX/gsd-core&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=TheRocketCodeMX/gsd-core&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=TheRocketCodeMX/gsd-core&type=Date" />
 </picture>
</a>

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">

**Claude Code is powerful. GSD Core makes it reliable.**

</div>
