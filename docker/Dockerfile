# ─── EA SaaS Platform — Dockerfile (Next.js App) ──────────────────────────────
# Multi-stage build for production
# ─────────────────────────────────────────────────────────────────────────────

# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Prisma requires openssl and libc6-compat on Alpine
RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else npm i; \
  fi

# ─── Stage 2: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Prisma requires openssl and libc6-compat on Alpine
RUN apk add --no-cache openssl libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Stage 3: Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Declare build args that Coolify injects (prevents $ interpolation errors)
ARG STRIPE_PUBLIC_KEY
ARG STRIPE_SECRET_KEY
ARG STRIPE_WEBHOOK_SECRET
ARG RESEND_API_KEY
ARG EMAIL_FROM
ARG RATE_LIMIT_EA_RPM
ARG RATE_LIMIT_WEB_RPM
ARG HEARTBEAT_INTERVAL_SEC
ARG HEARTBEAT_STALE_FACTOR
ARG LICENSE_CACHE_TTL_SEC
ARG ADMIN_API_KEY
ARG COOLIFY_FQDN
ARG REDIS_URL
ARG API_URL
ARG SERVICE_URL_WEB
ARG SERVICE_FQDN_WEB
ARG COOLIFY_BUILD_SECRETS_HASH

# Install curl for health checks + openssl for Prisma
RUN apk add --no-cache curl openssl libc6-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy Redis config
COPY --from=builder /app/redis ./redis

# Copy Prisma CLI for db push at startup + start script
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/docker/start.sh ./start.sh

# Copy data directory (JSON fallback DB: packages.json, users.json, etc.)
COPY --from=builder /app/data ./data
RUN chmod +x ./start.sh

USER nextjs

EXPOSE 3004

ENV PORT=3004
ENV HOSTNAME="0.0.0.0"

# Health check (use curl since it's installed in runner stage)
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
  CMD curl -f http://localhost:3004/api/health || exit 1

CMD ["./start.sh"]