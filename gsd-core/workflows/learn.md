<purpose>
Teach a concept (or a sequence of concepts) from `learn-catalog.md` through the five-beat pattern — **inline, personalized, and standalone**. The main agent teaches in one continuous context so it can connect concepts live and follow arbitrary follow-ups; it never spawns a subagent to teach. Produces no artifact except learning progress.

This is the runtime procedure behind `/gsd:learn`. The *how-to-teach* doctrine is `teaching-pattern.md`; this file is the *operational loop* (initialize → select → teach → record).
</purpose>

<required_reading>
Read these before teaching anything:
- @$HOME/.claude/gsd-core/references/teaching-pattern.md — the five-beat doctrine (the heart; follow it exactly)
- @$HOME/.claude/gsd-core/references/learn-catalog.md — the concept graph (the index: which concept, where its truth lives, what it depends on)
- @$HOME/.claude/gsd-core/references/ui-brand.md — display conventions

Each concept's content is read **on demand** from its `Source` reference section — never the whole reference, and never invented.
</required_reading>

<process>

## Step 1: Initialize

**Runtime shim (REQUIRED — copy-paste verbatim):**

```bash
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; if [ -f "$GSD_TOOLS" ]; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif command -v gsd-tools >/dev/null 2>&1; then GSD_TOOLS="$(command -v gsd-tools)"; gsd_run() { "$GSD_TOOLS" "$@"; }; elif [ -f "$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and gsd-tools is not on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi
```

**Load personalization + progress (both optional — the lesson works without either):**

```bash
cat "$HOME/.claude/gsd-core/USER-PROFILE.md" 2>/dev/null || echo "NO_PROFILE"
gsd_run learn progress-read
RESPONSE_LANG=$(gsd_run query config-get response_language 2>/dev/null || true)
```

- If a profile exists, read `Learning Style` and `Explanation Depth` and apply them per `teaching-pattern.md` (order within a beat; depth). If `NO_PROFILE`, use neutral defaults (concise depth, example-then-principle) and offer once: "Run `/gsd:profile` so I can tailor this to how you learn."
- If `RESPONSE_LANG` is non-empty, all user-facing prose is in that language; technical terms, code, file paths, and node ids stay in English.

**Text mode:** set `TEXT_MODE=true` if `--text` is in `$ARGUMENTS`. When active, replace every `AskUserQuestion` below with a plain-text numbered list.

**Standalone:** this workflow requires **no project**. Never block on a missing `.planning/` or repo — the full lesson runs anywhere.

## Step 2: Select the concept(s)

Parse `$ARGUMENTS`:

- **A concept or topic phrase** (e.g. `test doubles`, `hexagonal`, `why DDD`) → map it to the closest node id: run `gsd_run learn catalog`, match on id/name/track, then `gsd_run learn node <id>`.
- **`--track <Track>`** → teach that track in dependency order (filter the catalog by track; order by prerequisite).
- **Empty** → `gsd_run learn next` to resume/suggest the next prereq-satisfied node, OR present the ten tracks and let the learner pick.

**Prerequisites:** `gsd_run learn node <id>` returns `prereq_chain`. If the learner jumped to a concept whose prereqs they haven't completed, say so and offer to teach the prereq(s) first — but proceed to the requested concept if they insist (their call).

## Step 3: Teach inline (the five beats)

For the selected node, read its `Source` section (only that section) and teach **exactly** per `teaching-pattern.md`:

1. **Concept** — what it is, clearly; dispel the common confusion.
2. **How to implement it** — the concrete construction with the reference's real code.
3. **When to use what** — the calibration, via the good-vs-bad contrast.
4. **Why** — universal evidence first, then the subordinate framework-why capstone.
5. **Practice + check** — a `AskUserQuestion` drill on a **constructed scenario** (no repo needed); if the learner is in a relevant project, optionally `grep`/`Grep` their code for a real instance as a bonus.

**Cross-concept questions:** if the learner asks how two concepts relate, load both nodes (`gsd_run learn node <a>` / `<b>`; the prereq edges name the link) and teach the connection live in this same context. Follow arbitrary follow-ups inline — never spawn a subagent.

**Visual (optional):** if the node's `visual` field is `diagram` or `code`, or the learner is stuck or asks to *see* it, offer the visual companion (Step 5). Terminal is always sufficient on its own.

## Step 4: Record progress

After a concept is taught and the learner has done the beat-5 check:

```bash
gsd_run learn progress-update --id <node-id> --status completed --lean <over|under|on-target>
```

The `--lean` is read from the learner's beat-5 calibration choice (did they reach for the heavier rung, the lighter one, or land on target). When a lean emerges across several drills, surface the **calibration mirror** per `teaching-pattern.md` ("you lean toward over-engineering — here's the trigger you keep skipping").

## Step 5: Visual companion (optional)

The companion is a vendored, pure-Node local server (zero install — just Node + the learner's existing browser, exactly like superpowers). **You generate the HTML yourself; there are no external rendering tools.** Use it only when a beat genuinely benefits from seeing it (a diagram, code side-by-side), or when the learner asks to *see* it or says they don't get it.

**Start the server once per session (idempotent — same `--project-dir` reuses the port):**

```bash
bash "${_GSD_RUNTIME_ROOT}/gsd-core/visual/start-server.sh" --project-dir "$(pwd)" --open 2>/dev/null || echo "VISUAL_UNAVAILABLE"
```

On success it prints a JSON line with a `url` and a `screen_dir`. Then, to show a beat:

1. **Write an HTML *fragment*** (content only — NO `<!DOCTYPE>`/`<html>`; the server frames it, injects the theme CSS + reload client) into `screen_dir`, using a **fresh semantic filename you never reuse** (`test-pyramid.html`, `fake-vs-mock.html`, `compute-ladder-v2.html`). Use your file-write tool, never `cat`/heredoc. The server auto-detects the newest file and reloads the browser.
2. **Draw diagrams as hand-authored inline `<svg>`** (the test pyramid, the hexagon's ports/adapters, the compute ladder) — no graphviz, no tools. **Code-both-ways** uses the frame's built-in `<div class="split">…</div>` (two columns); other ready classes: `.options`, `.pros-cons`, `.mockup`, `.subtitle`, `.cards`. Arbitrary HTML/CSS and inline `<svg>` render unfiltered.
3. **Tell the learner the URL** (every time, not just the first), give a one-line summary of what's on screen, and continue the dialogue in the terminal.

**Graceful fallback:** if the start line prints `VISUAL_UNAVAILABLE`, or the environment is headless/no-browser (the server still prints a URL to open manually), or the learner prefers text, **render the same thing as an ASCII sketch + prose inline and continue**. The visual is never required — terminal is always sufficient.

## Step 6: Continue or close

Offer the next move: `gsd_run learn next` (the next prereq-satisfied node), a related concept the learner just brushed against, or stop. Keep it one clear primary suggestion.

</process>

<critical_rules>
- **Teach inline — never spawn a subagent.** Teaching is conversational and cross-concept; isolating a concept in a subagent defeats the purpose.
- **Concept first, then application.** Never open with calibration; teach what the thing *is* before when to use it.
- **Never invent content.** Every beat derives from the node's cited `Source` section. Re-authoring breaks the coherence that is the whole product.
- **Runs standalone.** No repo or project required; the practice drill is a constructed scenario. "Show it in your code" is a bonus only.
- **Visual is optional and must degrade gracefully** — a missing browser or graphviz never breaks a lesson.
</critical_rules>

<success_criteria>
- [ ] The concept is taught through all five beats (concept → how → when → why → practice).
- [ ] Personalized to the profile when present; complete with no profile and no repo.
- [ ] Progress recorded via `gsd_run learn progress-update`; the calibration lean captured.
- [ ] A sensible single next step offered.
</success_criteria>
