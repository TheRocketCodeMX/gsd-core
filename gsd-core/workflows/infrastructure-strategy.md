<purpose>
Recommend an infrastructure strategy matched to the project's actual traffic shape, team size, and spend: WHICH cloud, WHICH compute rung per component, WHAT data layer per environment, and the observability + IaC floors. The compute rung is an OUTPUT of evidence (utilization crossovers, team-size floor, capability triggers), never a platform picked for résumé or comfort. Runs after recommend-architecture (consumes the topology) and testing-strategy (consumes CI needs), before planning. Produces `.planning/INFRA-STRATEGY.md`, consumed by /gsd:cicd-strategy and plan-phase.
</purpose>

<required_reading>
@~/.claude/gsd-core/references/infrastructure-strategy.md
@~/.claude/gsd-core/references/data-environments.md
@~/.claude/gsd-core/templates/infra-strategy.md
</required_reading>

<process>

## Step 1: Initialize

```bash
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; if [ -f "$GSD_TOOLS" ]; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif command -v gsd-tools >/dev/null 2>&1; then GSD_TOOLS="$(command -v gsd-tools)"; gsd_run() { "$GSD_TOOLS" "$@"; }; elif [ -f "$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and gsd-tools is not on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi
COMMIT_DOCS=$(gsd_run query config-get commit_docs 2>/dev/null || echo "true")
RESPONSE_LANG=$(gsd_run query config-get response_language 2>/dev/null || true)
ls .planning/PROJECT.md >/dev/null 2>&1 && echo "PROJECT_FOUND" || echo "NO_PROJECT"
ls .planning/adr/*.md >/dev/null 2>&1 && echo "HAS_ADR" || echo "NO_ADR"
ls .planning/INFRA-STRATEGY.md >/dev/null 2>&1 && echo "EXISTS" || echo "NEW"
```

**If `NO_PROJECT`:** Stop — "No project found. Run /gsd:new-project first." Exit.

**If `RESPONSE_LANG` non-empty:** all user-facing text in that language; keep technical terms, service names (Cloud Run, Fargate, GKE), and rung names in English.

**Text mode** (`--text` OR `workflow.text_mode: true`): replace every `AskUserQuestion` with a plain-text numbered list.

**If `EXISTS` and not `--auto`:** ask Update / View / Skip (header "Infra"). On Skip: exit ("Existing INFRA-STRATEGY.md preserved."). On View: show then Update/Skip.

## Step 2: Load context

```bash
cat .planning/PROJECT.md 2>/dev/null || true
cat .planning/PRODUCT-BRIEF.md 2>/dev/null || true
cat .planning/REQUIREMENTS.md 2>/dev/null || true
cat .planning/adr/*.md 2>/dev/null || true
cat .planning/TEST-STRATEGY.md 2>/dev/null || true
```

**Read `@~/.claude/gsd-core/references/infrastructure-strategy.md` now** — it defines the compute ladder with quantified move-up triggers, the crossover numbers (Fargate-vs-EC2, the CAST AI utilization data, the <4-engineers floor), the per-cloud asymmetries and equivalences table, the observability floor, the when-you-actually-need triggers, the IaC floor, the anti-patterns, and the meta-tell.

**Grounding maturity governs elicitation depth.** When upstream artifacts (spec, ADR, strategies, research) already answer a step, draft-from-docs and present for confirmation — cite the source, don't re-interview. Reserve questions for genuine decision points and contradictions. Honor a posture stated in `$ARGUMENTS` without re-asking.


From the artifacts, extract: **scale expectations + traffic shape** (PRODUCT-BRIEF), **deployment topology** — how many independently deployed components (the ADR; monolith → one service is the normal answer), and **CI environment needs** (TEST-STRATEGY: test containers, e2e environments). **If `NO_ADR`:** tell the user "No architecture decision found — I'll ask briefly. (Consider `/gsd:recommend-architecture` first.)" then ask: how many deployables, and is anything stateful self-managed?

Then gather the three inputs every crossover keys off (AskUserQuestion, header "Shape", or a text list): **traffic shape** (idle most of the day? bursty? steady?), **team size** (engineers who'd touch infra), and **expected monthly compute spend** (or "no idea" — fine, the default rung is the safe prior).

## Step 3: Cloud selection

Ask (AskUserQuestion, header "Cloud"): "Is a cloud already decided or constrained (existing org account, credits, compliance, team experience)?" Options: GCP / AWS / Azure / "No constraint — recommend one".

If constrained: take it — the ladder is cloud-portable; use the reference's equivalences table to translate every later recommendation into that cloud's column. If unconstrained: recommend by **team familiarity first** (the cloud the team knows beats marginal pricing differences), and surface the one asymmetry that matters at this stage: a scale-to-zero **$0-idle dev environment** is real on GCP (Cloud Run) and Azure (Container Apps) via their shared free grant; on AWS, Fargate has no free tier and does not scale to zero — dev costs idle money or gets redesigned around Lambda. For a small greenfield team with no constraint, that asymmetry usually tips GCP or Azure.

## Step 4: Compute rung (walk the ladder per component)

**Shipped-software check first:** if the product is user-operated (CLI/library/desktop/self-hosted binary), do NOT walk the ladder for the product itself — the reference's "Shipped software, not a service" section governs: CI compute + distribution + docs hosting + spend guardrails; the service ladder becomes promotion-trigger material only.

For each deployable component from the ADR topology, walk the reference's ladder. **Default = serverless containers** (Cloud Run / ECS+Fargate / Container Apps). Only place a component on another rung when a concrete trigger from the reference fires — and record the trigger next to the rung.

- **Rung-down check (static/FaaS):** pre-renderable frontends → static/edge hosting; pure event-glue (webhooks, queue consumers, cron) → FaaS is fine *until* the FaaS→containers triggers: >15-min runs, WebSockets/streaming, connection pools / in-memory caches, or ~>15M invocations/month sub-second.
- **Rung-up check (K8s):** only when sustained utilization >40–50% with commitments (roughly >$50–100k/yr compute) AND team ≥4 engineers or a platform owner, OR a capability trigger (GPUs, sidecars/mesh, multi-tenant isolation, stateful sets, operators). If the K8s API is genuinely needed early, recommend **GKE Autopilot** (pod-level billing, no node ops) before a standard cluster.

**Scripted pushbacks — use these, don't improvise:**
- *"We need Kubernetes to scale."* Real clusters average **8–13% CPU utilization** (CAST AI, 2,000+ orgs; ~70% of requested resources never used); AWS's own study shows **Fargate 87% cheaper at ~6% utilization**, and dedicated compute only wins above ~70–80% sustained on-demand (~40–50% with commitments) — 4–10× above what the median cluster achieves. Serverless containers scale further than this project's brief requires. And the team-size floor is hard: **<4 engineers → no self-managed K8s.** Ask for the current, concrete capability trigger; if none, the default rung stands. If the K8s API itself is the requirement, offer GKE Autopilot as the middle rung.
- *"We'll just use a VM, it's simpler."* Check the exception list: BYOL licensing, special hardware/GPU control, kernel access, self-managed stateful systems, max-utilization 3-yr-RI fleets. None apply → the VM means hand-rolling deploys, health checks, rollouts, and autoscaling that the serverless-container platform does for free. (Honest exception: a tiny fixed-traffic product on one boring VM is legitimate — say so if it fits, and record the promotion trigger.)

For every component, also record the **promotion trigger to the next rung** (the measurable signal — sustained utilization, invocation volume, a capability need — that would justify moving up later).

## Step 5: Data layer (delegate detail)

**Read `@~/.claude/gsd-core/references/data-environments.md` now** — it owns the database detail: the serverless-Postgres crossover (when Neon/Aurora-Serverless-class beats provisioned), why **connection pooling is mandatory** the moment serverless compute talks to Postgres (every scaled-out instance opens connections; poolers/pgbouncer or the provider's pooled endpoint), and the per-environment data story.

Here, decide only the headline: managed Postgres in the chosen cloud (Cloud SQL / RDS / PG Flexible Server) vs serverless Postgres for dev/preview, sized one notch smaller than instinct (61% never rightsize; rightsizing recovers 20–40%), storage autoscaling on, multi-AZ only when users would notice an outage. Record per environment: dev / preview / staging / prod, and the **crossover-watch metric** from the reference (the number that, when crossed, flips the provisioned-vs-serverless answer).

## Step 6: Environments, observability floor, IaC floor

Recommend defaults, then confirm in one round (AskUserQuestion, header "Floors", or a text list):

- **Environments:** dev (scale-to-zero, $0-idle where the cloud allows) → staging (prod-shaped, smaller) → prod. Preview-per-PR only if the platform makes it free-ish (Cloud Run/ACA revisions do).
- **Observability floor (day one, ~$0–26/mo):** structured JSON logs to stdout; error tracking (Sentry free tier); an external uptime check; one golden-signals dashboard from platform metrics (rate, errors, p50/p95/p99, instances); **3–5 alerts max including a billing budget alert** — the most important alert a small team sets. Explicitly defer tracing/OTel and SLO machinery until **>3 services in a request path**.
- **IaC floor:** one small Terraform/OpenTofu root module (~100–200 lines, remote state in a bucket) OR honest scripted CLI deploys checked into the repo — both acceptable; **Terraform earns its keep at the second environment or second service**. Secrets in the cloud secret manager, never in tfvars. No premature modules.
- **Day-one non-negotiables:** max-instances cap (the cost ceiling), billing alert, structured logs, uptime check, the IaC floor.

## Step 7: Over-/under-engineering check (the meta-tell, both directions)

- **Downward:** every rung above serverless containers must name a **current, concrete requirement** (a real >15-min job, a real GPU/operator need, measured utilization above the crossover, a real BYOL contract). No concrete requirement → drop to the default. Same for LB/VPC/multi-region: no trigger from the reference's table → not yet.
- **Upward:** scan for parked mismatches — a self-managed Kafka or a stateful workload on the default rung, a 16-hour batch on Lambda, private-data access with no VPC plan, a CI strategy (TEST-STRATEGY) that needs containers the platform can't run. Move **that one component** up, not the whole stack.

State the surviving justifications; they go in the strategy doc.

## Step 8: Write INFRA-STRATEGY.md

**Recommend, don't dictate.** Present the full recommendation in one paragraph (cloud, rung per component, data layer, floors) with 1–2 alternatives and trade-offs (AskUserQuestion, header "Infra"): "Accept", "Adjust (I'll tell you what)", "Show alternatives in detail".

Once approved, render `@~/.claude/gsd-core/templates/infra-strategy.md` (fill `[DATE]`, `[PROJECT_TITLE]`, `[ADR-NNNN]`). Fill: cloud + why; the per-component compute table with triggers and promotion triggers; data layer per environment with the crossover-watch metric; environments map; secrets; the observability checklist; IaC approach; cost guardrails (billing alert thresholds, max-instances caps); NOT-decided/deferred; handoff notes.

Write to `.planning/INFRA-STRATEGY.md`.

## Step 9: Commit

```bash
if [ "$COMMIT_DOCS" = "true" ]; then
  gsd_run query commit "docs: add infrastructure strategy (serverless-container default)" --files .planning/INFRA-STRATEGY.md
else
  echo "INFRA-STRATEGY.md written but not committed (commit_docs is false)."
fi
```

## Step 10: Wrap up

Display:
```
INFRA-STRATEGY.md written — infrastructure matched to traffic shape and team size.

  Cloud: [GCP|AWS|Azure] ([why])
  Compute: [component → rung (trigger)] ...
  Data: [managed PG / serverless PG per env]
  Floors: observability [N alerts incl. billing] · IaC [Terraform root module | scripted CLI]
  Cost guardrails: max-instances cap + billing alert at [$N]

Next: /gsd:cicd-strategy   (pipelines + deploy targets will follow this strategy)
```

</process>

<critical_rules>
- **Serverless containers are the default rung.** Every rung above it needs a current, concrete trigger — recorded next to the rung. The CAST AI utilization data and the Fargate crossover are the evidence; cite them when pushing back.
- **The team-size floor is hard.** <4 engineers → no self-managed Kubernetes; GKE Autopilot is the escape hatch when the K8s API is genuinely required.
- **Per-cloud asymmetries change answers.** Fargate ≠ scale-to-zero and has no free tier; Cloud Run/Container Apps give a $0-idle dev story. Never recommend symmetrically across clouds.
- **Day-one non-negotiables:** max-instances cap, billing alert, structured logs, uptime check, the IaC floor.
- **Apply the meta-tell in both directions.** Drop unjustified rungs down; move genuinely-triggered components up — one component at a time, never the whole stack.
- **Recommend, don't dictate.** Present trade-offs and alternatives; the user approves. Respect `commit_docs` / `response_language`.
</critical_rules>

<success_criteria>
- Context loaded (PRODUCT-BRIEF / ADR / TEST-STRATEGY where present); traffic shape, team size, and spend gathered
- Cloud chosen (constraint or familiarity) with the scale-to-zero asymmetry surfaced
- Compute rung decided per component, each non-default rung tied to a concrete trigger; promotion triggers recorded
- Data layer per environment decided, pooling noted, crossover-watch metric recorded (per data-environments.md)
- Observability floor (incl. billing alert) and IaC floor confirmed; tracing/SLO explicitly deferred until >3 services in a request path
- Meta-tell applied both directions
- INFRA-STRATEGY.md written and committed (when commit_docs is true)
- User directed to /gsd:cicd-strategy
</success_criteria>
