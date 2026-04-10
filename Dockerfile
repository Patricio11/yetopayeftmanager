# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ── Stage 2: Build the application ───────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client if applicable (uncomment if you use Prisma)
# RUN npx prisma generate

# Build Next.js (standalone output)
ENV NEXT_TELEMETRY_DISABLED=1

# ── Build-time environment variables ─────────────────────────────────────────
# DATABASE_URL: dummy value to satisfy the import-time check in lib/db/index.ts
# The real connection string is injected at runtime via ECS secrets / docker run -e
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# NEXT_PUBLIC_* vars are inlined into the JS bundle at build time by Next.js.
# These MUST be set here or they'll be empty in the final image.
# Override at build time with: docker build --build-arg NEXT_PUBLIC_APP_URL=https://... .
ARG NEXT_PUBLIC_APP_URL=https://yourdomain.co.za
ARG NEXT_PUBLIC_EFT_SERVICE_URL=https://api.yetopayeft.com/v1/eft
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_EFT_SERVICE_URL=$NEXT_PUBLIC_EFT_SERVICE_URL

RUN npm run build

# ── Stage 3: Production runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy JWT keys for EFT service signing
# In production, prefer mounting these via ECS secrets/volumes
COPY --from=builder --chown=nextjs:nodejs /app/keys ./keys

USER nextjs

EXPOSE 3000

# Standalone server — no need for node_modules or PM2
CMD ["node", "server.js"]
