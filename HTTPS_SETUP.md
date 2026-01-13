# HTTPS Setup Guide

Qualtrics and other HTTPS-hosted platforms require your tracking script to be served over HTTPS to avoid mixed content errors.

## The Problem

When you see this error:
```
Mixed Content: The page at 'https://...' was loaded over HTTPS,
but requested an insecure script 'http://...'. This request has been blocked.
```

This means your tracker script is being served over HTTP, but Qualtrics requires HTTPS.

## Solution Options

### Option 1: Use Nginx as HTTPS Reverse Proxy (Recommended)

This is the easiest production setup.

#### 1. Install Nginx

```bash
sudo apt-get update
sudo apt-get install nginx
```

#### 2. Install Certbot for SSL Certificate

```bash
sudo apt-get install certbot python3-certbot-nginx
```

#### 3. Get a Domain Name

You need a domain pointing to your server (e.g., `api.yourdomain.com`).

#### 4. Configure Nginx

Create `/etc/nginx/sites-available/humory`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;  # Replace with your domain

    location / {
        proxy_pass http://localhost:3001;
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

#### 5. Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/humory /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. Get SSL Certificate

```bash
sudo certbot --nginx -d api.yourdomain.com
```

Certbot will automatically configure HTTPS and set up auto-renewal.

#### 7. Update Your Snippet URL

Your tracker URL will now be:
```
https://api.yourdomain.com/tracker/humory-tracker.min.js
```

### Option 2: Direct HTTPS with Node.js

If you don't want to use Nginx, you can configure Express to use HTTPS directly.

#### 1. Get SSL Certificate

For production, use Let's Encrypt:
```bash
sudo apt-get install certbot
sudo certbot certonly --standalone -d api.yourdomain.com
```

Certificates will be in `/etc/letsencrypt/live/api.yourdomain.com/`

#### 2. Update Backend Server

Modify `/home/ubuntu/humory/packages/backend/src/server.ts`:

```typescript
import https from 'https';
import fs from 'fs';

// ... existing code ...

export function createServer(app: Express) {
  let httpServer;

  if (process.env.NODE_ENV === 'production' && process.env.SSL_KEY && process.env.SSL_CERT) {
    // HTTPS for production
    const options = {
      key: fs.readFileSync(process.env.SSL_KEY),
      cert: fs.readFileSync(process.env.SSL_CERT),
    };
    httpServer = https.createServer(options, app);
  } else {
    // HTTP for development
    httpServer = http.createServer(app);
  }

  // ... rest of code ...
}
```

#### 3. Set Environment Variables

Add to `/home/ubuntu/humory/packages/backend/.env`:

```bash
NODE_ENV=production
SSL_KEY=/etc/letsencrypt/live/api.yourdomain.com/privkey.pem
SSL_CERT=/etc/letsencrypt/live/api.yourdomain.com/fullchain.pem
```

#### 4. Restart Backend

```bash
pnpm --filter @humory/backend dev
```

### Option 3: Use ngrok for Testing (Development Only)

For quick testing without setting up a full HTTPS server:

#### 1. Install ngrok

```bash
# Download ngrok
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar xvzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/
```

#### 2. Sign up for ngrok

Get a free account at https://dashboard.ngrok.com/signup

#### 3. Authenticate

```bash
ngrok config add-authtoken YOUR_TOKEN
```

#### 4. Start ngrok Tunnel

```bash
ngrok http 3001
```

You'll get an HTTPS URL like: `https://abc123.ngrok.io`

#### 5. Use ngrok URL in Qualtrics

When generating your snippet, use the ngrok URL:
```
GET /tracker/snippet?projectToken=YOUR_TOKEN&type=qualtrics&apiUrl=https://abc123.ngrok.io
```

**Note**: ngrok URLs change each time you restart (unless you have a paid plan). This is only for testing!

### Option 4: Cloudflare Tunnel (Free, Permanent)

Cloudflare Tunnel provides a free permanent HTTPS URL.

#### 1. Install Cloudflare Tunnel

```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

#### 2. Login to Cloudflare

```bash
cloudflared tunnel login
```

#### 3. Create a Tunnel

```bash
cloudflared tunnel create humory-tracker
```

#### 4. Configure DNS

Add a CNAME record in Cloudflare DNS:
- Type: CNAME
- Name: api (or your subdomain)
- Target: <tunnel-id>.cfargotunnel.com

#### 5. Create Configuration

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: <your-tunnel-id>
credentials-file: /home/ubuntu/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:3001
  - service: http_status:404
```

#### 6. Run the Tunnel

```bash
cloudflared tunnel run humory-tracker
```

Or install as a service:
```bash
sudo cloudflared service install
sudo systemctl start cloudflared
```

## Updating Frontend Environment Variables

After setting up HTTPS, update your frontend environment:

`/home/ubuntu/humory/packages/frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
NEXT_PUBLIC_TRACKER_URL=https://api.yourdomain.com/tracker/humory-tracker.min.js
```

## Generating Qualtrics Snippet with HTTPS

Once HTTPS is set up, generate your snippet with the HTTPS URL:

```bash
curl "https://api.yourdomain.com/tracker/snippet?projectToken=YOUR_TOKEN&type=qualtrics"
```

Or in the Humory dashboard, the snippets page will automatically detect HTTPS.

## Testing HTTPS Setup

### 1. Test Tracker Endpoint

```bash
curl https://api.yourdomain.com/tracker/humory-tracker.min.js
```

Should return the tracker JavaScript without SSL errors.

### 2. Test in Browser

Open: `https://api.yourdomain.com/health`

Should show: `{"status":"ok",...}` with a valid SSL certificate (green lock icon).

### 3. Test in Qualtrics

1. Add the tracking code to Qualtrics
2. Open browser DevTools (F12)
3. Go to Console tab
4. Preview your survey
5. Should see: "Humory tracker loaded" and "Humory tracker initialized"
6. Should NOT see any mixed content errors

## Troubleshooting

### Certificate Errors

If you see certificate errors:
```bash
# Check certificate
sudo certbot certificates

# Renew if expired
sudo certbot renew
```

### Mixed Content Still Occurring

1. Check the generated snippet URL contains `https://`
2. Clear browser cache
3. Check nginx is forwarding the `X-Forwarded-Proto` header
4. Verify the tracker file is accessible: `curl https://your-domain.com/tracker/humory-tracker.min.js`

### WebSocket Connection Issues

For live preview to work over HTTPS, ensure WebSocket upgrade is configured:

In nginx:
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
```

WebSocket URL should be: `wss://api.yourdomain.com` (note the `wss://` not `ws://`)

## Production Checklist

- [ ] Domain name configured and pointing to server
- [ ] SSL certificate installed and valid
- [ ] Nginx or HTTPS reverse proxy configured
- [ ] Backend accessible via HTTPS
- [ ] Tracker script loads over HTTPS (no mixed content errors)
- [ ] WebSocket connections work over WSS
- [ ] Certificate auto-renewal configured (certbot)
- [ ] Firewall allows ports 80 and 443
- [ ] Frontend environment variables updated
- [ ] Test snippet in Qualtrics without errors

## Quick Start (Recommended for Production)

```bash
# 1. Install nginx and certbot
sudo apt-get update
sudo apt-get install nginx certbot python3-certbot-nginx

# 2. Configure nginx (create /etc/nginx/sites-available/humory with config above)
sudo nano /etc/nginx/sites-available/humory

# 3. Enable site
sudo ln -s /etc/nginx/sites-available/humory /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 4. Get SSL certificate (replace with your domain)
sudo certbot --nginx -d api.yourdomain.com

# 5. Done! Your API is now available at https://api.yourdomain.com
```
