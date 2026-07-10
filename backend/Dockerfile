# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/playwright:v1.61.1-jammy AS base

# Install dependencies (including dev deps needed for the build)
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm config set fetch-retries 5 && \
    npm config set fetch-timeout 120000 && \
    npm config set maxsockets 3 && \
    for i in 1 2 3; do npm ci && break || (echo "npm ci attempt $i failed, retrying..." && sleep 10); done

# Build the application
FROM deps AS builder
WORKDIR /app
COPY . .
RUN npm run prisma:generate
RUN npm run build
# Remove dev dependencies to keep the production image small
RUN npm prune --production

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy only the built artifacts and production dependencies
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/prisma.config.ts ./prisma.config.ts

# Ensure Playwright Chromium browser is available at runtime.
RUN npx playwright install chromium

# Ensure the default agent store directory is writable by the non-root user.
RUN mkdir -p /app/.agent_store && chown -R nestjs:nodejs /app/.agent_store

USER nestjs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
