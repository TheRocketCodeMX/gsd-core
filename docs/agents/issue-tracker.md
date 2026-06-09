# Issue tracker: GitHub

Issues for this repo live in **GitHub Issues** at `TheRocketCodeMX/gsd-core`.

## Auth

Use the configured GitHub CLI session for this checkout. Do not require a
repo-local `.envrc` before running `gh`.

## Conventions

- **Create**: `gh issue create --repo TheRocketCodeMX/gsd-core --title "..." --body "..."`
- **Read**: `gh issue view <number> --repo TheRocketCodeMX/gsd-core --comments`
- **List**: `gh issue list --repo TheRocketCodeMX/gsd-core --state open --json number,title,labels --jq '...'`
- **Comment**: `gh issue comment <number> --repo TheRocketCodeMX/gsd-core --body "..."`
- **Label**: `gh issue edit <number> --repo TheRocketCodeMX/gsd-core --add-label "..." --remove-label "..."`
- **Close**: `gh issue close <number> --repo TheRocketCodeMX/gsd-core --comment "..."`

Always pass `--repo TheRocketCodeMX/gsd-core` explicitly — the local clone has multiple remotes and `gh` may resolve to the wrong one.

## When a skill says "publish to the issue tracker"

Create a GitHub issue at `TheRocketCodeMX/gsd-core`.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --repo TheRocketCodeMX/gsd-core --comments`.
