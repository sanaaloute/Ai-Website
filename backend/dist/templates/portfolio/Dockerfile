FROM node:22-alpine
WORKDIR /app

# Build-time environment (Prisma generate does not need a live DB)
ENV DATABASE_URL=file:./data/dev.db
ENV NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV JWT_SECRET=build-time-placeholder

# Install dependencies (no lockfile is shipped with generated templates)
COPY package*.json ./
RUN npm install

# Generate the Prisma client
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy the rest of the application and build (Webpack for Alpine compatibility)
COPY . .
RUN npm run build -- --webpack

# Production env + persistent SQLite directory
ENV NODE_ENV=production
RUN mkdir -p /app/data

EXPOSE 3000

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
