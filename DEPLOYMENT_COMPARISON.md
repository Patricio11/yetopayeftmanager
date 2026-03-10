# Vercel vs AWS EC2 / VPS — Deployment Comparison

## Your Stack Context

- Next.js 16 (App Router, Server Components, API Routes)
- PostgreSQL on Neon (external DB)
- SSE for real-time payment status updates
- Webhook sending/receiving
- HMAC signature verification on every API call
- South African merchant base

---

## Vercel (Current)

### Pros

- **Zero DevOps** — push to git, it deploys automatically
- **Automatic HTTPS**, CDN, edge caching globally
- **Preview deployments** per PR — every branch gets its own URL
- **Auto-scaling** — handles traffic spikes without configuration
- **Built for Next.js** — same company, optimal Server Components and ISR support
- **Free tier** is generous for starting out

### Cons

- **Serverless cold starts** — each API route spins up fresh, adds 100–500ms latency on cold calls. HMAC auth + DB query on every request compounds this
- **Function timeouts** — 10s (free), 60s (Pro), 300s (Enterprise). Your analytics query with 7 parallel SQL queries could hit limits under load
- **SSE limitations** — serverless functions aren't designed for long-lived connections. Payment status SSE streams may drop or timeout
- **No persistent processes** — can't run background workers; cron jobs need external triggers (Vercel Cron or external service)
- **Vendor lock-in** — some Next.js features (ISR, middleware edge) are optimized specifically for Vercel's infrastructure
- **Cost scales with invocations** — at high volume (thousands of payment links/day), costs grow fast. Pro is $20/mo but function execution is metered
- **No server location control** — serverless functions run in a single region (usually US East unless configured). South African users may experience higher latency
- **Request body size limit** — 4.5MB on serverless functions

### Performance

| Metric | Value |
|--------|-------|
| First request after idle (cold start) | **200–800ms** |
| Warm requests | **50–150ms** |
| Throughput | Auto-scales, but each function is isolated |
| DB latency | Neon is also serverless — cold DB + cold function = double cold start |

---

## AWS EC2 / Dedicated VPS

### Pros

- **No cold starts** — Node.js process is always running, every request is warm. HMAC verification + DB queries respond in **10–50ms** consistently
- **SSE works perfectly** — persistent connections, no timeouts, real-time payment status updates are rock solid
- **Full control** — choose your region (e.g., AWS Cape Town `af-south-1`), server size, OS, Node version
- **Background workers** — run cron jobs, webhook retry queues, invoice generation in the same process or as PM2 workers
- **Predictable cost** — a t3.medium (~$30/mo) or Hetzner VPS (~$5–15/mo) handles thousands of requests/day. No per-invocation billing
- **Long-running operations** — analytics queries, batch operations, webhook fanout — no timeout limits
- **WebSocket/SSE native** — persistent connections for real-time features work out of the box
- **Database proximity** — co-locate in the same region as your Neon DB for <5ms latency

### Cons

- **You are the DevOps team** — server setup, security patches, SSL certificates, firewall rules, monitoring, backups
- **No auto-scaling** — traffic spikes require manual scaling or auto-scaling groups (ASG) setup
- **Deployment pipeline** — you need to build your own CI/CD (GitHub Actions → SSH deploy, or Docker + ECR)
- **SSL/HTTPS** — need Nginx reverse proxy + Let's Encrypt (or AWS ALB)
- **Downtime during updates** — need zero-downtime deploy strategy (PM2 reload, blue-green, etc.)
- **No preview deployments** — PRs don't get automatic preview URLs
- **DDoS protection** — need Cloudflare or AWS Shield, not built-in
- **Monitoring** — need to set up your own (PM2, Datadog, CloudWatch, or UptimeRobot)

### Performance

| Metric | Value |
|--------|-------|
| Every request | **10–50ms** consistently (no cold starts) |
| Throughput | 2-core VPS handles **500–1,000 req/s** for this use case |
| SSE | Unlimited concurrent connections (limited by RAM) |
| DB latency | Co-located with Neon region: **2–5ms** query latency |

---

## Cost Comparison (at scale)

| Scenario | Vercel Pro | EC2 t3.medium | Hetzner VPS |
|----------|-----------|---------------|-------------|
| Monthly base | $20 | ~$30 | ~$8 |
| 10K API calls/day | $20–40 | $30 (flat) | $8 (flat) |
| 100K API calls/day | $100–200+ | $30 (flat) | $8 (flat) |
| 500K API calls/day | $500+ | $60 (t3.large) | $15 |
| Bandwidth (100GB) | Included | ~$9 | Included |

---

## Side-by-Side Feature Comparison

| Feature | Vercel | EC2/VPS |
|---------|--------|---------|
| Cold starts | Yes (100–500ms) | None |
| SSE/WebSocket | Limited (timeouts) | Full support |
| Auto-scaling | Built-in | Manual / ASG |
| SSL/HTTPS | Automatic | Nginx + Let's Encrypt |
| Preview deploys | Automatic per PR | Not built-in |
| CI/CD | Built-in | GitHub Actions (DIY) |
| Background jobs | Vercel Cron (limited) | PM2 / native cron |
| Server region | Limited options | Any (incl. Cape Town) |
| DDoS protection | Built-in (basic) | Cloudflare / AWS Shield |
| Monitoring | Vercel Analytics | DIY (PM2, CloudWatch) |
| Cost model | Per-invocation | Flat monthly |
| DevOps effort | Zero | Moderate |
| Function timeout | 10–300s (tier dependent) | Unlimited |
| Request body limit | 4.5MB | Configurable |

---

## Recommendation for YetoPay

Since this system handles **real money transactions**, here's the honest assessment:

### Stay on Vercel if:

- You're in early stage, low volume (<1,000 transactions/day)
- You value zero maintenance and fast iteration
- Your team is small and can't dedicate time to server management
- Preview deployments and instant rollbacks are important to your workflow

### Move to EC2/VPS if:

- You're scaling to meaningful transaction volume
- SSE reliability matters (payment status updates dropping is bad UX)
- You want consistent sub-50ms API response times for merchants hitting your API server-to-server
- You want to reduce cost at scale
- You want infrastructure in `af-south-1` (Cape Town) for South African merchants
- You need background workers for webhook retries, invoice generation, etc.

### Best of Both Worlds (Hybrid):

- Keep the **frontend/dashboard** on Vercel (great for SSR, CDN, preview deploys)
- Move **API routes** to a dedicated Node.js server on EC2/VPS behind Nginx
- This gives you: Vercel's developer experience for the UI + dedicated server performance for the payment API

---

## EC2/VPS Production Stack

If you go the self-hosted route, the recommended stack:

```
Cloudflare (DNS + DDoS + CDN)
  └── Nginx (reverse proxy + SSL via Let's Encrypt)
       └── PM2 (process manager, zero-downtime reloads)
            └── next start (production build, port 3000)
                 └── Neon PostgreSQL (external, same region)
```

### CI/CD Pipeline

```
GitHub Push → GitHub Actions:
  1. npm ci && npm run build
  2. SCP .next/ + package.json to server
  3. SSH → pm2 reload yetopay (zero downtime)
```

### Key PM2 Commands

```bash
# Start with cluster mode (use all CPU cores)
pm2 start npm --name yetopay -- start -i max

# Zero-downtime reload after deploy
pm2 reload yetopay

# View logs
pm2 logs yetopay

# Monitor
pm2 monit
```

### Nginx Config (simplified)

```nginx
server {
    listen 443 ssl http2;
    server_name yetopay.co.za www.yetopay.co.za;

    ssl_certificate /etc/letsencrypt/live/yetopay.co.za/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yetopay.co.za/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # SSE support
        proxy_buffering off;
        proxy_read_timeout 86400s;
    }
}
```

---

## AWS Cape Town Region (af-south-1)

If choosing AWS for South African users:

| Service | Purpose | Monthly Cost |
|---------|---------|-------------|
| EC2 t3.medium | App server (2 vCPU, 4GB RAM) | ~$30 |
| ALB | Load balancer + SSL | ~$18 |
| Route 53 | DNS | ~$1 |
| CloudWatch | Monitoring + alerts | ~$5 |
| **Total** | | **~$54/mo** |

Alternatively, **Hetzner** (Falkenstein/Helsinki, no SA region) at **$8–15/mo** with Cloudflare in front gives excellent global performance at a fraction of the cost.

---

## Migration Checklist (if moving off Vercel)

- [ ] Set up EC2/VPS instance with Node.js 20+
- [ ] Install and configure Nginx as reverse proxy
- [ ] Set up SSL with Let's Encrypt (certbot)
- [ ] Install PM2 and configure ecosystem file
- [ ] Set up GitHub Actions CI/CD pipeline
- [ ] Configure environment variables on server
- [ ] Set up Cloudflare DNS (point domain to new server IP)
- [ ] Update `NEXT_PUBLIC_APP_URL` to new domain/IP
- [ ] Update Better Auth `trustedOrigins` if domain changes
- [ ] Test all API endpoints, SSE, webhooks
- [ ] Set up monitoring (UptimeRobot, PM2 metrics)
- [ ] Set up automated backups
- [ ] Configure firewall (UFW: allow 80, 443, 22 only)
- [ ] Set up log rotation
- [ ] DNS propagation + SSL verification
- [ ] Smoke test payment flow end-to-end
