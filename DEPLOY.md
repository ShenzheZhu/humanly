# GCP VM Production Deployment Guide

## Architecture

```
Internet → Nginx :80/:443
             ├── /          → frontend-user:3002  (user portal)
             ├── /admin     → frontend:3000        (admin dashboard)
             ├── /api/      → backend:3001         (REST API)
             ├── /socket.io/ → backend:3001        (WebSocket)
             └── /tracker/  → backend:3001         (tracker JS, cached 24h)

Docker internal network (humanly-network):
  backend → postgres:5432   (service name, not localhost)
  backend → redis:6379      (service name, not localhost)
```

---

## Step 1 — Provision the VM

On GCP Console:
- Create VM: Ubuntu 22.04 LTS, e2-standard-2 (2 vCPU / 8 GB) or larger
- Firewall rules: allow TCP 22 (SSH), 80 (HTTP), 443 (HTTPS)
- Assign a static external IP
- Point your domain DNS A record to that IP

---

## Step 2 — Install Docker on the VM

```bash
# SSH into the VM
gcloud compute ssh <instance-name> --zone=<zone>

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

---

## Step 3 — Clone the repository

```bash
git clone https://github.com/your-org/humanly.git
cd humanly
```

---

## Step 4 — Configure environment variables

```bash
cp .env.example .env
nano .env   # or vim .env
```

Edit every `CHANGEME_*` value:

| Variable | What to set |
|---|---|
| `POSTGRES_PASSWORD` | Strong random password |
| `DATABASE_URL` | Update password to match `POSTGRES_PASSWORD` |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `AI_ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `CORS_ORIGIN` | `https://yourdomain.com` |
| `FRONTEND_USER_URL` | `https://yourdomain.com` |
| `NEXT_PUBLIC_API_URL` | `https://yourdomain.com/api/v1` |
| `NEXT_PUBLIC_WS_URL` | `wss://yourdomain.com` |
| `NEXT_PUBLIC_TRACKER_URL` | `https://yourdomain.com/tracker/humanly-tracker.min.js` |
| `DOMAIN` | `yourdomain.com` |

> **Important:** `NEXT_PUBLIC_*` variables are baked into the JS bundle at build time.
> You must set them in `.env` **before** running `docker compose build`.

---

## Step 5 — Build and start all services

```bash
# Build all images (takes 5–10 min on first run)
docker compose -f docker-compose.prod.yml build

# Start in detached mode
docker compose -f docker-compose.prod.yml up -d

# Verify all containers are running
docker compose -f docker-compose.prod.yml ps
```

Expected output:
```
NAME                   STATUS
humanly-db             running (healthy)
humanly-redis          running (healthy)
humanly-backend        running (healthy)
humanly-frontend       running
humanly-frontend-user  running
humanly-nginx          running
```

---

## Step 6 — Verify deployment

```bash
# Backend health
curl http://yourdomain.com/health

# API
curl http://yourdomain.com/api/v1

# Tracker script (should return JS)
curl -I http://yourdomain.com/tracker/humanly-tracker.min.js
```

Open in browser:
- `http://yourdomain.com` → User portal
- `http://yourdomain.com/admin` → Admin dashboard

---

## Step 7 — HTTPS with Let's Encrypt (recommended)

```bash
sudo apt install certbot -y

# Stop nginx to free port 80 temporarily
docker compose -f docker-compose.prod.yml stop nginx

# Issue certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certs into nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem   nginx/ssl/
sudo chmod 644 nginx/ssl/*.pem
```

Then update `nginx/default.conf` to add an HTTPS server block and redirect HTTP → HTTPS:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # ... rest of location blocks unchanged
}
```

Restart nginx:
```bash
docker compose -f docker-compose.prod.yml restart nginx
```

Set up auto-renewal:
```bash
# Add to crontab (renews and reloads nginx)
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && \
  cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem $(pwd)/nginx/ssl/ && \
  cp /etc/letsencrypt/live/yourdomain.com/privkey.pem $(pwd)/nginx/ssl/ && \
  docker compose -f $(pwd)/docker-compose.prod.yml exec nginx nginx -s reload") | crontab -
```

---

## Common operations

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f nginx

# Restart a single service
docker compose -f docker-compose.prod.yml restart backend

# Rebuild and redeploy after code changes
git pull
docker compose -f docker-compose.prod.yml build backend   # or frontend / frontend-user
docker compose -f docker-compose.prod.yml up -d --no-deps backend

# Database shell
docker exec -it humanly-db psql -U humanly_user -d humanly_prod

# Redis shell
docker exec -it humanly-redis redis-cli
```

---

## Troubleshooting

### "token invalid or expired" errors
This always means the `JWT_SECRET` in the backend `.env` doesn't match what was used to sign tokens. Ensure `.env` has a single consistent `JWT_SECRET` and rebuild:
```bash
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend
```

### Socket.IO connection failures
- Check nginx `/socket.io/` location has `Upgrade` + `Connection $connection_upgrade` headers ✓ (already in config)
- Check `CORS_ORIGIN` in `.env` matches the exact origin the browser sends (`https://yourdomain.com`)
- Check `NEXT_PUBLIC_WS_URL` uses `wss://` (not `ws://`) for HTTPS sites

### Backend can't connect to database
- Ensure `DATABASE_URL` uses `postgres` (service name), not `localhost`
- Wait for the postgres healthcheck: `docker compose -f docker-compose.prod.yml ps`

### Frontend shows blank page at /admin
- The admin Next.js app is built with `basePath=/admin`. If you change the path, rebuild:
  ```bash
  NEXT_PUBLIC_BASE_PATH=/newpath docker compose -f docker-compose.prod.yml build frontend
  ```
