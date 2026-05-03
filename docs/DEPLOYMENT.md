# EA SaaS Platform — Deployment Guide

Complete deployment documentation for local development, staging, and production environments.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Docker Development](#docker-development)
4. [Staging Deployment](#staging-deployment)
5. [Production Deployment](#production-deployment)
6. [Database Management](#database-management)
7. [Monitoring & Observability](#monitoring--observability)
8. [Backup & Recovery](#backup--recovery)
9. [SSL/TLS Setup](#ssltls-setup)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 18.x | Runtime |
| npm | ≥ 9.x | Package manager |
| Docker | ≥ 24.x | Container runtime |
| Docker Compose | ≥ 2.20 | Multi-container orchestration |
| Git | ≥ 2.x | Version control |

### Optional (Production)

| Tool | Purpose |
|------|---------|
| Nginx | Reverse proxy / load balancer |
| Certbot | SSL certificate management |
| MySQL Client | Direct database access |

---

## Local Development

### Quick Start

```bash
# 1. Clone and enter the project
git clone <repo-url> && cd ea-saas-platform

# 2. Run the setup script (installs deps, starts Docker DBs, migrates, seeds)
npm run setup
# Or manually:
bash scripts/setup.sh

# 3. Start the dev server
npm run dev
```

### Manual Setup

```bash
# 1. Install dependencies
npm ci

# 2. Create environment file
cp .env.example .env.local
# Edit .env.local with your values

# 3. Start database services (MySQL + Redis)
npm run docker:up

# 4. Generate Prisma client
npm run db:generate

# 5. Run migrations
npm run db:migrate

# 6. Seed the database
npm run db:seed

# 7. Start development server
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `mysql://ea_user:ea_password123@localhost:3306/ea_saas` | MySQL connection string |
| `REDIS_URL` | Yes | `redis://:redis123@localhost:6379` | Redis connection string |
| `NEXTAUTH_SECRET` | Yes | — | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` | App URL for auth |
| `STRIPE_SECRET_KEY` | Prod | — | Stripe secret key |
| `STRIPE_PUBLIC_KEY` | Prod | — | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Prod | — | Stripe webhook signing secret |
| `RESEND_API_KEY` | Prod | — | Resend email API key |

---

## Docker Development

### Start All Services

```bash
# Build and start all containers
npm run docker:build
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down
```

### Individual Service Management

```bash
# Start only databases (for local Node development)
docker compose -f docker/docker-compose.yml up -d mysql redis

# Restart a specific service
docker compose -f docker/docker-compose.yml restart web

# View service status
docker compose -f docker/docker-compose.yml ps

# View logs for a service
docker compose -f docker/docker-compose.yml logs -f web
```

### Service Ports

| Service | Port | URL |
|---------|------|-----|
| Next.js App | 3000 (internal) | http://localhost (via Nginx) |
| Nginx | 80, 443 | http://localhost |
| MySQL | 3306 | localhost:3306 |
| Redis | 6379 | localhost:6379 |
| Adminer | 8080 | http://localhost:8080 |
| Prometheus | 9090 | http://localhost:9090 |
| Grafana | 3001 | http://localhost:3001 |

### Accessing Adminer

1. Navigate to http://localhost:8080
2. Login credentials:
   - **System:** MySQL
   - **Server:** mysql (Docker internal)
   - **Username:** ea_user
   - **Password:** (from `MYSQL_PASSWORD` env var)

---

## Staging Deployment

### 1. Server Setup

```bash
# On the staging server
ssh staging-server

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Deploy

```bash
# Clone the repository
git clone <repo-url> /opt/ea-saas
cd /opt/ea-saas

# Create environment file from template
cp .env.staging .env.local
# ⚠️ EDIT .env.local — update all secrets!

# Run deployment
npm run deploy -- staging
# Or directly:
bash scripts/deploy.sh staging
```

### 3. Configure SSL (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot

# Obtain certificate
sudo certbot certonly --standalone -d staging.ea-saas.com

# Copy certs to Docker volume location
sudo cp /etc/letsencrypt/live/staging.ea-saas.com/fullchain.pem ./docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/staging.ea-saas.com/privkey.pem ./docker/nginx/ssl/key.pem

# Restart Nginx
docker compose -f docker/docker-compose.yml restart nginx
```

### 4. Set Up Auto-Renewal

```bash
# Add to crontab
echo "0 0 * * 0 certbot renew --quiet && cp /etc/letsencrypt/live/staging.ea-saas.com/*.pem /opt/ea-saas/docker/nginx/ssl/ && docker compose -f /opt/ea-saas/docker/docker-compose.yml restart nginx" | crontab -
```

---

## Production Deployment

### ⚠️ Pre-Flight Checklist

- [ ] All secrets in `.env.local` are set (NEVER use defaults)
- [ ] `NEXTAUTH_SECRET` is a strong 32+ character random string
- [ ] `MYSQL_PASSWORD` and `REDIS_PASSWORD` are strong and unique
- [ ] Stripe keys are **live** mode (not test)
- [ ] SSL certificates are configured
- [ ] `ADMIN_IP_ALLOWLIST` is set to specific IPs
- [ ] Rate limits are appropriate for production traffic
- [ ] Monitoring alerts are configured

### 1. Server Provisioning

Recommended specs:
- **CPU:** 2+ cores
- **RAM:** 4GB minimum, 8GB recommended
- **Disk:** 40GB SSD minimum
- **OS:** Ubuntu 22.04 LTS or similar

### 2. Deploy

```bash
# Clone and configure
git clone <repo-url> /opt/ea-saas
cd /opt/ea-saas

cp .env.production .env.local
# ⚠️ EDIT .env.local — ALL secrets must be production-grade!

# Deploy with backup
bash scripts/deploy.sh production

# Deploy without backup (for initial setup)
bash scripts/deploy.sh production --skip-backup
```

### 3. Systemd Service (Optional)

Create `/etc/systemd/system/ea-saas.service`:

```ini
[Unit]
Description=EA SaaS Platform
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/ea-saas
ExecStart=/usr/bin/docker compose -f docker/docker-compose.yml --env-file docker/.env.docker up -d
ExecStop=/usr/bin/docker compose -f docker/docker-compose.yml --env-file docker/.env.docker down

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable ea-saas
sudo systemctl start ea-saas
```

### 4. Database Backups (Cron)

```bash
# Add to crontab — daily at 2 AM
echo "0 2 * * * /opt/ea-saas/scripts/backup.sh daily" | crontab -
```

---

## Database Management

### Migrations

```bash
# Development: Create a new migration
npm run db:migrate

# Staging/Production: Apply pending migrations (safe, no data loss)
npm run db:migrate:deploy

# Reset database (⚠️ DESTROYS ALL DATA)
npm run db:reset
```

### Prisma Studio

```bash
# Visual database browser
npm run db:studio
# Opens at http://localhost:5555
```

### Seeding

```bash
# Seed the database with initial/sample data
npm run db:seed
```

---

## Monitoring & Observability

### Prometheus

- **URL:** http://localhost:9090
- **Targets:** Next.js app, MySQL exporter, Redis exporter, Node exporter, Nginx exporter
- **Retention:** 30 days
- **Config:** `docker/prometheus/prometheus.yml`

### Grafana

- **URL:** http://localhost:3001
- **Default login:** admin / admin
- **Dashboard:** Pre-configured EA SaaS Platform dashboard
- **Data source:** Auto-connected to Prometheus

### Health Check Endpoint

```bash
curl http://localhost:3000/api/health
# Returns: { "status": "ok", "timestamp": "..." }
```

### Health Check Script

```bash
# Check all services
bash scripts/health-check.sh

# Check staging environment
bash scripts/health-check.sh staging

# Check production environment
bash scripts/health-check.sh production
```

---

## Backup & Recovery

### Create Backup

```bash
# Manual backup with auto-generated tag
bash scripts/backup.sh

# Manual backup with custom tag
bash scripts/backup.sh pre-release-v1.2.0

# Or via npm
npm run backup
```

### Restore from Backup

```bash
# List backups
ls -la backups/

# Restore (gunzip + mysql)
gunzip -c backups/ea_saas_20240101_120000.sql.gz | \
  docker compose -f docker/docker-compose.yml exec -T mysql \
  mysql -uea_user -pea_password123 ea_saas
```

### Backup Retention

- Backups older than 30 days are automatically cleaned up
- Backups are stored in `./backups/` directory
- For production, configure off-site backup (S3, GCS, etc.)

---

## SSL/TLS Setup

### Generate Self-Signed Certificates (Development)

```bash
mkdir -p docker/nginx/ssl

openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout docker/nginx/ssl/key.pem \
  -out docker/nginx/ssl/cert.pem \
  -subj "/CN=localhost"
```

### Let's Encrypt (Production)

```bash
# Obtain certificate
sudo certbot certonly --standalone -d app.ea-saas.com

# Copy to Docker volume
sudo cp /etc/letsencrypt/live/app.ea-saas.com/fullchain.pem docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/app.ea-saas.com/privkey.pem docker/nginx/ssl/key.pem

# Restart Nginx
docker compose -f docker/docker-compose.yml restart nginx
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check container logs
docker compose -f docker/docker-compose.yml logs <service-name>

# Check container status
docker compose -f docker/docker-compose.yml ps

# Restart a specific service
docker compose -f docker/docker-compose.yml restart <service-name>

# Full rebuild
docker compose -f docker/docker-compose.yml down
docker compose -f docker/docker-compose.yml build --no-cache
docker compose -f docker/docker-compose.yml up -d
```

### MySQL Connection Issues

```bash
# Test MySQL connectivity
docker compose -f docker/docker-compose.yml exec mysql \
  mysql -uea_user -pea_password123 -e "SELECT 1" ea_saas

# Check MySQL health
docker compose -f docker/docker-compose.yml exec mysql \
  mysqladmin -uea_user -pea_password123 -h localhost ping
```

### Redis Connection Issues

```bash
# Test Redis connectivity
docker compose -f docker/docker-compose.yml exec redis \
  redis-cli -a redis123 ping

# Check Redis info
docker compose -f docker/docker-compose.yml exec redis \
  redis-cli -a redis123 info
```

### Application Errors

```bash
# Check application logs
docker compose -f docker/docker-compose.yml logs -f web

# Check health endpoint
curl -v http://localhost:3000/api/health

# Run health check script
bash scripts/health-check.sh
```

### Database Migration Issues

```bash
# Check migration status
npx prisma migrate status

# Mark migration as resolved (if manually applied)
npx prisma migrate resolve --applied <migration-name>

# Force reset (⚠️ data loss)
npx prisma migrate reset --force
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Check MySQL slow queries
docker compose -f docker/docker-compose.yml exec mysql \
  mysql -uea_user -pea_password123 -e "SHOW PROCESSLIST" ea_saas

# Check Redis memory
docker compose -f docker/docker-compose.yml exec redis \
  redis-cli -a redis123 info memory
```

---

## Architecture Overview

```
                    ┌─────────┐
                    │  Client  │
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │  Nginx   │ :80/:443
                    │ (SSL/TLS)│
                    └────┬────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
         ┌────▼───┐ ┌───▼────┐ ┌──▼───┐
         │  Next.js │ │ Worker │ │Static│
         │  :3000   │ │        │ │Files │
         └────┬─────┘ └───┬────┘ └──────┘
              │           │
         ┌────▼──────┬────▼────┐
         │           │         │
    ┌────▼────┐ ┌────▼────┐ ┌─▼──────┐
    │  MySQL  │ │  Redis  │ │ Adminer │
    │  :3306  │ │  :6379  │ │ :8080   │
    └─────────┘ └─────────┘ └─────────┘
         │           │
    ┌────▼────┐ ┌───▼───────┐
    │Prometheus│ │  Grafana   │
    │  :9090  │ │  :3001     │
    └─────────┘ └────────────┘
```

---

## Environment Files Summary

| File | Purpose | Git |
|------|---------|-----|
| `.env.example` | Template with defaults | ✅ Committed |
| `.env.local` | Local development secrets | ❌ .gitignore |
| `docker/.env.docker` | Docker Compose defaults | ✅ Committed (no secrets) |
| `.env.staging` | Staging environment template | ✅ Committed (secrets are placeholders) |
| `.env.production` | Production environment template | ✅ Committed (secrets are placeholders) |

⚠️ **NEVER commit real secrets.** Always override with environment variables or a local `.env.local` file.

---

## Quick Reference

```bash
# Development
npm run dev                    # Start dev server
npm run docker:up              # Start all Docker services
npm run docker:down            # Stop all Docker services
npm run docker:build           # Rebuild Docker images

# Database
npm run db:migrate             # Create & apply migration
npm run db:migrate:deploy      # Apply pending migrations (safe)
npm run db:seed                # Seed database
npm run db:studio              # Open Prisma Studio
npm run db:reset               # ⚠️ Reset database

# Testing
npm run test                   # Run unit tests
npm run test:watch             # Watch mode
npm run test:coverage          # With coverage
npm run test:e2e               # End-to-end tests
npm run lint                   # Lint code
npm run type-check             # TypeScript type checking

# Operations
npm run setup                  # First-time setup
npm run deploy                 # Deploy script
npm run backup                 # Database backup
npm run health-check           # Service health check
```