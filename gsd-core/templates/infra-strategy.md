# Infrastructure Strategy — [PROJECT_TITLE]

**Created:** [DATE] via `/gsd:infrastructure-strategy`
**Basis:** architecture decision [ADR-NNNN] · PRODUCT-BRIEF scale expectations · TEST-STRATEGY CI needs.

## Cloud

**[GCP | AWS | Azure]** — [why: existing constraint / team familiarity / $0-idle dev story]. Inputs: traffic shape [idle/bursty/steady], team size [N], expected compute spend [~$N/mo].

## Compute (rung per component — default is serverless containers)

Every rung above the default must name the **current, concrete trigger** that justifies it.

| Component | Rung | Service | Trigger justifying anything above the default | Promotion trigger (→ next rung) |
|-----------|------|---------|-----------------------------------------------|---------------------------------|
| [api] | Serverless containers (default) | [Cloud Run / ECS+Fargate / Container Apps] | — | [sustained >40–50% busy w/ commitments AND ≥4 eng, or GPU/sidecar/operator need → K8s (Autopilot first)] |
| [webhooks/cron] | FaaS | [Lambda / CR functions / Functions] | [event-glue, spiky low volume] | [>15-min runs, WebSockets, conn pools, ~>15M invocations/mo → containers] |
| [frontend] | Static/edge | [CDN/Pages] | [pre-renderable] | [server-side state/runtime needed → up] |

**Knobs (day one):** max-instances cap = [N] per service (the cost ceiling); min-instances = [0 | 1 (~$50–65/mo, only if cold-start SLA demands it)]; concurrency = [default 80 / tuned].

## Data layer (per environment)

Detail and pooling rules: see `references/data-environments.md`. **Pooling is mandatory** wherever serverless compute talks to Postgres.

| Env | Database | Size / tier | Notes |
|-----|----------|-------------|-------|
| dev | [serverless PG / scale-to-zero] | [free tier] | [$0-idle where the cloud allows] |
| preview | [branch / per-PR] | — | [only if platform makes it cheap] |
| staging | [managed PG] | [one notch below prod] | prod-shaped |
| prod | [Cloud SQL / RDS / PG Flexible] | [start one size smaller than instinct] | storage autoscaling on; multi-AZ [yes/no + why] |

**Crossover-watch metric:** [the number that flips provisioned ↔ serverless PG — e.g. sustained connections / compute-hours/mo] — review at [60–90 days].

## Environments

[dev → staging → prod] · dev is [scale-to-zero $0-idle | low-cost idle (AWS)] · previews: [per-PR revisions | none yet].

## Secrets

[Secret Manager / Secrets Manager / Key Vault] — injected at deploy, never in tfvars or repo. (See `references/data-environments.md` for per-env secret handling.)

## Observability floor (day one)

- [ ] Structured JSON logs to stdout → platform log service
- [ ] Error tracking: [Sentry free tier / GlitchTip]
- [ ] External uptime check on [endpoint]
- [ ] Golden-signals dashboard (rate, errors, p50/p95/p99, instances)
- [ ] Alerts (3–5 max): error-rate spike · p95 > [N ms] · uptime fail · **billing alert** · [queue depth]

**Deferred until >3 services in a request path:** distributed tracing/OTel, SLO/error-budget machinery, self-hosted metrics stack, paid log aggregation.

## IaC

[One Terraform/OpenTofu root module (~100–200 lines, remote state in [bucket]) | scripted CLI deploys (`gcloud run deploy` / `az containerapp up`) + checked-in config]. Terraform earns its keep at the **second environment or second service** — [current status]. CI deploys from main.

## Cost guardrails

- Billing budget alert at **[$N/mo]** (warn at [50/90/100]%)
- max-instances caps set on every service (above)
- [NAT audit rule: the moment private subnets exist, audit what routes through NAT — gateway endpoints for S3/DynamoDB]
- DB rightsizing review at [60–90 days]

## NOT decided / deferred

- [Multi-region — trigger: data-residency law / contractual RTO-RPO / global latency need. First step would be multi-region backups, not compute]
- [Load balancer / WAF — trigger: path-routing across services, WAF need, private exposure]
- [VPC — trigger: first private resource (DB private IP, Redis)]
- [Kubernetes — trigger recorded in the compute table]

## Handoff notes

- **For `/gsd:cicd-strategy`:** deploy targets = [services above]; environments = [map above]; registry = [Artifact Registry / ECR / ACR]; IaC entry point = [path]; secrets source = [manager above].
- **For `plan-phase`:** infra setup tasks = [IaC floor, billing alert, uptime check, Sentry wiring]; anything in NOT-decided needs no work until its trigger fires.

---
*Infrastructure strategy. Consumed by `/gsd:cicd-strategy` and `/gsd:plan-phase`.*
