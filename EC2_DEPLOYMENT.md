# EC2 / VPS Deployment Guide — YetoPay

Complete guide for deploying YetoPay (Next.js 16) to AWS EC2 or a dedicated VPS with Nginx, PM2, SSL, and GitHub Actions CI/CD.

## Table of Contents

- [Prerequisites](#prerequisites)
- [EC2 Instance Setup](#ec2-instance-setup)
- [Initial Server Configuration](#initial-server-configuration)
- [Node.js & PM2 Setup](#nodejs--pm2-setup)
- [Application Deployment](#application-deployment)
- [Nginx Reverse Proxy](#nginx-reverse-proxy)
- [SSL/TLS Configuration](#ssltls-configuration)
- [PM2 Production Configuration](#pm2-production-configuration)
- [GitHub Actions CI/CD](#github-actions-cicd)
- [DNS & Cloudflare Setup](#dns--cloudflare-setup)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Security Hardening](#security-hardening)
- [Troubleshooting](#troubleshooting)
- [Cost Optimization](#cost-optimization)

---

## Prerequisites

### AWS Requirements

- AWS Account with EC2 access
- IAM user with permissions to create EC2 instances
- Key pair for SSH access (`.pem` file)
- Security group configured (see below)

### VPS Alternative

If using a VPS provider (Hetzner, DigitalOcean, Vultr, Contabo):
- Ubuntu 22.04+ LTS instance
- Minimum 2 vCPU, 2GB RAM
- SSH root/sudo access
- Public IPv4 address

### Local Requirements

- SSH client (Terminal / PuTTY)
- Git installed
- GitHub account with repository access
- Domain name pointed to your server IP

### Your Stack

| Component | Details |
|-----------|---------|
| Framework | Next.js 16 (App Router, Server Components) |
| Runtime | Node.js 20+ |
| Database | PostgreSQL on Neon (external, managed) |
| Auth | Better Auth (session-based + API keys) |
| ORM | Drizzle ORM |
| Real-time | SSE (Server-Sent Events) for payment status |
| Process Manager | PM2 |
| Reverse Proxy | Nginx |
| SSL | Let's Encrypt (Certbot) |
| CDN/DDoS | Cloudflare (recommended) |

---

## EC2 Instance Setup

### 1. Launch EC2 Instance

**Recommended Instance Types:**

| Environment | Instance Type | Specs | Monthly Cost |
|-------------|--------------|-------|-------------|
| Development/Staging | t3.small | 2 vCPU, 2GB RAM | ~$15 |
| Production | t3.medium | 2 vCPU, 4GB RAM | ~$30 |
| High Traffic | t3.large | 2 vCPU, 8GB RAM | ~$60 |

**Region Recommendation:** `af-south-1` (Cape Town) for South African merchants, or `eu-west-1` (Ireland) as a cost-effective alternative with decent latency to SA.

**Instance Configuration:**

```
AMI: Ubuntu Server 22.04 LTS (HVM), SSD Volume Type
Instance Type: t3.medium (recommended for production)
Storage: 30GB gp3 (minimum 20GB)
VPC: Default or custom
Subnet: Public subnet with auto-assign public IP
```

**Security Group Rules:**

| Type | Protocol | Port Range | Source | Description |
|------|----------|------------|-------|-------------|
| SSH | TCP | 22 | Your IP/32 | SSH access (restrict to your IP) |
| HTTP | TCP | 80 | 0.0.0.0/0 | HTTP traffic (redirects to HTTPS) |
| HTTPS | TCP | 443 | 0.0.0.0/0 | HTTPS traffic |

> **Important:** Do NOT open port 3000 publicly. Nginx proxies to the app on localhost:3000.

### 2. Connect to Instance

```bash
# Set correct permissions on key file
chmod 400 your-key.pem

# Connect via SSH
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

### 3. Allocate Elastic IP (Production)

For production, allocate an Elastic IP so your server IP doesn't change on restart:

```bash
# In AWS Console:
# EC2 → Network & Security → Elastic IPs → Allocate Elastic IP address
# Then: Actions → Associate Elastic IP address → Select your instance
```

---

## Initial Server Configuration

### 1. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Set Timezone

```bash
# Set to South Africa Standard Time
sudo timedatectl set-timezone Africa/Johannesburg

# Verify
date
```

### 3. Create Deploy User (Recommended)

```bash
# Create a dedicated deploy user
sudo adduser deploy
sudo usermod -aG sudo deploy

# Set up SSH for deploy user
sudo mkdir -p /home/deploy/.ssh
sudo cp ~/.ssh/authorized_keys /home/deploy/.ssh/
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys

# Switch to deploy user
sudo su - deploy
```

### 4. Configure Firewall (UFW)

```bash
# Install UFW
sudo apt install -y ufw

# Configure rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh        # Port 22
sudo ufw allow http       # Port 80
sudo ufw allow https      # Port 443

# Enable firewall
sudo ufw enable

# Verify
sudo ufw status verbose
```

### 5. Install Essential Tools

```bash
sudo apt install -y git curl wget htop unzip build-essential
```

---

## Node.js & PM2 Setup

### 1. Install Node.js 20 LTS

```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x
```

### 2. Install PM2 Globally

```bash
sudo npm install -g pm2

# Verify
pm2 --version
```

### 3. Configure PM2 Startup

This ensures PM2 restarts your app on server reboot:

```bash
# Generate startup script
pm2 startup systemd

# PM2 will output a command — copy and run it, e.g.:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy
```

---

## Application Deployment

### 1. Create Application Directory

```bash
sudo mkdir -p /opt/yetopay
sudo chown deploy:deploy /opt/yetopay
cd /opt/yetopay
```

### 2. Clone Repository

```bash
# Using HTTPS
git clone https://github.com/YOUR_USERNAME/yetopayeft.git .

# Or using SSH (if you've set up deploy keys)
git clone git@github.com:YOUR_USERNAME/yetopayeft.git .
```

**Setting up Deploy Keys (recommended for CI/CD):**

```bash
# On the server, generate a deploy key
ssh-keygen -t ed25519 -C "deploy@yetopay" -f ~/.ssh/deploy_key -N ""

# Copy the public key
cat ~/.ssh/deploy_key.pub

# Add this key in GitHub:
# Repository → Settings → Deploy Keys → Add deploy key
# Check "Allow write access" if CI/CD needs to push
```

### 3. Configure Environment Variables

```bash
# Create production environment file
nano /opt/yetopay/.env.production
```

Add all required environment variables:

```bash
# ============================================
# Application
# ============================================
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yetopay.co.za

# ============================================
# Database (Neon PostgreSQL)
# ============================================
DATABASE_URL=postgresql://user:password@ep-xxxxx.region.aws.neon.tech/yetopay?sslmode=require

# ============================================
# Authentication (Better Auth)
# ============================================
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=https://yetopay.co.za

# ============================================
# API Security
# ============================================
CREDENTIAL_ENCRYPTION_KEY=your-32-byte-hex-key

# ============================================
# Email (if applicable)
# ============================================
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=noreply@yetopay.co.za
# SMTP_PASS=your-smtp-password

# ============================================
# External Services
# ============================================
# Add any third-party API keys here

# ============================================
# Trusted Origins (Better Auth CORS)
# ============================================
# These are configured in auth.ts, but if you
# use env vars for trusted origins, set them here
```

**Secure the file:**

```bash
chmod 600 /opt/yetopay/.env.production
```

> **Security Note:** Never commit `.env.production` to git. For enhanced security, use AWS Secrets Manager or Parameter Store:
> ```bash
> sudo apt install -y awscli
> aws configure
> aws secretsmanager get-secret-value \
>   --secret-id yetopay-prod \
>   --query SecretString \
>   --output text > /opt/yetopay/.env.production
> ```

### 4. Install Dependencies & Build

```bash
cd /opt/yetopay

# Install production dependencies
npm ci

# Build the Next.js application
npm run build
```

> **Note:** The build step compiles your Next.js app into the `.next/` directory. This can take 1-3 minutes depending on your instance size.

### 5. Test the Application

```bash
# Quick test — start the app and verify it works
cd /opt/yetopay
NODE_ENV=production npm start

# In another terminal (or use curl):
curl http://localhost:3000

# Stop the test (Ctrl+C)
```

---

## Nginx Reverse Proxy

### 1. Install Nginx

```bash
sudo apt install -y nginx

# Enable and start
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/yetopay
```

Add the following configuration:

```nginx
# Upstream — the Next.js app running on PM2
upstream yetopay_app {
    server 127.0.0.1:3000;
    keepalive 64;
}

# HTTP → HTTPS redirect (will be used after SSL is set up)
server {
    listen 80;
    server_name yetopay.co.za www.yetopay.co.za;

    # For Let's Encrypt challenge (before SSL)
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server (enable after SSL certificate is obtained)
server {
    listen 443 ssl http2;
    server_name yetopay.co.za www.yetopay.co.za;

    # SSL certificates (uncomment after running certbot)
    # ssl_certificate /etc/letsencrypt/live/yetopay.co.za/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/yetopay.co.za/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Request size limit (for file uploads if needed)
    client_max_body_size 10M;

    # Timeouts for long-running requests
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 86400s;  # 24 hours — required for SSE connections

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               image/svg+xml;

    # Static assets — serve directly with long cache
    location /_next/static/ {
        proxy_pass http://yetopay_app;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Next.js image optimization
    location /_next/image {
        proxy_pass http://yetopay_app;
    }

    # Public static files
    location /favicon.ico {
        proxy_pass http://yetopay_app;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

    # SSE endpoint — disable buffering for real-time streaming
    location /api/eft/transactions/ {
        proxy_pass http://yetopay_app;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Critical for SSE
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
        proxy_read_timeout 86400s;  # Keep SSE connections alive for 24h
    }

    # All other requests — proxy to Next.js
    location / {
        proxy_pass http://yetopay_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Enable the Site

```bash
# Create symlink to sites-enabled
sudo ln -s /etc/nginx/sites-available/yetopay /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# If test passes, reload
sudo systemctl reload nginx
```

> **Note:** The HTTPS server block won't work until you obtain SSL certificates. For initial setup, temporarily change the HTTP block to proxy directly (without redirect) to test the app works through Nginx.

### 4. Test Through Nginx (Before SSL)

Temporarily modify the HTTP block for testing:

```bash
# Edit Nginx config
sudo nano /etc/nginx/sites-available/yetopay
```

Add to the HTTP server block (temporarily):

```nginx
server {
    listen 80;
    server_name yetopay.co.za www.yetopay.co.za;

    location / {
        proxy_pass http://yetopay_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
curl http://YOUR_SERVER_IP
```

---

## SSL/TLS Configuration

### Option 1: Let's Encrypt with Certbot (Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate (Nginx plugin handles everything)
sudo certbot --nginx -d yetopay.co.za -d www.yetopay.co.za

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (recommended)
```

Certbot will automatically:
- Obtain the SSL certificate
- Update your Nginx configuration
- Set up auto-renewal

**Verify auto-renewal:**

```bash
# Test renewal
sudo certbot renew --dry-run

# Check timer
sudo systemctl status certbot.timer
```

### Option 2: AWS Certificate Manager + ALB

For production with auto-scaling:

1. Request a certificate in **AWS Certificate Manager** (free for ALB)
2. Create an **Application Load Balancer** in your VPC
3. Configure target group pointing to EC2 instance port 3000
4. Attach SSL certificate to ALB HTTPS listener (port 443)
5. Update security group to allow traffic from ALB only
6. Point DNS to ALB DNS name (CNAME record)

### Verify SSL

```bash
# Check certificate
curl -vI https://yetopay.co.za 2>&1 | grep -A 5 "SSL certificate"

# Or use an online tool:
# https://www.ssllabs.com/ssltest/analyze.html?d=yetopay.co.za
```

---

## PM2 Production Configuration

### 1. Create PM2 Ecosystem File

```bash
nano /opt/yetopay/ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'yetopay',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/opt/yetopay',
      instances: 'max',           // Use all CPU cores (cluster mode)
      exec_mode: 'cluster',       // Enable cluster mode for zero-downtime reloads
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Logging
      log_file: '/opt/yetopay/logs/combined.log',
      out_file: '/opt/yetopay/logs/out.log',
      error_file: '/opt/yetopay/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Restart policy
      max_memory_restart: '1G',   // Restart if memory exceeds 1GB
      restart_delay: 5000,        // Wait 5s before restarting
      max_restarts: 10,           // Max restarts before stopping
      min_uptime: '10s',          // Consider started after 10s
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      // Watch (disabled in production)
      watch: false,
    },
  ],
};
```

### 2. Create Logs Directory

```bash
mkdir -p /opt/yetopay/logs
```

### 3. Start Application with PM2

```bash
cd /opt/yetopay

# Start with ecosystem file
pm2 start ecosystem.config.js --env production

# Save PM2 process list (so it restarts on reboot)
pm2 save

# Verify
pm2 status
pm2 logs yetopay --lines 20
```

### 4. Key PM2 Commands

```bash
# Status
pm2 status                    # Show all processes
pm2 show yetopay              # Detailed info for yetopay

# Logs
pm2 logs yetopay              # Stream logs
pm2 logs yetopay --lines 100  # Last 100 lines
pm2 flush                     # Clear all logs

# Restart / Reload
pm2 reload yetopay            # Zero-downtime reload (graceful)
pm2 restart yetopay           # Hard restart (brief downtime)

# Stop / Delete
pm2 stop yetopay              # Stop process
pm2 delete yetopay            # Remove from PM2

# Monitoring
pm2 monit                     # Real-time CPU/memory monitor
```

---

## GitHub Actions CI/CD

### 1. Add GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and Variables** → **Actions** → **New repository secret**

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `EC2_HOST` | Your server IP or domain (e.g., `12.34.56.78`) |
| `EC2_USER` | `deploy` (or `ubuntu`) |
| `EC2_SSH_KEY` | Contents of your private key (`cat ~/.ssh/deploy_key`) |
| `EC2_PORT` | `22` (or custom SSH port) |

### 2. Create Workflow File

```bash
# In your local project
mkdir -p .github/workflows
```

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to EC2

on:
  push:
    branches:
      - main
  workflow_dispatch:  # Allow manual trigger

jobs:
  deploy:
    name: Build & Deploy
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Next.js
        run: npm run build
        env:
          NODE_ENV: production

      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          port: ${{ secrets.EC2_PORT }}
          script_stop: true
          script: |
            cd /opt/yetopay

            # Pull latest code
            git fetch origin main
            git reset --hard origin/main

            # Install dependencies
            npm ci --production=false

            # Build application
            npm run build

            # Reload PM2 (zero-downtime)
            pm2 reload yetopay --update-env

            # Verify deployment
            sleep 5
            pm2 status yetopay

            echo "✅ Deployment complete!"
```

### 3. Alternative: Build Locally, Deploy Artifacts

For faster deploys (skip building on the server):

```yaml
name: Deploy to EC2 (Artifact)

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    name: Build & Deploy Artifacts
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Package artifacts
        run: |
          tar -czf deploy.tar.gz \
            .next/ \
            public/ \
            package.json \
            package-lock.json \
            next.config.ts \
            ecosystem.config.js \
            drizzle.config.ts \
            tsconfig.json \
            lib/ \
            components/ \
            app/

      - name: Copy to server
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          port: ${{ secrets.EC2_PORT }}
          source: 'deploy.tar.gz'
          target: '/tmp'

      - name: Deploy on server
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          port: ${{ secrets.EC2_PORT }}
          script_stop: true
          script: |
            cd /opt/yetopay

            # Extract artifacts
            tar -xzf /tmp/deploy.tar.gz -C /opt/yetopay

            # Install production dependencies only
            npm ci --omit=dev

            # Reload PM2
            pm2 reload yetopay --update-env

            # Cleanup
            rm /tmp/deploy.tar.gz

            sleep 5
            pm2 status yetopay
            echo "✅ Deployment complete!"
```

### 4. Manual Deploy Script (Without CI/CD)

For quick deploys without GitHub Actions:

```bash
nano /opt/yetopay/deploy.sh
```

```bash
#!/bin/bash
set -e

APP_DIR="/opt/yetopay"
cd $APP_DIR

echo "📥 Pulling latest code..."
git pull origin main

echo "📦 Installing dependencies..."
npm ci

echo "🔨 Building application..."
npm run build

echo "🔄 Reloading PM2..."
pm2 reload yetopay --update-env

echo "⏳ Waiting for startup..."
sleep 5

echo "✅ Deploy complete!"
pm2 status yetopay
```

```bash
chmod +x /opt/yetopay/deploy.sh

# Run deploy
/opt/yetopay/deploy.sh
```

---

## DNS & Cloudflare Setup

### Option 1: Cloudflare (Recommended)

Cloudflare provides free DNS, CDN, DDoS protection, and additional SSL.

1. **Add your domain to Cloudflare:**
   - Sign up at [cloudflare.com](https://cloudflare.com)
   - Add your domain
   - Update nameservers at your registrar to Cloudflare's

2. **Configure DNS records:**

   | Type | Name | Content | Proxy |
   |------|------|---------|-------|
   | A | `@` | YOUR_SERVER_IP | Proxied (orange cloud) |
   | A | `www` | YOUR_SERVER_IP | Proxied (orange cloud) |

3. **SSL/TLS settings in Cloudflare:**
   - Go to **SSL/TLS** → Set mode to **Full (strict)**
   - This means: Client → Cloudflare (HTTPS) → Your Server (HTTPS with valid cert)

4. **Recommended Cloudflare settings:**
   - **Speed → Optimization:** Enable Auto Minify (JS, CSS, HTML)
   - **Caching → Configuration:** Standard caching level
   - **Security → Settings:** Security level = Medium
   - **Security → Bots:** Enable Bot Fight Mode (free)
   - **Network:** Enable HTTP/2 and HTTP/3

### Option 2: AWS Route 53

```bash
# Create hosted zone
aws route53 create-hosted-zone --name yetopay.co.za --caller-reference $(date +%s)

# Add A record pointing to Elastic IP
# Use the AWS Console: Route 53 → Hosted Zones → Create Record
# Type: A, Value: YOUR_ELASTIC_IP
```

### Option 3: Direct DNS (Any Registrar)

At your domain registrar, set:
- **A Record:** `@` → `YOUR_SERVER_IP`
- **A Record:** `www` → `YOUR_SERVER_IP`

---

## Monitoring & Maintenance

### 1. Application Monitoring with PM2

```bash
# Real-time monitoring dashboard
pm2 monit

# Process info
pm2 show yetopay

# View logs
pm2 logs yetopay --lines 200

# View error logs only
pm2 logs yetopay --err --lines 100
```

### 2. System Monitoring

```bash
# Live system resources
htop

# Disk usage
df -h

# Memory usage
free -m

# Network connections
ss -tuln

# Check Nginx is running
sudo systemctl status nginx

# Check PM2 processes
pm2 status
```

### 3. Log Rotation

Configure log rotation to prevent disk from filling up:

```bash
sudo nano /etc/logrotate.d/yetopay
```

```
/opt/yetopay/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 deploy deploy
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

Also configure Nginx log rotation:

```bash
sudo nano /etc/logrotate.d/nginx
```

```
/var/log/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 $(cat /var/run/nginx.pid)
    endscript
}
```

### 4. Health Check Script

```bash
nano /opt/yetopay/health-check.sh
```

```bash
#!/bin/bash

APP_URL="http://localhost:3000"
LOG_FILE="/opt/yetopay/logs/health-check.log"

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $APP_URL --max-time 10)

if [ "$RESPONSE" = "200" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') OK - HTTP $RESPONSE" >> $LOG_FILE
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') FAIL - HTTP $RESPONSE" >> $LOG_FILE

    # Restart PM2 if health check fails
    echo "$(date '+%Y-%m-%d %H:%M:%S') Restarting PM2..." >> $LOG_FILE
    cd /opt/yetopay && pm2 reload yetopay --update-env

    # Optional: Send alert (uncomment and configure)
    # curl -X POST "https://hooks.slack.com/services/YOUR/WEBHOOK/URL" \
    #   -H 'Content-type: application/json' \
    #   -d "{\"text\":\"⚠️ YetoPay health check failed (HTTP $RESPONSE). Auto-restarting...\"}"
fi
```

```bash
chmod +x /opt/yetopay/health-check.sh

# Add to crontab — run every 5 minutes
crontab -e
# Add this line:
# */5 * * * * /opt/yetopay/health-check.sh
```

### 5. UptimeRobot (Free External Monitoring)

1. Sign up at [uptimerobot.com](https://uptimerobot.com) (free tier: 50 monitors)
2. Add monitor:
   - **Monitor Type:** HTTPS
   - **URL:** `https://yetopay.co.za`
   - **Monitoring Interval:** 5 minutes
3. Set up alerts (email, Slack, Telegram)

### 6. Automated Backups

```bash
nano /opt/yetopay/backup.sh
```

```bash
#!/bin/bash
set -e

BACKUP_DIR="/home/deploy/backups"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

# Backup environment config (NOT the code — that's in git)
tar -czf $BACKUP_DIR/yetopay-config-$DATE.tar.gz \
    /opt/yetopay/.env.production \
    /opt/yetopay/ecosystem.config.js \
    /etc/nginx/sites-available/yetopay

# Keep only last 30 days of backups
find $BACKUP_DIR -name "yetopay-config-*.tar.gz" -mtime +30 -delete

echo "$(date): Backup completed → $BACKUP_DIR/yetopay-config-$DATE.tar.gz"
```

```bash
chmod +x /opt/yetopay/backup.sh

# Add to crontab — run daily at 2 AM
crontab -e
# Add:
# 0 2 * * * /opt/yetopay/backup.sh >> /opt/yetopay/logs/backup.log 2>&1
```

### 7. Automatic System Updates

```bash
# Install unattended-upgrades
sudo apt install -y unattended-upgrades

# Enable automatic security updates
sudo dpkg-reconfigure -plow unattended-upgrades

# Verify
cat /etc/apt/apt.conf.d/20auto-upgrades
# Should show:
# APT::Periodic::Update-Package-Lists "1";
# APT::Periodic::Unattended-Upgrade "1";
```

---

## Security Hardening

### 1. SSH Hardening

```bash
sudo nano /etc/ssh/sshd_config
```

Recommended settings:

```
# Disable root login
PermitRootLogin no

# Disable password authentication (use SSH keys only)
PasswordAuthentication no

# Change default port (optional but recommended)
# Port 2222

# Limit SSH to specific users
AllowUsers deploy

# Timeout idle sessions
ClientAliveInterval 300
ClientAliveCountMax 2
```

```bash
# Restart SSH
sudo systemctl restart sshd
```

> **Warning:** Before changing SSH settings, make sure you can still connect! Test in a new terminal window before closing your current session.

### 2. Fail2Ban (Brute Force Protection)

```bash
# Install
sudo apt install -y fail2ban

# Create config
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
```

```bash
# Start Fail2Ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Check status
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

### 3. Nginx Rate Limiting

Add to `/etc/nginx/nginx.conf` inside the `http` block:

```nginx
http {
    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # ... existing config
}
```

Then in your site config, apply rate limits:

```nginx
# Rate limit API endpoints
location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://yetopay_app;
    # ... other proxy settings
}

# Stricter rate limit for auth endpoints
location /api/auth/ {
    limit_req zone=login burst=5 nodelay;
    proxy_pass http://yetopay_app;
    # ... other proxy settings
}
```

### 4. Security Checklist

- [ ] SSH key-only authentication (no passwords)
- [ ] Root login disabled
- [ ] UFW firewall enabled (only ports 22, 80, 443)
- [ ] Fail2Ban installed and running
- [ ] SSL/TLS certificate installed with auto-renewal
- [ ] Nginx rate limiting configured
- [ ] Environment variables in `.env.production` (chmod 600)
- [ ] Automatic security updates enabled
- [ ] Regular backups configured
- [ ] Cloudflare DDoS protection (if using Cloudflare)
- [ ] PM2 process running as non-root user
- [ ] Application logs monitored
- [ ] SSH port changed from default (optional)

---

## Troubleshooting

### Issue 1: Application Won't Start

```bash
# Check PM2 logs
pm2 logs yetopay --lines 50

# Check if port 3000 is already in use
sudo lsof -i :3000

# Try starting manually
cd /opt/yetopay
NODE_ENV=production node .next/standalone/server.js

# Check .env.production is loaded
pm2 show yetopay | grep -A 10 "env"
```

### Issue 2: Nginx Returns 502 Bad Gateway

```bash
# Check if the app is running
pm2 status

# Check Nginx error log
sudo tail -20 /var/log/nginx/error.log

# Verify Nginx config
sudo nginx -t

# Check if PM2 is listening on port 3000
curl http://localhost:3000

# Restart everything
pm2 reload yetopay
sudo systemctl reload nginx
```

### Issue 3: SSE Connections Dropping

```bash
# Ensure proxy_buffering is off in Nginx
sudo grep -n "proxy_buffering" /etc/nginx/sites-available/yetopay

# Check proxy_read_timeout is set high enough
sudo grep -n "proxy_read_timeout" /etc/nginx/sites-available/yetopay
# Should be 86400s (24 hours) for SSE endpoints

# If using Cloudflare, note it has a 100s timeout on free plan
# For SSE through Cloudflare, you may need to:
# 1. Disable proxying for the SSE subdomain (DNS only, grey cloud)
# 2. Or implement SSE reconnection logic in the client
```

### Issue 4: SSL Certificate Renewal Failed

```bash
# Check Certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Test renewal
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal

# If port 80 is blocked by Cloudflare, use DNS challenge
sudo certbot certonly --manual --preferred-challenges dns -d yetopay.co.za

# Restart Nginx after renewal
sudo systemctl reload nginx
```

### Issue 5: High Memory Usage

```bash
# Check PM2 memory usage
pm2 monit

# Check system memory
free -m

# If Node.js is using too much memory, set a limit
# In ecosystem.config.js:
# max_memory_restart: '500M'

# Restart to apply
pm2 reload yetopay
```

### Issue 6: Database Connection Issues (Neon)

```bash
# Test database connectivity from the server
curl -s https://YOUR_NEON_HOST:5432 || echo "Cannot reach Neon"

# Check if DATABASE_URL is correct
grep DATABASE_URL /opt/yetopay/.env.production

# Neon cold start: first query after idle may take 1-3 seconds
# Consider Neon's "Always On" compute for production

# Check application error logs
pm2 logs yetopay --err --lines 50
```

### Issue 7: Out of Disk Space

```bash
# Check disk usage
df -h

# Find large files
sudo du -sh /opt/yetopay/* | sort -rh | head -10

# Clean PM2 logs
pm2 flush

# Clean old Node modules cache
npm cache clean --force

# Clean system journal
sudo journalctl --vacuum-time=7d

# Clean old build artifacts
rm -rf /opt/yetopay/.next/cache/*
```

### Issue 8: Permission Denied Errors

```bash
# Fix ownership
sudo chown -R deploy:deploy /opt/yetopay

# Fix PM2 permissions
pm2 kill
pm2 start ecosystem.config.js --env production
pm2 save
```

---

## Cost Optimization

### Instance Right-Sizing

Monitor for 2 weeks, then adjust:

```bash
# Check CPU and memory usage
htop

# Average CPU over time
mpstat 1 10

# Memory usage
free -m
```

**Recommendations:**

| Traffic Level | Instance Type | Monthly Cost |
|---------------|--------------|-------------|
| Low (<500 req/day) | t3.micro (1 vCPU, 1GB) | ~$8 |
| Medium (<5,000 req/day) | t3.small (2 vCPU, 2GB) | ~$15 |
| Production (<50,000 req/day) | t3.medium (2 vCPU, 4GB) | ~$30 |
| High Traffic | t3.large (2 vCPU, 8GB) | ~$60 |

### VPS Alternatives (Cheaper)

| Provider | Plan | Specs | Monthly Cost |
|----------|------|-------|-------------|
| Hetzner Cloud | CX21 | 2 vCPU, 4GB RAM, 40GB | €5.39 (~$6) |
| Hetzner Cloud | CX31 | 2 vCPU, 8GB RAM, 80GB | €8.69 (~$10) |
| DigitalOcean | Basic | 2 vCPU, 4GB RAM, 80GB | $24 |
| Vultr | Cloud Compute | 2 vCPU, 4GB RAM, 80GB | $24 |
| Contabo | VPS S | 4 vCPU, 8GB RAM, 200GB | €5.99 (~$7) |

> **Note:** Hetzner and Contabo don't have South African regions. Use Cloudflare CDN in front for improved global latency.

### AWS Reserved Instances

For long-term production (1-year commitment):
- **t3.medium On-Demand:** ~$30/month
- **t3.medium Reserved (1yr, no upfront):** ~$19/month (37% savings)
- **t3.medium Reserved (1yr, all upfront):** ~$17/month (43% savings)

### AWS Savings Tips

- Use **Spot Instances** for staging/development (up to 90% savings, but can be interrupted)
- Use **gp3 EBS volumes** instead of gp2 (20% cheaper, better performance)
- Set up **billing alerts** in AWS Budgets

---

## Quick Reference

### Common Commands

```bash
# === PM2 ===
pm2 status                          # Check status
pm2 logs yetopay                    # View logs
pm2 reload yetopay                  # Zero-downtime reload
pm2 restart yetopay                 # Hard restart
pm2 monit                           # Real-time monitoring

# === Nginx ===
sudo nginx -t                       # Test config
sudo systemctl reload nginx         # Reload config
sudo systemctl restart nginx        # Restart
sudo tail -f /var/log/nginx/error.log  # Error logs

# === SSL ===
sudo certbot renew --dry-run        # Test renewal
sudo certbot renew                  # Renew certificates

# === System ===
htop                                # System monitor
df -h                               # Disk usage
free -m                             # Memory usage
sudo ufw status                     # Firewall status

# === Deploy ===
/opt/yetopay/deploy.sh              # Manual deploy
pm2 reload yetopay --update-env     # Reload with new env vars
```

### File Locations

| File | Path |
|------|------|
| Application | `/opt/yetopay/` |
| Environment vars | `/opt/yetopay/.env.production` |
| PM2 config | `/opt/yetopay/ecosystem.config.js` |
| PM2 logs | `/opt/yetopay/logs/` |
| Nginx config | `/etc/nginx/sites-available/yetopay` |
| Nginx logs | `/var/log/nginx/` |
| SSL certificates | `/etc/letsencrypt/live/yetopay.co.za/` |
| Deploy script | `/opt/yetopay/deploy.sh` |
| Health check | `/opt/yetopay/health-check.sh` |
| Backup script | `/opt/yetopay/backup.sh` |

---

## Post-Deployment Checklist

- [ ] Server provisioned (EC2 or VPS) with Ubuntu 22.04+
- [ ] System updated and timezone set
- [ ] UFW firewall configured (ports 22, 80, 443 only)
- [ ] Node.js 20 and PM2 installed
- [ ] Repository cloned to `/opt/yetopay`
- [ ] `.env.production` configured with all secrets
- [ ] `npm ci && npm run build` completed successfully
- [ ] Nginx installed and configured as reverse proxy
- [ ] SSL certificate obtained via Certbot
- [ ] PM2 started with ecosystem config (cluster mode)
- [ ] PM2 startup configured (persists on reboot)
- [ ] DNS pointed to server IP (Cloudflare or direct)
- [ ] `NEXT_PUBLIC_APP_URL` updated to production domain
- [ ] Better Auth `trustedOrigins` includes production domain
- [ ] GitHub Actions CI/CD pipeline set up and tested
- [ ] SSH hardened (key-only auth, no root login)
- [ ] Fail2Ban installed and running
- [ ] Health check cron job configured
- [ ] Log rotation configured
- [ ] Backup script running on cron
- [ ] External monitoring set up (UptimeRobot or similar)
- [ ] Automatic security updates enabled
- [ ] All API endpoints tested (auth, payments, webhooks)
- [ ] SSE payment status updates verified working
- [ ] Webhook delivery tested end-to-end
- [ ] Payment flow smoke tested with real transaction
