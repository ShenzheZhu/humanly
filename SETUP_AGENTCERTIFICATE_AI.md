# Setting Up HTTPS for api.agentcertificate.ai

Complete guide to configure HTTPS for your Humory API at api.agentcertificate.ai

## Step 1: Configure DNS

1. **Log into your domain registrar** (where you bought agentcertificate.ai)

2. **Add an A record** for the subdomain:
   - **Type**: A
   - **Name**: api
   - **Value**: 54.91.235.109
   - **TTL**: 3600 (or automatic)

3. **Verify DNS propagation** (may take 5-60 minutes):
   ```bash
   # Check if DNS is propagated
   dig api.agentcertificate.ai

   # Or use nslookup
   nslookup api.agentcertificate.ai
   ```

   Should show: `54.91.235.109`

## Step 2: Install Nginx and Certbot

```bash
# Update system
sudo apt-get update

# Install Nginx
sudo apt-get install nginx -y

# Install Certbot for Let's Encrypt SSL
sudo apt-get install certbot python3-certbot-nginx -y

# Check Nginx is running
sudo systemctl status nginx
```

## Step 3: Create Nginx Configuration

```bash
# Create Nginx configuration file
sudo nano /etc/nginx/sites-available/humory
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name api.agentcertificate.ai;

    # Increase limits for large payloads
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Disable caching for API
        proxy_cache_bypass $http_upgrade;

        # Timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }

    # Tracker script with caching
    location /tracker/ {
        proxy_pass http://localhost:3001/tracker/;

        # Cache tracker files for 24 hours
        expires 24h;
        add_header Cache-Control "public, max-age=86400";
    }
}
```

Save and exit (Ctrl+X, then Y, then Enter)

## Step 4: Enable Nginx Site

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/humory /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# If test passes, restart Nginx
sudo systemctl restart nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

## Step 5: Configure Firewall

```bash
# Allow HTTP and HTTPS through firewall
sudo ufw allow 'Nginx Full'

# Or if using different firewall:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check firewall status
sudo ufw status
```

## Step 6: Get SSL Certificate

```bash
# Get SSL certificate from Let's Encrypt
sudo certbot --nginx -d api.agentcertificate.ai

# Follow the prompts:
# - Enter your email address
# - Agree to terms of service
# - Choose whether to share email with EFF (optional)
# - Choose to redirect HTTP to HTTPS (recommended: Yes)
```

Certbot will automatically:
- Obtain SSL certificate
- Update Nginx configuration
- Set up auto-renewal

## Step 7: Verify Auto-Renewal

```bash
# Test certificate renewal
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl status certbot.timer
```

## Step 8: Update Backend Environment

```bash
# Edit backend environment file
nano /home/ubuntu/humory/packages/backend/.env
```

Update or add these lines:

```bash
# CORS - Allow your frontend domain
CORS_ORIGIN=https://agentcertificate.ai,https://www.agentcertificate.ai,http://localhost:3000

# If you want to enforce HTTPS in logs/redirects
NODE_ENV=production
```

Save and restart backend:

```bash
# If running with pnpm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 18

# Restart backend
cd /home/ubuntu/humory
pkill -f "tsx watch src/index.ts"
pnpm --filter @humory/backend dev &
```

## Step 9: Update Frontend Environment

If you have a frontend, update:

```bash
nano /home/ubuntu/humory/packages/frontend/.env.local
```

```bash
NEXT_PUBLIC_API_URL=https://api.agentcertificate.ai
NEXT_PUBLIC_WS_URL=wss://api.agentcertificate.ai
NEXT_PUBLIC_TRACKER_URL=https://api.agentcertificate.ai/tracker/humory-tracker.min.js
```

## Step 10: Test Everything

### Test 1: Health Check

```bash
curl https://api.agentcertificate.ai/health
```

Expected output:
```json
{"status":"ok","timestamp":"...","uptime":...}
```

### Test 2: Tracker Script

```bash
curl https://api.agentcertificate.ai/tracker/humory-tracker.min.js
```

Should return JavaScript code (not an error)

### Test 3: API Version

```bash
curl https://api.agentcertificate.ai/api/v1
```

Expected output:
```json
{"name":"Humory API","version":"1.0.0","description":"Text provenance service API"}
```

### Test 4: SSL Certificate

Open in browser: https://api.agentcertificate.ai/health

Should show:
- Green lock icon (valid SSL)
- Certificate from "Let's Encrypt"

### Test 5: WebSocket (for Live Preview)

```bash
# Install wscat if needed
npm install -g wscat

# Test WebSocket connection
wscat -c wss://api.agentcertificate.ai
```

## Step 11: Generate Qualtrics Snippet

Now generate your Qualtrics snippet with HTTPS:

```bash
# Using your project token
curl "https://api.agentcertificate.ai/tracker/snippet?projectToken=YOUR_TOKEN&type=qualtrics"
```

Or visit in your Humory dashboard, the snippets will automatically use HTTPS.

## Monitoring and Maintenance

### Check Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### Check Certificate Expiry

```bash
sudo certbot certificates
```

Certificates auto-renew every 60 days. Check renewal:

```bash
sudo systemctl status certbot.timer
```

### Restart Services

```bash
# Restart Nginx
sudo systemctl restart nginx

# Restart backend (if needed)
cd /home/ubuntu/humory
pkill -f "tsx watch src/index.ts"
pnpm --filter @humory/backend dev &
```

## Troubleshooting

### DNS Not Resolving

```bash
# Check DNS
dig api.agentcertificate.ai

# Wait 5-60 minutes for DNS propagation
# Try from different location: https://www.whatsmydns.net
```

### Nginx Test Fails

```bash
# Check syntax errors
sudo nginx -t

# Check if port 80/443 already in use
sudo lsof -i :80
sudo lsof -i :443

# Stop conflicting service if needed
sudo systemctl stop apache2  # if Apache is running
```

### SSL Certificate Fails

Common issues:
- DNS not propagated yet (wait longer)
- Port 80 blocked by firewall
- Domain doesn't point to server

```bash
# Check firewall
sudo ufw status

# Manually allow port 80
sudo ufw allow 80/tcp
```

### Backend Not Responding

```bash
# Check if backend is running
ps aux | grep tsx

# Check backend port
lsof -i :3001

# Restart backend
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 18
cd /home/ubuntu/humory
pnpm --filter @humory/backend dev
```

### Mixed Content Errors in Qualtrics

- Ensure snippet URL uses `https://api.agentcertificate.ai`
- Check browser console for exact error
- Verify tracker script loads: `curl https://api.agentcertificate.ai/tracker/humory-tracker.min.js`

## Success Checklist

- [ ] DNS points api.agentcertificate.ai to 54.91.235.109
- [ ] Nginx installed and running
- [ ] SSL certificate obtained from Let's Encrypt
- [ ] https://api.agentcertificate.ai/health returns 200 OK
- [ ] Tracker script loads: https://api.agentcertificate.ai/tracker/humory-tracker.min.js
- [ ] Green lock icon appears in browser
- [ ] Certificate auto-renewal configured
- [ ] Backend environment updated
- [ ] Qualtrics snippet uses HTTPS URL
- [ ] No mixed content errors in Qualtrics

## URLs After Setup

- **API Base**: https://api.agentcertificate.ai/api/v1
- **Health Check**: https://api.agentcertificate.ai/health
- **Tracker Script**: https://api.agentcertificate.ai/tracker/humory-tracker.min.js
- **Snippet Generator**: https://api.agentcertificate.ai/tracker/snippet?projectToken=YOUR_TOKEN&type=qualtrics
- **WebSocket**: wss://api.agentcertificate.ai

## Next Steps

1. Update any existing tracking implementations with new HTTPS URL
2. Test Qualtrics integration with the new snippet
3. Monitor Nginx logs for any issues
4. Set up monitoring/alerting for certificate expiry (optional)
5. Consider setting up a proper systemd service for the backend (optional)
