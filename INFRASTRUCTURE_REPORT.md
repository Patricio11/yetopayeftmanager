# YetoPayEFT — Infrastructure & Cost Report

**Prepared for:** Team Presentation
**Target Throughput:** 1,000+ transactions/hour
**Deployment Model:** Self-hosted (EC2/VPS)
**Systems:** YetoPayEFT (Manager) + EFT Service (Payment Engine)

---

## 1. What Are These Two Systems?

| | YetoPayEFT (Manager) | EFT Service (Engine) |
|--|----------------------|----------------------|
| **Role** | Merchant dashboard, partner portal, payment page, API gateway, transaction management | Automated bank-to-bank EFT payment execution via browser automation |
| **Who uses it** | Merchants, partners, admins (via browser) and merchant systems (via API) | Only YetoPayEFT (internal, never exposed publicly) |
| **Analogy** | The control tower | The aircraft |

```
 Customer clicks "Pay"                Merchant Dashboard
        │                                    │
        ▼                                    ▼
┌──────────────────────────────────────────────────────┐
│                   YetoPayEFT (Manager)               │
│                                                      │
│  • Payment pages (/pay/:token)                       │
│  • REST API (create transactions, webhooks)           │
│  • Merchant/Partner/Admin dashboards                 │
│  • Transaction tracking & reconciliation             │
│  • Bank health monitoring & alerts                   │
│  • Partner management & commission system            │
│                                                      │
│  Next.js 16 · TypeScript · PostgreSQL · PM2          │
└──────────────────┬───────────────────────────────────┘
                   │ JWT-signed requests (internal)
                   ▼
┌──────────────────────────────────────────────────────┐
│                   EFT Service (Engine)                │
│                                                      │
│  • Launches headless Chromium browsers               │
│  • Automates login → OTP → payment → confirmation    │
│  • Supports 17+ South African banks                  │
│  • Browser pooling (shared Chromium instances)        │
│  • Screenshot capture for proof & audit              │
│  • Real-time SSE progress updates                    │
│  • Prometheus metrics endpoint                       │
│                                                      │
│  Hono 4.9 · JavaScript · Playwright · Docker         │
└──────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack

| Layer | YetoPayEFT (Manager) | EFT Service (Engine) |
|-------|----------------------|----------------------|
| **Runtime** | Node.js 20+ | Node.js 20+ |
| **Framework** | Next.js 16 (App Router, RSC) | Hono 4.9 (~14KB, near-zero overhead) |
| **Language** | TypeScript | JavaScript (ES Modules) |
| **Database** | PostgreSQL (Drizzle ORM) | SQLite (Sequelize, optional) |
| **Auth** | Better Auth (sessions + email verification) | JWT RS256 (stateless, issued by Manager) |
| **Browser Automation** | None | Playwright + Chromium |
| **Process Manager** | PM2 (cluster mode) | Docker container |
| **Caching** | In-memory (upgrade to Redis at scale) | In-memory browser pool |
| **Observability** | Application logs, bank health dashboard | Prometheus metrics + OpenTelemetry |
| **Email/SMS** | Nodemailer + Twilio (optional) | N/A |
| **Screenshot Storage** | N/A | Local / Supabase / AWS S3 (pluggable) |

### Why This Stack is Fast

- **Hono** — Benchmarks at 150K+ req/s, one of the fastest Node.js frameworks
- **Next.js 16 Server Components** — Reduces client JS, faster page loads, streaming SSR
- **Drizzle ORM** — Compiles to raw SQL at build time, no runtime query overhead like Prisma
- **Playwright browser pooling** — Shares Chromium instances across sessions (2x capacity vs 1-browser-per-transaction)
- **SQLite for EFT logs** — Zero network latency, no connection pool overhead
- **PM2 cluster mode** — Uses all CPU cores, automatic restart on crash
- **JWT stateless auth** — No session lookup between Manager and Engine, zero DB hit per EFT request

---

## 3. Infrastructure Sizing for 1,000+ tx/hour

### Capacity Math

```
1,000 tx/hour = ~17 transactions/minute = ~1 transaction every 3.5 seconds

Average EFT session duration:  60–120 seconds (bank login → OTP → confirm)
Peak concurrent sessions:      35–50 (assuming 120s avg with burst headroom)

Each Chromium context:         ~80–120 MB RAM
Browser pool (shared):         10 contexts per Chromium instance
Chromium instances needed:     4–5 browsers × 10 contexts = 40–50 concurrent sessions
```

### Recommended Server Configuration

| Server | Spec | Runs | Why This Size |
|--------|------|------|---------------|
| **Server 1** | 4 vCPU, 8 GB RAM, 50 GB SSD | YetoPayEFT + Redis | Next.js needs ~1.5 GB × 4 PM2 workers |
| **Server 2** | 8 vCPU, 16 GB RAM, 100 GB SSD | EFT Service (Docker) | Chromium is CPU/RAM hungry |
| **Database** | 2 vCPU, 4 GB RAM, 100 GB SSD | PostgreSQL | Or use Neon managed ($19/mo) |

> **EFT Service MUST run on its own server.** At 50 concurrent sessions, browsers alone consume ~5 GB RAM + heavy CPU for page rendering. A browser crash must never take down the Manager.

---

## 4. Monthly Cost Estimates

### Option A: AWS EC2 (eu-west-1 / af-south-1)

| Resource | Instance | On-Demand/mo | Reserved 1yr/mo |
|----------|----------|-------------|-----------------|
| YetoPayEFT | t3.xlarge (4 vCPU, 16 GB) | $122 | $77 |
| EFT Service | c6i.2xlarge (8 vCPU, 16 GB) | $245 | $155 |
| PostgreSQL (RDS) | db.t3.medium (2 vCPU, 4 GB) | $58 | $37 |
| Redis (ElastiCache) | cache.t3.small (1.5 GB) | $24 | $17 |
| EBS Storage (250 GB) | gp3 | $20 | $20 |
| Data Transfer (500 GB) | — | $45 | $45 |
| **Total AWS** | | **$514/mo** | **$351/mo** |

### Option B: Hetzner (EU) — Best Value

| Resource | Server | Monthly |
|----------|--------|---------|
| YetoPayEFT + Redis | CPX31 (4 vCPU, 8 GB) | €15 (~$16) |
| EFT Service | CPX51 (8 vCPU, 16 GB) | €35 (~$38) |
| Database | CPX21 (3 vCPU, 4 GB) + managed PG | €24 (~$26) |
| Storage (200 GB) | Included | $0 |
| Load Balancer | LB11 | €6 (~$7) |
| Backups | 20% of server cost | €16 (~$17) |
| **Total Hetzner** | | **~$104/mo** |

### Option C: DigitalOcean

| Resource | Droplet | Monthly |
|----------|---------|---------|
| YetoPayEFT + Redis | Premium 4 vCPU, 8 GB | $56 |
| EFT Service | CPU-Optimized 8 vCPU, 16 GB | $126 |
| PostgreSQL (Managed) | 2 vCPU, 4 GB | $60 |
| Redis (Managed) | 1 GB | $15 |
| Load Balancer | Small | $12 |
| **Total DigitalOcean** | | **$269/mo** |

### Option D: Hetzner + Neon (Recommended Starting Point)

Keep Neon for managed PostgreSQL (already in use), self-host only compute:

| Resource | Provider | Monthly |
|----------|----------|---------|
| Neon Pro (PostgreSQL) | Neon | $19 |
| YetoPayEFT + Redis | Hetzner CPX31 | $16 |
| EFT Service | Hetzner CPX51 | $38 |
| **Total Hybrid** | | **~$73/mo** |

> Neon gives you managed backups, connection pooling, auto-scaling, and zero-downtime — less ops work.

### Cost Comparison Summary

| Provider | Monthly | Annual | Best For |
|----------|---------|--------|----------|
| **Hetzner + Neon** | **$73** | **$876** | Best value, fast start |
| **Hetzner (full self-host)** | $104 | $1,248 | Max control, more ops |
| **DigitalOcean** | $269 | $3,228 | Good balance, SA region |
| **AWS (reserved)** | $351 | $4,212 | Enterprise compliance |
| **AWS (on-demand)** | $514 | $6,168 | Flexible, highest cost |

---

## 5. Performance Optimization Checklist

### YetoPayEFT (Manager)

| Optimization | Impact | Priority |
|-------------|--------|----------|
| PM2 cluster mode (4 workers) | 4x throughput | Must have |
| Next.js standalone output | Smaller deploy, faster cold start | Must have |
| Nginx gzip/brotli compression | 60-70% bandwidth reduction | Must have |
| Static asset caching (1yr immutable) | Zero re-downloads for returning users | Must have |
| Redis for rate limiting | Consistent under load (replaces in-memory Map) | Should have |
| PostgreSQL connection pooling | Prevent connection exhaustion under burst | Have (via Neon) |
| CDN for static assets | Faster global load times | Nice to have |

### EFT Service (Engine)

| Optimization | Impact | Priority |
|-------------|--------|----------|
| Browser pooling (`MAX_CONTEXTS_PER_BROWSER=10`) | 2x capacity (default) | Have it |
| Tune to 15-20 contexts/browser | Up to 3x capacity | Test & tune |
| Chromium headless mode | 30% less RAM | Default in prod |
| Screenshot level: `essential` | Less disk I/O per transaction | Must have |
| tmpfs for `/tmp` and browser cache | Faster disk I/O (RAM-backed) | Must have |
| CPU-optimized instance | Chromium is CPU-bound | Must have |
| Session TTL: 900s | Auto-cleans stale sessions | Default |
| Graceful shutdown drain: 180s | Completes in-flight transactions | Default |

### Database

| Optimization | Impact | Priority |
|-------------|--------|----------|
| Indexes on `eft_transactions(merchantId, status, createdAt)` | Fast dashboard queries | Verify |
| Indexes on `user(email, role, partnerId)` | Fast auth & partner lookups | Verify |
| Connection pooling (PgBouncer or Neon built-in) | Prevents connection floods | Have (Neon) |
| Archive old transactions (>90 days) | Keep main table lean | Recommended |
| Read replicas | Offload dashboard reads | At 5K tx/hr |

### Network — Critical for Performance

| Optimization | Impact | Priority |
|-------------|--------|----------|
| Both servers in **same datacenter** | <1ms internal latency between Manager ↔ Engine | Must have |
| Nginx SSL termination with HTTP/2 | Multiplexed connections, faster page loads | Must have |
| Keep-alive connections to upstream | No TCP handshake per request | Must have |
| Internal/private network between services | Security + no internet hop | Must have |
| EFT Service **never exposed publicly** | Only Manager talks to it | Must have |

---

## 6. Scaling Path

```
         1,000 tx/hr              5,000 tx/hr              20,000+ tx/hr
        ─────────────           ─────────────            ──────────────

         1x EFT Service          3x EFT Service           10x EFT containers
         (8 vCPU, 16 GB)         + Load Balancer           Kubernetes / ECS
                                 (round-robin)             + auto-scaling

         1x YetoPayEFT           2x YetoPayEFT            4x YetoPayEFT
         (4 vCPU, 8 GB)          + shared Redis            + CDN + Redis cluster

         Neon Pro                Self-hosted PG             PG Primary + 2 replicas
         ($19/mo)                + read replica             + PgBouncer

         ~$73/mo                 ~$250/mo                   ~$800+/mo
```

### When to Scale — Key Metrics

| Metric | Threshold | Action |
|--------|-----------|--------|
| EFT Service CPU sustained >75% | 5 min | Add another EFT Service instance |
| EFT Service RAM >80% | Immediate | Increase server or add instance |
| Avg bank session time >180s | Trending up | Investigate bank-specific latency |
| DB connections >80 | Sustained | Add connection pooler |
| Transaction error rate >2% | Immediate | Check bank health dashboard |
| Manager API P95 response >500ms | Trending up | Add YetoPayEFT instance |
| Concurrent sessions >40 | Sustained | Scale EFT Service horizontally |

---

## 7. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NGINX (Port 443)                              │
│  SSL termination · gzip · static cache · rate limiting               │
│                                                                      │
│  /                    → YetoPayEFT  (localhost:3000)                │
│  /api/*               → YetoPayEFT  (localhost:3000)                │
│  /pay/*               → YetoPayEFT  (localhost:3000)                │
│  /dashboard/*         → YetoPayEFT  (localhost:3000)                │
└──────────────────────────────────────────────────────────────────────┘

Server 1 — YetoPayEFT (Manager):
  PM2 cluster mode × 4 workers
  next build → next start
  Redis co-located (rate limiting, session cache)
  .env.local for configuration

Server 2 — EFT Service (Engine):
  Docker container (mcr.microsoft.com/playwright image)
  docker-compose.prod.yml (8 CPU, 16 GB RAM limits)
  Volumes: /data (SQLite logs), /storage (screenshots)
  Health check: GET /health every 30s
  Prometheus metrics: GET /metrics
  INTERNAL NETWORK ONLY — not reachable from internet

Database:
  Neon (managed PostgreSQL) OR self-hosted PostgreSQL 16
  Daily automated backups, point-in-time recovery
  Connection pooling built-in (Neon) or PgBouncer (self-hosted)

Communication:
  YetoPayEFT → EFT Service: JWT RS256 signed HTTP requests
  EFT Service → YetoPayEFT: HMAC-SHA256 signed webhook callbacks
```

---

## 8. Security Hardening

| Layer | Measure |
|-------|---------|
| **Firewall** | UFW: only ports 22 (SSH), 80, 443 open on Server 1. Server 2 has NO public ports |
| **SSH** | Key-only auth, disable root login, non-standard port |
| **Nginx** | TLS 1.2+ only, HSTS, rate limiting (10 req/s burst 20) |
| **EFT Service** | Private network only, JWT verification on every request |
| **Database** | Private subnet, SSL connections only, no public endpoint |
| **Credentials** | AES-256 encryption for stored bank credentials |
| **Webhooks** | HMAC-SHA256 signature on every callback |
| **CSP** | Dynamic `frame-ancestors` for iframe embedding (admin-managed whitelist) |
| **Updates** | Unattended security patches (Ubuntu 22.04 LTS) |
| **Backups** | Daily DB snapshots, 30-day retention, encrypted at rest |

---

## 9. Third-Party Service Costs

| Service | Purpose | Free Tier | Paid Plan |
|---------|---------|-----------|-----------|
| **Neon** | PostgreSQL | 0.5 GB, 190 hrs compute | $19/mo (Pro) |
| **SMTP Provider** | Transactional email (alerts, invites) | — | $10–25/mo (SendGrid/Postmark) |
| **Twilio** | SMS alerts (bank failures) | — | ~$0.08/SMS (pay as you go) |
| **Let's Encrypt** | SSL certificates | Free | Free |
| **Brightdata** | Residential proxy (some banks need it) | — | $50–100/mo (if needed) |
| **Domain** | DNS | — | ~$12/yr |
| **S3 / Supabase** | Screenshot storage (optional) | 5 GB free | ~$5/mo |

### Estimated Third-Party Total: $30–75/month (excl. proxy)

---

## 10. Total Cost of Ownership

### Recommended Setup (Hetzner + Neon)

| Category | Monthly | Annual |
|----------|---------|--------|
| Server 1: YetoPayEFT + Redis | $16 | $192 |
| Server 2: EFT Service | $38 | $456 |
| Database (Neon Pro) | $19 | $228 |
| Email (SendGrid/Postmark) | $15 | $180 |
| Domain + SSL | $1 | $12 |
| Backups & snapshots | $10 | $120 |
| Proxy (if needed for specific banks) | $50 | $600 |
| **Total without proxy** | **$99/mo** | **$1,188/yr** |
| **Total with proxy** | **$149/mo** | **$1,788/yr** |

### ROI — Self-Hosted vs Managed Payment Gateway

```
Transaction volume:  1,000 tx/hr × 24 hrs × 30 days = 720,000 tx/month

Managed gateway fees (typical EFT):
  R2–R5 per transaction
  720,000 × R2 = R1,440,000/month (~$78,000 USD)

Self-hosted infrastructure:
  $99–149/month

Savings: ~$77,850/month
ROI:     500x+
```

---

## 11. Recommended Action Items

| # | Action | Owner | Priority |
|---|--------|-------|----------|
| 1 | Provision 2 Hetzner servers (CPX31 + CPX51) in same datacenter | DevOps | Week 1 |
| 2 | Keep Neon for PostgreSQL (managed backups, pooling) | DevOps | Week 1 |
| 3 | Set up Nginx with SSL (Let's Encrypt) on Server 1 | DevOps | Week 1 |
| 4 | Deploy EFT Service via `docker-compose.prod.yml` on Server 2 | DevOps | Week 1 |
| 5 | Deploy YetoPayEFT via PM2 cluster mode on Server 1 | DevOps | Week 1 |
| 6 | Configure private network between servers | DevOps | Week 1 |
| 7 | Set up Prometheus + Grafana for EFT Service metrics | DevOps | Week 2 |
| 8 | Install Redis on Server 1 (replace in-memory rate limiting) | Backend | Week 2 |
| 9 | Configure webhook retry cron (`/api/cron/webhook-retries` every 1 min) | Backend | Week 2 |
| 10 | Load test: simulate 1,000 tx/hr and tune `MAX_CONTEXTS_PER_BROWSER` | QA | Week 2 |
| 11 | Set up daily backup automation + test restore procedure | DevOps | Week 3 |
| 12 | Configure bank health monitoring alerts (email + Slack) | Backend | Week 3 |

---

## 12. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Bank website changes break automation | Medium | High | Screenshot monitoring, alert on error spike, modular bank adapters |
| Chromium memory leak under sustained load | Low | Medium | Session TTL cleanup (15 min), Docker restart policy, health checks |
| Database connection exhaustion | Low | High | Neon pooling (or PgBouncer), connection limits per worker |
| Single EFT Service instance failure | Medium | High | Docker restart: always, health check, scale to 2+ instances at 3K tx/hr |
| SSL certificate expiry | Low | High | Certbot auto-renewal with cron, monitoring alert |
| Proxy provider downtime | Low | Medium | Fallback to direct connection for non-proxy banks |
