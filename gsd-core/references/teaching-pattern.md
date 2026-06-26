# Teaching Pattern — How `/gsd:learn` Teaches a Concept

The doctrine the main agent follows to teach any node in `learn-catalog.md`. It is the teaching analog of `engineering-standards.md`: that file governs how an agent *builds*; this governs how it *teaches*. The framework already turns the skills into a coherent way to build — this turns the same skills into a coherent way to learn.

**The one rule that makes this coherent:** every beat's content is *derived from the node's `Source` reference section — never invented*. The references are the single source of truth; the agent renders them for a human, it does not re-author them. A learner gets the same high-bar, internally-consistent teaching for `test-doubles` as for `arch-hexagonal`, because both trace to one corpus in one voice. That coherence — not novelty — is the product. The value is not "teach what isn't online"; it is "teach what *is* online but nobody actually knows, because it's scattered, contradictory, and half-finished."

## The two halves, in order (non-negotiable)

1. **Concept** — taught clearly *first*, explicitly resolving the confusions the internet leaves.
2. **Application** — *then* when to use it, why, and how the framework builds with it.

You cannot calibrate a concept the learner has not been taught. Concept-first is the foundation; everything else sits on it.

## The five beats

The arc is **what it is → how to build it → when to build it (and when not) → why → make it yours**.

### Beat 1 — Concept
What it actually *is*, defined once and clearly. **Name and dispel the common confusion** the references already resolve — hexagonal = clean = onion (one principle, three names); mock ≠ spy ≠ stub ≠ fake ≠ dummy (five distinct roles). This is the "finally, a straight answer" moment. *Draws from:* the skill's definitions.

### Beat 2 — How to implement it
The concrete *construction*, with the reference's real code: where the thing lives, how it's wired, the actual pattern (e.g. the fake-at-ports + one shared contract suite from `test-doubles.md`). This is **production** — how the learner builds the right thing themselves. It is **not** framework/API syntax (the internet covers that fine); it is *this framework's pattern for doing it well*. *Draws from:* the skill's code and patterns.

### Beat 3 — When to use what
The **calibration**: the floor, the rungs, the triggers, and the both-direction tells (over- and under-engineering). Teach it through the **good-vs-bad contrast** — the over- and under-engineered versions placed next to the calibrated one. Beat 2 taught *how to build it*; this teaches *when, and when not*. *Draws from:* the skill's decision rules.

### Beat 4 — Why
**Universal first:** the engineering justification and the real evidence (mocking-the-wrong-seam is brittle; agents reward-hack their own tests; Kubernetes runs at 8–13% utilization; the wrong abstraction costs more than the duplication it hides). **Then the coherence capstone:** "and this is why the framework holds you to it" — kept subordinate. A learner who never touches GSD must still get full value from beats 1–4; the framework-why is the bonus that gives the practice teeth and shows nothing here is arbitrary, never the core of the lesson. *Draws from:* the skill's basis and gates.

### Beat 5 — Practice + check
A "now you try" on a **constructed scenario** the agent invents — *"you're testing a checkout that calls Stripe and your own Postgres; which gets a real instance, which a stub, which a contract test?"* The learner answers; the agent confirms and explains. **No repo required.** *Optional bonus when the learner is in a relevant project:* grep their code for a real instance and show it ("you already have this exact miscalibration in `checkout.test.ts:42`").

## Two distinctions to keep separate (do not collapse them)

- **Production vs recognition.** Beat 2 (build the right thing) is a different skill from beat 3 (recognize good from bad). Seeing that a fake beats a mock ≠ being able to write the fake. Teach both.
- **Application vs calibration — not rivals.** Calibration is the higher-value, more *unique* contribution (the internet is saturated with how-to and weak on when). But calibration is taught *through* concrete construction (beat 2) and contrast (beat 3), **never as abstract preaching**. Concept is the foundation, production is the vehicle, calibration is the payload, justification gives it teeth, practice makes it stick.

## Personalization

Read `~/.claude/gsd-core/USER-PROFILE.md` when present:

- **`Learning Style`** sets the order *within* a beat: *example-driven* → lead with the code; *conceptual* → lead with the principle; *hands-on* → add more practice drills; *self-directed* → give the map and step back.
- **`Explanation Depth`** sets prose vs terse — `code-only` skips preamble; `educational` adds the full why + evidence.

**The calibration mirror.** Because the framework's whole thesis is that *both* over- and under-engineering are failures, track the learner's calibration choices across drills (recorded via `gsd-tools learn progress-update --lean …`) and reflect the lean back when one emerges: *"you reach for the heavier rung eight times out of ten — you lean toward over-engineering; here's the trigger you keep skipping."* Native to this framework, and absent from every other learning resource.

## Cross-concept teaching (why this is inline, never a subagent)

When the learner asks how two concepts relate — *"how do architecture and testing fit together?"* — load **both** nodes (the catalog's prerequisite edges name the link, e.g. `test-shape-follows-arch → arch-when-to-use`) and teach the connection live: *"the test shape isn't a choice; it falls out of the architecture you just learned."* Follow arbitrary follow-ups (*"wait, why a fake and not a mock here?"*) without spawning anything, because every concept touched this session is still in context. A subagent-per-concept design could not do this — it would return isolated lessons that never meet. **Teaching is conversational and cross-concept; it lives in one context.** (We build with subagents; we teach inline.)

## Standalone — no repo, no project

`/gsd:learn` runs anywhere. The curriculum (the references), the profile, and progress all live in `~/.claude/gsd-core/`, so the full lesson — concept → how → when → why → practice on a constructed scenario — needs no codebase. A junior who has never touched a repo gets the complete lesson. The "show it in your own code" step is an optional bonus, never a requirement.

## The visual layer (optional, where it earns it)

When a node is flagged `Visual` in the catalog (`diagram` or `code`), or the learner is stuck or asks to *see* it, the agent MAY launch the visual companion (`gsd-core/visual/start-server.sh`) and render the beat in the browser — a concept diagram (the test pyramid, the hexagon's ports/adapters, the compute ladder) or a code-both-ways comparison. Use it where seeing beats reading; keep the Socratic dialogue in the terminal. **The visual is always optional and must degrade gracefully** — no browser, headless, or missing graphviz falls back to an ASCII sketch + prose, and the lesson continues unbroken.

## Anti-patterns

- **Calibration without the concept** — jumping to "when to use it" before teaching what it *is*. Concept first, always.
- **Recognition without production** — showing good-vs-bad but never how to build the good one.
- **Abstract preaching** — stating the calibration rule without the concrete construction and contrast that make it land.
- **Framework navel-gazing** — making the lesson about GSD's internals instead of the craft; the framework-why is a subordinate capstone, not the subject.
- **Re-authoring** — inventing definitions or evidence beyond the cited `Source`; drift breaks the coherence that is the whole product.
- **Spawning a subagent to teach** — isolates concepts and kills cross-concept synthesis.
- **Requiring a repo** — the lesson must be complete standalone; the repo example is a bonus only.

## Consumes / produces

- **Consumes:** `learn-catalog.md` (the index — which concept, where its truth lives, what it depends on), the cited `Source` reference section (read on demand, not the whole file), and `~/.claude/gsd-core/USER-PROFILE.md` (personalization). Optionally launches `gsd-core/visual/` for the visual beats.
- **Produces:** nothing persistent except learning progress, written via `gsd-tools learn progress-update` to `~/.claude/gsd-core/LEARNING-PROGRESS.md` (the only persisted state; the lessons themselves are ephemeral, rendered per session).
