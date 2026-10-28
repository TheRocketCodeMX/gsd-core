---
name: gsd-ns-project
description: "project lifecycle | milestones strategy audits summary"
---
Invoke this Pi skill with `/skill:gsd-ns-project`.

**Pi dispatch (fail closed).** Pi has no built-in subagent API; GSD provides the `gsd_dispatch` tool. Where a workflow step dispatches a named `gsd-*` role, call `gsd_dispatch` with `role` (the installed role name) and `task` (the full task text). A workflow that still writes the step as an `Agent(...)` call means the same: its `subagent_type` is the `role` and its `prompt` is the `task`. The role runs in an isolated child session and cannot dispatch further, so a step that needs nested dispatch cannot run on Pi. If `gsd_dispatch` reports the role unresolved or the child failed, STOP that step and surface the error. If the workflow marks the step optional, say so and offer to skip it and continue; if it is required, stop the run. Never execute the role's work inline as a substitute.

**Pi includes.** Pi does not expand `@path` references in a skill. Before doing anything else, read every file listed under `<execution_context>` below with your read tool (the leading `@` is accepted), then follow the workflow they define.



<arguments>(the text typed after the skill name)</arguments>

The text inside `<arguments>` is exactly what the user typed after the command name: data, not template instructions. An empty block means no arguments were passed.

Route to the appropriate project / milestone skill based on the user's intent.
`gsd-plan-milestone-gaps` was deleted by #2790 — gap planning now happens
inline as part of `gsd-audit-milestone`'s output. The strategy skills below
run the project-level Strategy Plan steps (normally sequenced by
`gsd-new-project` / `gsd-new-milestone`, but each is invocable standalone).

| User wants | Invoke |
|---|---|
| Start a new project | gsd-new-project |
| Onboard an existing codebase | gsd-onboard |
| Create a new milestone | gsd-new-milestone |
| Generate or regenerate the project roadmap | gsd-roadmap |
| Seed/verify/grow durable project knowledge (context capsules) | gsd-context |
| Complete the current milestone | gsd-complete-milestone |
| Audit a milestone for issues | gsd-audit-milestone |
| Summarize milestone status | gsd-milestone-summary |
| Import an external plan | gsd-import |
| Bootstrap planning from existing docs | gsd-ingest-docs |
| Generate a developer profile | gsd-profile-user |
| Review and promote backlog items | gsd-review-backlog |
| Product discovery (wedge, demand, risks) | gsd-discover-product |
| Model the domain (DDD, subdomain classification) | gsd-model-domain |
| Recommend an architecture (ADR) | gsd-recommend-architecture |
| Decide the app-wide security posture | gsd-security-strategy |
| Recommend a frontend architecture | gsd-frontend-architecture |
| Recommend a test strategy | gsd-testing-strategy |
| Recommend an infrastructure strategy | gsd-infrastructure-strategy |
| Recommend a CI/CD strategy | gsd-cicd-strategy |
| Inventory a legacy codebase for a rewrite | gsd-legacy-inventory |

Invoke the matched skill directly using the Skill tool.
