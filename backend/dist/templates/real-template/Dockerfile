FROM node:22-alpine
WORKDIR /app

# Install SQLite CLI for seeding
RUN apk add --no-cache sqlite

# Set required env vars for build
ENV DATABASE_URL=file:./data/dev.db
ENV NEXT_PUBLIC_APP_URL=https://www.daacoo.com

# Copy dependency manifests and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy Prisma schema/config and generate the client
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Build the Next.js application (Webpack for Alpine compatibility)
RUN npm run build -- --webpack

# Production env & create directory for persistent SQLite database
ENV NODE_ENV=production
RUN mkdir -p /app/data

EXPOSE 3000

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
