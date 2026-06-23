# Infrastructure Strategy — Compute Ladder, Quantified

Reference for `/gsd:infrastructure-strategy`. Recommends infrastructure that **matches actual traffic shape, team size, and spend** — explicitly avoiding both the day-one Kubernetes cluster and the hand-rolled VM. Consumes the architecture ADR (topology) and PRODUCT-BRIEF (scale expectations). Recommends; the user decides.

## Core principle: serverless containers are the default rung

The empirically safe prior, not a bias: real Kubernetes clusters average **8–13% CPU utilization** (CAST AI 2,000-org telemetry, three consecutive years; ~70% of requested CPU/memory never used). The cost crossovers where dedicated compute wins sit at 40–80% sustained utilization — **4–10× above what the median real cluster achieves**. Most teams pay dedicated-cluster prices for serverless-shaped traffic. Start at the serverless-container rung; move up only on a trigger.

The three inputs every crossover keys off: **traffic shape** (idle %, burst ratio), **team size**, **monthly compute spend**. Get these before recommending anything.

## Shipped software, not a service (check this FIRST)

When the product is **user-operated** — a CLI, library, desktop app, self-hosted binary — the operated-infrastructure footprint may legitimately be ≈ zero, and walking the compute ladder for it is over-engineering by this reference's own rule. The decisions shift to: **CI compute** (often the only compute you pay for — API-bound workloads need spend guardrails, not bigger runners), **release & distribution channels** (registries, GitHub Releases, installers — see the publishing section of `cicd-strategy.md`), **docs/results hosting** (Pages-class static hosting), and **API-spend guardrails** (provider billing alerts + workload kill-switches). Record the operated-service ladder only as **promotion-trigger material** for a future hosted tier — triggered, never pre-provisioned.

## The compute decision ladder

| Rung | Wins when | Move up when |
|------|-----------|--------------|
| **0 — Static / edge** (GCS+CDN, S3+CloudFront, Cloudflare Pages/Workers, Vercel) | content pre-renderable; logic fits edge functions (auth redirects, headers, A/B); pennies, scale-to-zero inherent | you need persistent server-side state, a real DB with private access, requests beyond edge runtime limits (CPU ms, no TCP), or a backend language the edge doesn't run |
| **1 — FaaS** (Lambda, Cloud Run functions, Azure Functions) | event-driven glue, webhooks, queue consumers, cron, spiky low-volume APIs | executions **>15 min** (Lambda hard limit); WebSockets/streaming/gRPC; in-memory caches / **connection pools** matter; you want one instance serving many concurrent requests; or volume crosses **~15M invocations/month** at sub-second durations — above that Fargate-class compute runs 40–70% cheaper |
| **2 — Serverless containers** (Cloud Run, ECS+Fargate, Container Apps) ← **DEFAULT** | stateless HTTP/gRPC APIs, web backends, workers — i.e., most apps. Any OCI image, no runtime ceiling, per-instance concurrency (Cloud Run default 80) amortizes cost across requests. Lock-in low: the artifact is a standard container | sustained busy **>40–50% with commitments** (roughly >$50–100k/yr compute) AND team ≥4 engineers or a platform owner; OR a capability trigger — GPU scheduling, sidecars/daemonsets/mesh, multi-tenant isolation, stateful sets, custom networking/CNI, operators (Kafka, Postgres) |
| **3 — Managed Kubernetes** (GKE / EKS / AKS) | many services with complex topology (~50+ services / platform-team scale), the capability triggers above, or sustained utilization where commitments pay. Control plane ~$0.10/hr (~$73/mo); the real cost is ops (~2.5 platform engineers per 100 devs) | **down** if utilization is <~20% sustained — you've built an idle cluster, the median case. Sideways to VMs only for the rung-4 exception list |
| **4 — Raw VMs** (GCE / EC2 / Azure VMs) | the **exception list only** — see below | **down** when you find yourself reimplementing deploys, health checks, rollouts, and autoscaling by hand for a stateless web app — that's the platform's job |

**The VM exception list** (the only reasons rung 4 is a destination): BYOL / dedicated-host licensing (Windows, Oracle); special hardware (specific GPU SKUs, local NVMe, huge memory) or fine-grained GPU control; kernel/OS access; self-managed stateful systems (DBs, brokers); max-utilization steady fleets on 3-yr RIs/CUDs (−55% to −66% off, beats everything *if* you actually sustain the load). Plus the honest small case: "a couple of boring VMs" for a tiny fixed-traffic product is legitimate simplicity — what's rarely right is VM+ASG+LB templates as the default *growth* architecture.

## The quantified crossovers (why the default is the default)

- **AWS's own Fargate study** (AWS Containers Blog): at ~6% CPU reservation, **Fargate is 87% cheaper** than the EC2 equivalent; at 100% reservation EC2 is only **>20% cheaper**. Derived from current prices (Fargate $0.04048/vCPU-hr + $0.004445/GB-hr vs m5.large): on-demand EC2 wins only above **~70–80% sustained packing**; with a 3-yr Savings Plan the crossover drops to **~40–50% sustained**. FinOps rule of thumb: Fargate carries a 20–30% premium over *well-managed* EC2 — and almost nobody manages EC2 well (see CAST AI).
- **Cloud Run vs a cluster:** a 10M-req/mo, 50 ms service ≈ **$30–40/mo on Cloud Run vs ~$210/mo** on a minimal always-on cluster (control plane + node floor before serving a request).
- **The labor term dominates:** practitioner FinOps analysis puts self-managed-K8s payback at **~$2.5M/yr compute spend** once engineer cost is in, and flatly: **fewer than 4 engineers → nobody should be running Kubernetes**. Treat the dollar figure as order-of-magnitude; the team-size floor as hard.
- **GKE Autopilot is the escape hatch** when someone genuinely needs the K8s API early: pod-level billing, no node ops — the sane intermediate rung before GKE Standard/EKS.
- **PaaS nostalgia costs ~+50%:** App Engine-style PaaS runs about 50% more than Cloud Run for less flexibility; Google's own migration center steers new users to Cloud Run.

## Per-cloud asymmetries (encode these — they change recommendations)

- **Fargate does NOT scale to zero** (ECS services hold desired count; App Runner pauses to a low idle charge) and **has no free tier**.
- **Cloud Run and Container Apps share the same free grant** (180k vCPU-s + 360k GiB-s + 2M req/mo) **plus scale-to-zero** → a genuinely **$0/mo idle dev/staging environment on GCP or Azure**. On AWS it is not — use Lambda for dev or accept idle cost.
- Cold-start-sensitive + spiky → set **min-instances=1 and price it** (~$50–65/mo for 1 always-on vCPU on Cloud Run) before reaching for a cluster.
- AWS splits queueing across three services (SQS/SNS/EventBridge) where GCP has one; Azure's standalone-cron story is the weakest; GCP's secret-manager DX is the most container-native (direct Cloud Run mounting).

## Per-cloud equivalences

| Capability | GCP | AWS | Azure |
|---|---|---|---|
| Serverless containers | Cloud Run | ECS on Fargate (App Runner for PaaS-style) | Container Apps |
| Managed Kubernetes | GKE (Standard / Autopilot) | EKS | AKS |
| Managed Postgres | Cloud SQL (AlloyDB high-end) | RDS (Aurora high-end) | Database for PostgreSQL Flexible Server |
| Secrets | Secret Manager | Secrets Manager (SSM Parameter Store = cheap tier) | Key Vault |
| Queue / pub-sub | Pub/Sub (+ Cloud Tasks) | SQS + SNS + EventBridge | Service Bus + Storage Queues + Event Grid |
| Object storage | Cloud Storage | S3 | Blob Storage |
| Scheduler / cron | Cloud Scheduler | EventBridge Scheduler | Container Apps Jobs / Functions timer |
| Monitoring / logging | Cloud Monitoring + Logging | CloudWatch (+X-Ray) | Azure Monitor + App Insights |

The ladder is cloud-portable — pick the cloud by team familiarity and existing constraints, then read the column.

## The observability floor (day one, ~$0–26/mo)

1. **Structured JSON logs to stdout** — the platform log service ingests automatically. No log vendor yet.
2. **Error tracking** (Sentry free tier or GlitchTip): grouped, release-tagged, alerting included.
3. **Uptime check** on public endpoints — external, not just in-cloud (Cloud Monitoring uptime checks / UptimeRobot free tier).
4. **One golden-signals dashboard** from metrics the platform already emits: request rate, error rate, p50/p95/p99 latency, instance count/CPU. No agents needed on the default rung.
5. **3–5 alerts max:** error-rate spike, p95 over threshold, uptime fail, queue depth if async, and — non-negotiable — a **billing budget alert** (the most important alert a small team sets).

**Defer until real intra-backend fan-out** (or the first "which service caused this?" incident): the **heavy self-hosted tracing backend** (Prometheus+Grafana+Loki / Tempo — becomes its own pet), formal SLO/error-budget machinery, paid log aggregation, on-call tooling for a 3-person team. **Note — NOT deferred:** FE↔BE trace correlation across the single client→server boundary is a **day-one floor item** (W3C `traceparent` + linked error tracking via vendor SDKs), not heavy tracing infra — see `application-telemetry.md`. The old ">3 services" rule wrongly swept that in.

## When you actually need…

| Component | Default rung gives you | Add it when |
|---|---|---|
| **Load balancer** | Cloud Run domain mapping + managed TLS; ACA ingress; ALB already present with ECS | multi-region anycast, WAF/Cloud Armor, CDN in front, own TLS certs, path-routing across services, private exposure to a VPC |
| **VPC / private networking** | not required to ship — Cloud Run/ACA run outside your VPC by default | the **first private resource**: Cloud SQL/RDS private IP, Redis, internal-only services. Then use Direct VPC egress / a connector — and immediately audit the NAT rules (see anti-patterns) |
| **Multi-region** | one region + CDN serves most products | hard data-residency law; contractual RTO/RPO a region outage would break; a global latency-sensitive product (150 ms→50 ms class). Cheapest first step: **multi-region data backups**, not multi-region compute. Anti-pattern: 2× full capacity 24/7 "just in case" |
| **Autoscaling policies** | the platform IS the autoscaler | only tune three knobs: **max-instances (the cost cap — set it day one)**, min-instances (cold-start SLA), concurrency (CPU- vs IO-bound). Writing HPA/ASG policies is a rung-3/4 activity |

## The IaC floor

No IaC (unreproducible click-ops) and full Terraform ceremony for one service (modules-of-modules, Terragrunt, three repos) **both lose**. The floor: everything creatable from the repo, via either (a) **one small Terraform/OpenTofu root module** — provider, service, DB, secrets, domain, ~100–200 lines, remote state in a bucket — or (b) **honest scripted CLI deploys** (`gcloud run deploy` / `az containerapp up` + checked-in YAML). Both are acceptable; **Terraform earns its keep at the second environment or second service**. No premature module abstraction. CI deploys from main; secrets live in the cloud secret manager, never in tfvars.

## Anti-patterns

- **Day-one Kubernetes for a 3-person team.** <4 engineers → don't; case studies of $6,000/mo → $89/mo after leaving K8s, plus months of lost engineering time. Even enterprise platform teams report persistent K8s pain at ~93%.
- **The idle cluster.** Median 8–13% CPU, ~70% of requests never used (CAST AI). If you have a cluster, measure packing — or you're funding this anti-pattern.
- **NAT-gateway bill surprises.** $0.045/GB processed **including traffic to S3/ECR that would otherwise be free**; one misconfigured route = +$1,000/day (Geocodio). Fix: gateway VPC endpoints for S3/DynamoDB (free), interface endpoints for ECR; on GCP, Direct VPC egress + Private Google Access. Rule: the moment you create private subnets, audit what routes through NAT.
- **Never-rightsized managed Postgres.** 61% of developers never rightsize; RDS at 5% CPU is the norm; rightsizing recovers 20–40%. Floor: start one size smaller than you think (db.t4g / e2-small class), watch 60–90 days, scale on evidence; storage autoscaling on; multi-AZ only when users would notice.
- **PaaS-by-default** (App Engine-style): ~+50% cost for less flexibility.

## The meta-tell (use this to settle every rung)

If you cannot point to a **current, concrete requirement** — a real >15-min job, a real GPU/sidecar/operator need, real measured sustained utilization above the crossover, a real BYOL contract — that justifies a rung **above serverless containers**, you are over-engineering: drop to the default. If such a requirement exists and you parked it on the default rung anyway (a self-managed Kafka on Cloud Run, a 16-hour batch job on Lambda), you are under-engineering the platform choice: move that one component up — **and only that component**.

## Consumes / produces

- **Consumes** `PRODUCT-BRIEF.md` (scale expectations, traffic shape), the architecture ADR (`.planning/adr/` — deployment topology: how many deployables), and `TEST-STRATEGY.md` (CI needs: test containers, e2e environments). All optional — ask directly when absent.
- **Produces** `.planning/INFRA-STRATEGY.md` — cloud, compute rung per component with promotion triggers, data layer per environment, observability floor, IaC floor, cost guardrails. Feeds `/gsd:cicd-strategy` (deploy targets, environments) and `plan-phase`.
