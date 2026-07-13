# Proposal: Upstream Realignment — `@therocketcode/gsd-core` 2.0.0

> **Status: PROPOSAL (analysis-backed, no implementation).** Supersedes the strategy
> framing of `2026-07-13-upstream-adoption-analysis.md` (whose findings it absorbs).
> Input for a GSD milestone/spec.
>
> **North star (verbatim intent):** be deeply aligned with core so future adaptations
> from core become seamless, while preserving — all of, not some of — the fork's
> features, skills, agents, and flows (source-fidelity, grounding, learn, strategy
> suite, mode persistence, everything).

---

## 1. The proposal in one paragraph

Realign the fork's lineage onto `upstream/main` (v1.6.1) via a **merge-anchored
realignment** — a real merge commit that adopts upstream's tree wholesale, records
upstream as a git ancestor, and re-applies the fork's value as a **factored delta**:
a scripted rebrand, a **rocket capability pack** (`rocket-learn`, `rocket-strategy`,
`rocket-grounding`) built on upstream's own extension architecture, **~16 explicitly
marked core patches**, and the identity/release set. Ship it as **2.0.0** through the
normal `next` → release train with an RC soak. Afterward, staying aligned costs
half a day per upstream release (`git merge upstream/main` + rebrand-on-conflicts +
guard suite), instead of the compounding cherry-pick debt of today.

## 2. Why this strategy (the evidence)

Four candidate strategies were compared; three verification passes (12 agents total,
all findings checked against real code) settled it.

### 2.1 The divergence is highly factorable — measured, not assumed

| Fork delta since base (upstream v1.4.0, `7eb4d286`) | Count | Fate under realignment |
|---|---|---|
| Added files (the additive pack: skills, workflows, references, templates, visual, tests) | **88** | Carry over nearly verbatim |
| Modified files — **pure branding** (proven by sed-normalize + diff) | **210 of 303** | Dissolve under the existing `scripts/sync-upstream.sh` |
| Modified files — real content edits | **93** | Triaged exhaustively (below) |
| Deleted files | 3 | Re-assess (1 is a stray `.tmp` file) |

### 2.2 The 93 real edits, triaged exhaustively (every file, no sampling)

- **34 PARITY/branding-residual** — the fork's edit matches what upstream 1.6.1
  already has (`context: fork` removal, list-seeds, changeset shipping, boundary
  refs, worktree wave-guards…) → **zero port cost, they dissolve**.
- **3 OBSOLETE** — superseded by upstream restructuring → drop.
- **6 RELEASE-TOOLING** — release.yml token auth, CHANGELOG, versions → small.
- **5 TEST-RIDERS** — ride with their features.
- **45 FORK-FEATURE** — the real porting work, dominated by two clusters:
  - *Source-fidelity / senior-quality* prose across 13 agents + templates + refs —
    mostly clean appends with anchors intact upstream (**M**).
  - *Strategy-chain wiring* (new-project, new-milestone, plan-phase §1.6, discuss/
    progress/transition) (**L**).
- **True hard-port set: 4 files** — `plan-phase.md` (fork's UI-hint gate must be
  re-expressed inside upstream's new `GATE` query), `new-project.md` (many
  interleaved insertions), `gsd-security-auditor.md` (semantic reconcile: fork's
  SECURITY-STRATEGY posture vs upstream's new ASVS-scaled rigor #1626/#1627),
  `legacy-cleanup.cjs` (two divergent extensions of one module).

**~40% of the 93 files cost nothing.** Total porting effort: ~2 clusters of L/M +
4 of S/M — roughly 2–3 weeks of focused work, not months.

### 2.3 The killer argument: the entire back-port program evaporates

The previously-identified **9 HIGH + 5 MED upstream fixes** the fork lacks (stale
model catalog, `is_last_phase` checkbox bug, lock PID-liveness, proto-pollution,
`phases clear` dirty guard, planner `Edit`, `generate-claude-md` clobber, both
nested-spawn bugs, launcher-shim, mktemp, temp leak, branch-name, frontmatter
writer) are **all upstream commits by construction**. Spot-verified present in
`upstream/main`: sonnet-5 catalog (8 hits), PID liveness (`state.cts:162` — with
upstream's own "backport from capability-lock" comment), dirty-dir `--force` guard
(`milestone.cts:400`), checkbox phase pattern (`phase.cts:715`), #1534 proto guard.

**Under realignment, all 14 arrive for free** — plus the ~605 other upstream commits
we never reviewed. Under cherry-pick, each is a hand-port into a diverging tree,
forever. The back-port program was only necessary *because of* the divergence.

*One nuance found:* upstream's #1534 guarded `_deepMergeConfig` in `config.cts` but
the sibling merge in `configuration.cts` is unguarded **upstream too** — our analysis
found a hole upstream still has. That becomes the fork's **first upstream PR** under
the new relationship.

### 2.4 Strategies compared

| | Alignment achieved | Features preserved | Cost now | Cost forever |
|---|---|---|---|---|
| A. Cherry-pick forever (status quo) | never | yes | 0 | **L, compounding** (619 commits behind and growing; runtime registry already one architecture generation diverged *backward*) |
| B. Rebuild upstream's architecture in-tree (6-phase program) | partial (semantic, never textual → merges still conflict) | yes | **XL** | M |
| **C. Merge-anchored realignment (this proposal)** | **full, with recorded merge base** | **yes, by designed map + CI guards** | **L (~3–4 wks calendar)** | **S per upstream release** |
| D. Single raw `git merge upstream/main` | full but uncontrolled | at risk (hundreds of delete/modify conflicts across upstream's restructure, resolved ad hoc) | XL, chaotic | S |

C is the only strategy that satisfies both halves of the north star.

## 3. The target shape (what the fork becomes)

```
@therocketcode/gsd-core 2.0.0
├─ upstream core (v1.6.1 tree, verbatim + scripted rebrand)
├─ rocket capability pack            ← upstream's OWN extension architecture
│   ├─ capabilities/rocket-learn/       (skill+command family+visual; zero loop hooks)
│   ├─ capabilities/rocket-strategy/    (9 skills, plan:pre step+gate, planner contribution)
│   └─ capabilities/rocket-grounding/   (plan:post blocking gate — mirrors upstream's
│                                        `drift` capability shape exactly; federated
│                                        config; FileChanged hook via ADR-894)
├─ ~16 marked core patches           ← <!-- FORK:<feature> BEGIN/END --> markers
│   ├─ templates/project.md (Mode / Strategy Plan / Skip-ledger / Sources)
│   ├─ new-project.md, new-milestone.md (strategy on-ramp — outside the 12 loop points)
│   ├─ gsd-verifier.md, gsd-plan-checker.md (fidelity gates — core-by-ADR:
│   │     "verifier reach = spec reach"; our differentiator lives exactly where
│   │     upstream's own architecture says verification substrate belongs)
│   ├─ gsd-planner/roadmapper/executor (mode-awareness, elaborate-mode, TEST-INTEGRITY)
│   ├─ discuss-phase.md (mandatory scout + canonical refs)
│   ├─ mapper/intel-updater grounding blocks; profile-output Sources-of-Truth section
│   └─ help rows (trivial)
└─ identity & release set            ← permanent by definition
    (package identity, --next RC channel, release.yml, launcher snippet, fork docs)
```

- **~80–85% of fork value lands additively** (learn 100%; grounding ~90% — its gate
  is byte-for-byte upstream's drift/nyquist gate pattern, and ADR-894's matcher
  amendment supports its FileChanged hook exactly; strategy ~85%; fidelity ~60% —
  references and the planner contribution move, the verifier/checker gates stay core).
- **The seams are proven live, not theoretical**: upstream's `intel` capability
  already exercises the ADR-959 command-family dispatch (`{family, module, router}`),
  and `security`/`drift`/`research` exercise contributions and gates — every rocket
  capability has a working first-party template to copy.
- **The registration tax evaporates**: clusters, aliases, gsd-tools switch cases,
  flat-config keys all become capability declarations — deleting ~150 lines of the
  fork's most merge-conflict-prone surface. One rename rides along: the fork's
  `query project` verbs (mode/strategy-plan/strategy-skipped) re-home to a
  capability-owned `strategy` family (~15 call sites, all in fork-owned workflows).
- **Nothing is dropped.** Every feature has a designed destination (§2.2 triage +
  feature map); the guarantee is enforced by CI (§5), not by promise. The honest
  permanent merge surface is ~300–500 lines across five core agents + two templates
  — the quality-bearing prose that upstream's own predicate-boundary ruling says
  belongs in core.

## 4. Execution plan (phases — becomes the GSD milestone roadmap)

0. **Spike (S, do first)** — verify the seam unknowns on a scratch branch:
   (a) can a `contribution` target the verifier/plan-checker? (`into:"planner"` is
   proven live upstream; verifier-targeted is not) (b) can a gate's `check.query`
   resolve a capability-owned command family? (c) does the capability artifact
   vocabulary cover the learn visual layer, or does `gsd-core/visual/` stay a plain
   additive dir (works today, zero conflict)? Fallback for any "no": that bit ships
   as a core patch instead of a hook. Also decide the `hooks/gsd-context-monitor.js`
   question (fork's deliberate no-op vs upstream's context guard) and the dependency
   policy (fork removed `@anthropic-ai/claude-agent-sdk` + `ws`).
1. **FORK-DELTA manifest + guards (S–M)** — generate `docs/FORK-DELTA.md` (88 owned
   files + the marked-patch list from the triage) and a machine-readable
   `docs/FORK-PATCHES.json` consumed by both the guard test and `sync-upstream.sh`;
   add `<!-- FORK:<feature> BEGIN/END -->` markers; build `tests/fork-markers.test.cjs`
   asserting (a) every registered marker pair exists and is balanced, (b) marked
   content matches a checked-in fingerprint — the repo's proven grep-contract idiom.
   *This is both the realignment's safety checklist and the permanent merge guard.*
2. **Realign branch (S mechanics)** — `realign/2.0.0`: `merge -s ours --no-commit
   upstream/main` + `read-tree -u --reset upstream/main` + `scripts/sync-upstream.sh`
   + restore FORK-DELTA files. Upstream becomes a recorded ancestor; **no force-push;
   `next` and the release train untouched.**
3. **Port the clusters (the real work, L total)** — in order: mode-persistence
   tooling (M) → source-fidelity/senior-quality prose re-append (M) → strategy-chain
   wiring incl. the 2 hard files (L) → security-auditor semantic reconcile (S–M) →
   legacy-cleanup merge (S–M) → learn + registration (S) → release tooling (S).
   Grounding is re-expressed as `capabilities/rocket-grounding/` (its 1.15/PR-#11
   shape maps 1:1 onto upstream's drift-capability pattern). Includes rewriting the
   fork tests pinned to the flat config manifest and to inline plan-phase gates
   against federated config slices and `render-hooks` output.
4. **CI reconcile + prune (S)** — take upstream's `.github/` (it gained version-gate,
   install-smoke, rulesets), restore the fork's 5 files (release pipeline + templates),
   execute the long-deferred community-workflow prune (MAINTAINING-FORK.md:49).
5. **Fixture matrix + RC soak (M)** — the top risk is upstream's installer-migrations
   running against fork-created installs: build the matrix (1.14.0 global + local →
   2.0.0 update → assert clean) **before** the RC. Ship `2.0.0-rc` on the `next`
   dist-tag; dogfood the top-10 commands + an in-place update from a real 1.14.0.
6. **Release 2.0.0** — CHANGELOG with an explicit breaking section (update.md parses
   it): "Based on upstream v1.6.1; new lineage; local slash commands become
   `/gsd-<cmd>` on project-local installs (upstream #1367)." Keep a `1.x` dist-tag
   pinned to the last 1.x for stragglers.

**Calendar estimate: ~3–4 weeks** including soak. Recommended as a proper GSD
milestone ("v2.0.0 — Upstream Realignment") with these phases as the roadmap.

## 5. The steady-state machine (what makes the north star *stay* true)

- **Cadence:** per upstream release (tag-triggered), one `sync/upstream-vX.Y` branch,
  one PR into `next`.
- **Ritual:** `git merge upstream/vX.Y` → conflicts are now only real content
  conflicts (branding conflicts resolve by re-running `sync-upstream.sh` on the
  conflicted files) → full `test:unit` with exit-code check + `check:identity-drift`
  + fork-delta/fork-patch guards + lint → RC → release.
- **Guards (80% already exist):** `scripts/sync-upstream.sh` (all 6 coordinate
  forms — the wished-for rebrand.sh), identity-drift lint (`issue-498`), plus the
  net-new FORK-DELTA manifest + presence tests from Phase 1. An upstream merge that
  clobbers a fork feature **fails CI loudly, not silently**.
- **Steady-state cost:** **S** per upstream patch/minor (~half a day); **M** when
  upstream restructures again — vs. L-and-compounding under cherry-pick.
- **Two-way alignment:** push seams upstream to shrink our patch surface over time —
  first candidates: the `configuration.cts` proto-guard hole (found in §2.3),
  DESIGN-INVENTORY rows as ADR-550 exogenous predicates, and entry-point extension
  points for new-project/new-milestone (additive-by-contract, would dissolve patches
  4–5 of our core-patch list).

## 6. Risks (top 5, with mitigations)

1. **Upstream installer-migrations misfire on fork-created installs** (003 rename,
   004 snapshot prune, #1367 orphan `gsd:*` files) → fixture matrix *before* RC;
   add a fork-numbered migration to sweep fork-specific orphans if needed.
2. **Unreviewed upstream behavior (619 commits)** regresses something users rely on
   → upstream CHANGELOG 1.4.1–1.6.1 as a review checklist; RC soak; dogfood top-10
   commands.
3. **Losing an unmarked fork fix** buried in the modified files → the exhaustive
   93-file triage *is* the mitigation; the keep-list becomes FORK-DELTA.md; drift
   test locks it.
4. **Hard-port misfires + agent-prose churn** — the 4-file hard set (esp. plan-phase
   UI gate → upstream's GATE query; security-auditor semantic reconcile) needs its
   own equivalence checks (golden before/after gate behavior on fixtures). And the
   core-agent patches sit on upstream's fastest-churning files (~530 lines of agent
   delta already between the trees): each future sync is a *semantic* re-merge of
   prose, not a mechanical rebase — markers detect loss but don't ease the merge.
   The durable mitigation is §5's two-way alignment (upstreaming the seams).
5. **User disruption at 2.0.0** (command rename on local installs, big changelog)
   → major-version semantics, parsed breaking section, `1.x` dist-tag, RC channel
   first.

## 7. Open decisions (CTO)

1. **Approve the strategy** (merge-anchored realignment → 2.0.0). Everything else
   follows from this.
2. **Grounding release timing:** ship 1.15.0 (grounding is green on `next` via PR
   #11) *before* starting the realignment — users get value now and dogfooding
   informs the `rocket-grounding` capability port — or fold it into 2.0.0.
   **Recommendation: ship 1.15.0 first; realign in parallel.**
3. **`context-monitor` policy:** keep the fork's deliberate no-op or adopt upstream's
   context guard on the new base.
4. **Dependency policy:** fork removed `@anthropic-ai/claude-agent-sdk` + `ws`;
   upstream keeps them. Re-remove on the new base or accept upstream's set.
5. **OpenAI/Google model IDs** (`gpt-5.3-codex`, `gemini-3-pro/flash`): unverifiable
   with Anthropic tooling — confirm against provider docs during the spike.

---

## Appendix A — Phase-0 spike results (RESOLVED, 2026-07-13)

All Phase-0 unknowns are settled with file:line evidence from `upstream/main`:

1. **Contribution `into:` targets — HYBRID.** The generated loop-host contract already
   permits `into:"checker"` at plan points and `into:"verifier"` at execute points
   (validator: `capability-validator.cjs:1379-1389`; precedent: mempalace ships
   `into:"verifier"` at `execute:wave:post`). Only the planner has an explicit
   injection slot in the workflow prose (`plan-phase.md:896`); the verifier and
   plan-checker spawn prompts lack one. **Design:** declare rocket contributions at
   the contract-valid points + a minimal core patch adding a `plan-phase.md:896`-style
   injection line to each of the two spawn prompts. One-time 2-line patch; all future
   fork prose then flows through capabilities with zero further core edits.
2. **Capability-owned gate check verb — NO; hybrid confirmed (upstream's own
   pattern).** Gate dispatch is hardcoded to the core `check` family
   (`gsd-tools.cjs:812-815` → closed if-chain in `check-command-router.cts:885-948`;
   ADR-959 dispatch is never consulted for `check` subcommands). Upstream's `drift`
   capability itself declares gates whose verbs live in core. **Design:**
   `rocket-grounding` declares the gate in its manifest (`when` must name a key in
   the capability's own config slice — validator `:1422-1435`); the
   `grounding-check-plan` verb is a marked core patch in check-command-router,
   delegating to capability-shipped lib code.
3. **Visual layer as capability assets — NO; fallback safe.** Artifact vocabulary is
   closed (`VALID_ARTIFACT_KIND_NAMES = {commands, agents, skills, kimi-agents}`,
   validator `:709`); `fragments/` are inlined at registry gen, never staged at
   install. Nothing upstream occupies `gsd-core/visual/`. **Design:** keep
   `gsd-core/visual/` as a plain additive directory; `rocket-learn` references it
   by path.
4. **Context-monitor — keep the fork's no-op** as a marked whole-file patch. Upstream
   1.6.1 still injects context warnings (its opt-out is per-project + default-on,
   which cannot satisfy the fork's categorical position). Upstream's
   `context_guard_mode` (#1452) is workflow-self-assessment, not hook-based — it
   coexists and addresses the original objection better; keep its `warn` default.
   Acknowledged cost: forfeits the #1974 CRITICAL-time auto-`record-session`
   breadcrumb (possible follow-up: a record-only variant).
5. **Dependencies — re-remove `@anthropic-ai/claude-agent-sdk` + `ws`** as a marked
   patch. Upstream declares both at 1.6.1 but nothing imports either (zero source
   hits; no `sdk/`; their own backlog flags the audit liability). The fork keeps
   zero runtime deps. Tests: `enh-191` + `no-cjs-sdk-handsync` ride;
   `bug-505-remove-dead-sdk-verification` drops its positive assertions.
6. **Model IDs (post-rebase data edits).** Time-critical: upstream's catalog ships
   `gpt-5.4`, which **retires 2026-07-23** → replace with `gpt-5.6-terra`
   (+ `gpt-5.4-mini` → `gpt-5.6-luna`); `gemini-3-flash` → `gemini-3.5-flash` (GA
   rename). All Anthropic IDs, `gemini-3.1-pro-preview`, `gemini-2.5-flash-lite`,
   and the Qwen trio are current. The `gpt-5.4` retirement is also an immediate
   upstream issue/PR opportunity (goodwill + two-way alignment).

**Correction to §4 Phase 2:** the realign branch cuts from **`next`**, not `main` —
`next` is the fork's content source of truth (it carries grounding, PR #11). All
FORK-DELTA generation and restore steps operate against `next`'s tree.

---

*Provenance: 2026-07-13. Built on three verification passes against real code:
(1) exhaustive 93-file triage (every real edit classified, upstream state checked
per file), (2) feature→architecture mapping (per-feature target shape + irreducible
core-patch list + seam unknowns), (3) operational mechanics (git strategy, user
migration, CI, steady-state protocol). Divergence measurements reproduced by script
(branding-normalize + diff). Re-verify file:line citations before implementation.*
