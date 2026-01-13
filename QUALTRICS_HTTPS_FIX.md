# Quick Fix: Qualtrics HTTPS Mixed Content Error

## The Error You're Seeing

```
Mixed Content: The page at 'https://stanforduniversity.qualtrics.com/...'
was loaded over HTTPS, but requested an insecure script
'http://54.91.235.109:3001/tracker/humory-tracker.min.js'.
This request has been blocked.
```

## Why This Happens

Qualtrics uses HTTPS, but your tracker is served over HTTP. Modern browsers block this for security.

## Immediate Solutions

### Option 1: Use ngrok (Quickest for Testing)

Perfect for immediate testing without server configuration.

1. **Install ngrok:**
   ```bash
   wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
   tar xvzf ngrok-v3-stable-linux-amd64.tgz
   sudo mv ngrok /usr/local/bin/
   ```

2. **Sign up and authenticate:**
   - Go to https://dashboard.ngrok.com/signup
   - Copy your authtoken
   ```bash
   ngrok config add-authtoken YOUR_TOKEN
   ```

3. **Start ngrok tunnel:**
   ```bash
   ngrok http 3001
   ```

4. **Get your HTTPS URL:**
   You'll see output like:
   ```
   Forwarding   https://abc123.ngrok.io -> http://localhost:3001
   ```

5. **Generate Qualtrics snippet with ngrok URL:**
   ```bash
   curl "http://localhost:3001/tracker/snippet?projectToken=YOUR_TOKEN&type=qualtrics&apiUrl=https://abc123.ngrok.io"
   ```

6. **Copy the snippet and paste into Qualtrics**

**Pros:** Works immediately, no configuration
**Cons:** URL changes on restart (free plan), only for testing

### Option 2: Set Up Domain with SSL (Production)

For permanent Stanford deployment:

1. **Get a domain or subdomain:**
   - Example: `humory-api.stanford.edu`
   - Point it to your server IP: `54.91.235.109`

2. **Install Nginx and Certbot:**
   ```bash
   sudo apt-get update
   sudo apt-get install nginx certbot python3-certbot-nginx -y
   ```

3. **Create Nginx config:**
   ```bash
   sudo nano /etc/nginx/sites-available/humory
   ```

   Add:
   ```nginx
   server {
       listen 80;
       server_name humory-api.stanford.edu;  # Your domain

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

4. **Enable and test:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/humory /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

5. **Get SSL certificate:**
   ```bash
   sudo certbot --nginx -d humory-api.stanford.edu
   ```

6. **Generate snippet:**
   Now your tracker URL is: `https://humory-api.stanford.edu/tracker/humory-tracker.min.js`

**Pros:** Permanent, professional, secure
**Cons:** Requires domain configuration

### Option 3: Cloudflare Tunnel (Free, Permanent)

Free permanent HTTPS without needing a domain (Cloudflare provides one).

1. **Install Cloudflare Tunnel:**
   ```bash
   wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared-linux-amd64.deb
   ```

2. **Login:**
   ```bash
   cloudflared tunnel login
   ```
   Follow the browser prompt to authorize.

3. **Create tunnel:**
   ```bash
   cloudflared tunnel create humory-tracker
   ```
   Note the tunnel ID shown.

4. **Create config file:**
   ```bash
   nano ~/.cloudflared/config.yml
   ```

   Add (replace `TUNNEL_ID`):
   ```yaml
   tunnel: TUNNEL_ID
   credentials-file: /home/ubuntu/.cloudflared/TUNNEL_ID.json

   ingress:
     - hostname: humory-tracker.YOURNAME.workers.dev
       service: http://localhost:3001
     - service: http_status:404
   ```

5. **Start tunnel:**
   ```bash
   cloudflared tunnel run humory-tracker
   ```

   Or install as service:
   ```bash
   sudo cloudflared service install
   sudo systemctl start cloudflared
   ```

6. **Access via HTTPS:**
   Your URL: `https://humory-tracker.YOURNAME.workers.dev`

**Pros:** Free, permanent, no domain needed
**Cons:** Uses Cloudflare domain

## Updating Qualtrics Code

After setting up HTTPS (using any option above), regenerate your snippet:

```bash
# Replace with your HTTPS URL
curl "https://YOUR-HTTPS-URL/tracker/snippet?projectToken=YOUR_TOKEN&type=qualtrics"
```

The output will have the correct HTTPS URL. Copy and paste into Qualtrics.

## Verification Steps

1. **Test the tracker URL in browser:**
   ```
   https://your-domain.com/tracker/humory-tracker.min.js
   ```
   Should download the JavaScript file with green lock icon.

2. **Test in Qualtrics:**
   - Preview your survey
   - Open DevTools (F12) → Console
   - Should see: "Humory tracker loaded"
   - Should NOT see mixed content errors

3. **Test tracking:**
   - Type in a Qualtrics text field
   - Check Humory dashboard for events

## Current Recommended Path

For **immediate testing** (Stanford research):
→ Use **ngrok** (Option 1)

For **production deployment** (ongoing use):
→ Request Stanford subdomain and use **Nginx + Let's Encrypt** (Option 2)

For **quick prototype** (no Stanford IT involvement):
→ Use **Cloudflare Tunnel** (Option 3)

## Need Help?

See detailed setup instructions:
- Full HTTPS setup: [HTTPS_SETUP.md](./HTTPS_SETUP.md)
- Qualtrics integration: [QUALTRICS_INTEGRATION.md](./QUALTRICS_INTEGRATION.md)

## API Parameter Reference

When generating snippets, you can override the base URL:

```bash
GET /tracker/snippet?projectToken=TOKEN&type=qualtrics&apiUrl=https://YOUR-URL

Parameters:
- projectToken (required): Your project token
- type: "qualtrics" | "google-forms" | "standard"
- apiUrl (optional): Override the base API URL with your HTTPS URL
- userIdField (optional): CSS selector for user ID field
```
