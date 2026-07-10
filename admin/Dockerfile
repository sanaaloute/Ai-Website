# syntax=docker/dockerfile:1

FROM node:24-slim AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm config set fetch-retries 5 && \
    npm config set fetch-timeout 120000 && \
    npm config set maxsockets 3 && \
    for i in 1 2 3; do npm ci && break || (echo "npm ci attempt $i failed, retrying..." && sleep 10); done

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure public/ exists even if the directory is empty or untracked in git.
RUN mkdir -p /app/public

# Build-time environment variable (used for server-side rewrites).
# This is required so Next.js can proxy /api/admin/* to the real backend.
ENV NEXT_TELEMETRY_DISABLED=1
ARG BACKEND_API_URL
ENV BACKEND_API_URL=$BACKEND_API_URL

RUN if [ -z "$BACKEND_API_URL" ]; then echo "BACKEND_API_URL build arg is required" && exit 1; fi
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
