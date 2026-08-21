# Tool provenance — planning artifacts come from the tool

Reference for every workflow, agent, and autonomous driver that creates or mutates planning state.

**The law:** every planning artifact — phase directories, state files, completion markers, ledgers, frontmatter counters — is created and mutated through `gsd-tools` commands, never hand-made. Not a raw `mkdir` for a phase directory, not a hand-written completion marker, not a by-hand edit of a state file the tool owns. If the artifact exists because a command's formula produced it, only that command may produce it.

**Why — two independent halves, either alone is sufficient:**

- **The formula is canonical.** The tool derives names, numbers, paths, and formats from one implementation. A hand-made artifact that *looks* right differs from the formula in exactly the ways later reads fail on — and the failure surfaces at the read, far from the write that caused it.
- **The side-effects only fire through the tool.** Scope gates, ledgers, counters, and validations run *inside* the command. A hand-made artifact skips them silently: nothing errors at creation; the gates simply never fire, and the run proceeds with protections it believes are armed and are not.

**The test, before any write under `.planning/`:** ask "which `gsd-tools` command owns this artifact?" If one exists, use it — even when the by-hand version seems faster or the command's output seems predictable. If none exists, that is a tooling gap to surface, never a license to hand-make.

**For autonomous drivers specifically:** a driver has no human downstream to notice drift. Hand-made artifacts in an unattended run don't fail loudly — they quietly disarm the very gates an autonomous run depends on. Provenance discipline is not style in an autonomous context; it is the substrate the run's safety rests on.

*Consumed by `workflows/autonomous.md` (fork pointer) and by every workflow step that writes planning state.*
