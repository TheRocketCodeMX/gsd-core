---
name: gsd-ns-project
description: "project lifecycle | milestones strategy audits summary"
allowed-tools:
  - Read
  - Skill
---


Route to the appropriate project / milestone skill based on the user's intent.
`gsd-plan-milestone-gaps` was deleted by #2790 — gap planning now happens
inline as part of `gsd-audit-milestone`'s output. The strategy skills below
run the project-level Strategy Plan steps (normally sequenced by
`gsd-new-project` / `gsd-new-milestone`, but each is invocable standalone).

| User wants | Invoke |
|---|---|
| Start a new project | gsd-new-project |
| Create a new milestone | gsd-new-milestone |
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
