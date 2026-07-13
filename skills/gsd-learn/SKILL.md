---
name: gsd-learn
description: "Learn the engineering concepts GSD enforces — concept first, then when and why to use them"
argument-hint: "[concept or topic] [--track <track>] [--text] [--visual]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---


<objective>
Teach the engineering concepts the framework uses — each one **concept first (what it is, clearly), then application (when, why, how it fits)** — sourced from the skills, in one coherent voice. The concepts are all over the internet but scattered, contradictory, and half-finished; this teaches them clearly, completely, and justified, the same way the framework builds.

**How it works:**
1. Resolve the concept (an argument, a resume, or a guided suggestion) against the concept catalog.
2. Teach it inline through the five-beat pattern — concept → how to implement → when to use what → why → practice — personalized to your profile.
3. Optionally show the visual version in a browser; track what you've learned and which way you tend to over- or under-engineer.

**Output:** none persisted except your learning progress (`~/.claude/gsd-core/LEARNING-PROGRESS.md`).
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/learn.md
@$HOME/.claude/gsd-core/references/teaching-pattern.md
@$HOME/.claude/gsd-core/references/learn-catalog.md
</execution_context>

<context>
**Flags:**
- `[concept or topic]` — jump to a concept (e.g. `test doubles`, `hexagonal`, `why DDD`).
- `--track <track>` — work a whole track in dependency order (e.g. `--track Testing`).
- `--text` — terminal-only; never open the browser.
- `--visual` — prefer the browser where a concept has a visual.

**When to run:** any time, anywhere — no project required. Works on a fresh machine in an empty directory.
</context>

<process>
Execute end-to-end.

**MANDATORY:** Read `@$HOME/.claude/gsd-core/workflows/learn.md` BEFORE acting, and teach per `@$HOME/.claude/gsd-core/references/teaching-pattern.md`. Teach **inline — never spawn a subagent**. Concept first, then application. Do not invent content beyond the cited source reference.
</process>

<success_criteria>
- The concept is taught through all five beats (concept → how → when → why → practice).
- Personalized to the profile when present; works standalone with no profile and no repo.
- Progress recorded; a sensible next step offered.
</success_criteria>
