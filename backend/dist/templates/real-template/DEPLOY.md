# Self-Hosting Deployment Guide

## Requirements

- A Linux server (VPS or dedicated) with Docker & Docker Compose installed
- Domain `www.daacoo.com` pointing to your server's public IP
- Ports 80 and 443 open in your firewall

## Quick Start

### 1. Clone the repo on your server

```bash
git clone https://www.gitcc.com/elsone/daacoo.git
cd daacoo
```

### 2. Create the environment file

```bash
cp .env.example .env
nano .env
```

Fill in at least `JWT_SECRET`:
```
JWT_SECRET=your-super-random-secret-min-32-characters-long
```

### 3. Start the application

```bash
docker compose -f docker-compose.prod.yml up -d
```

Caddy will automatically:
- Obtain an SSL certificate from Let's Encrypt for `www.daacoo.com`
- Renew it before expiry
- Reverse proxy traffic to the Next.js app

### 4. Verify it's running

```bash
docker compose -f docker-compose.prod.yml logs -f app
```

Visit `https://www.daacoo.com`

---

## Updating the App

When you push new code:

```bash
cd daacoo
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Your SQLite database is persisted in the `db_data` Docker volume, so data survives rebuilds.

---

## Useful Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart
docker compose -f docker-compose.prod.yml restart

# Stop everything
docker compose -f docker-compose.prod.yml down

# Backup database
docker compose -f docker-compose.prod.yml exec app sqlite3 /app/data/dev.db ".backup /app/data/dev.db.backup"
docker cp daacoo-app-1:/app/data/dev.db.backup ./backup-$(date +%Y%m%d).db

# View database
docker compose -f docker-compose.prod.yml exec app sqlite3 /app/data/dev.db
```

---

## What Runs Where

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| Next.js app | `app` | `3000` | Your application |
| Caddy | `caddy` | `80`, `443` | Reverse proxy + SSL |
| SQLite | inside `app` | — | Local file database |
