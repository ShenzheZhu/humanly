# Domain Configuration Guide

This guide explains how to configure and switch domains for the Humory platform.

## Current Domain Setup

- **API Domain**: `api.humanly.art`
- **User Frontend**: `humanly.art` or `www.humanly.art`
- **Developer Frontend**: `agentcertificate.ai` (or can be moved to humanly.art)

## How to Switch Domains

### 1. Backend Configuration

Edit `packages/backend/.env`:

```bash
# Update CORS_ORIGIN to include your new domain(s)
CORS_ORIGIN=https://yournewdomain.com,https://www.yournewdomain.com,http://localhost:3000,http://localhost:3002

# Keep the old domain(s) during transition period if needed
CORS_ORIGIN=https://newdomain.com,https://olddomain.com,http://localhost:3000,http://localhost:3002
```

### 2. Developer Frontend Configuration

Edit `packages/frontend/.env.local`:

```bash
# Update API URL to your new backend domain
NEXT_PUBLIC_API_URL=https://api.yournewdomain.com

# Update WebSocket URL
NEXT_PUBLIC_WS_URL=https://api.yournewdomain.com

# Update Tracker URL
NEXT_PUBLIC_TRACKER_URL=https://api.yournewdomain.com
```

### 3. User Frontend Configuration

Edit `packages/frontend-user/.env.local`:

```bash
# Update API URL to your new backend domain
NEXT_PUBLIC_API_URL=https://api.yournewdomain.com/api/v1
```

### 4. Restart Services

After updating the environment variables:

```bash
# Restart backend (if using pm2)
pm2 restart humory-backend

# Or if running in development
cd packages/backend
npm run dev

# Restart frontends
cd packages/frontend
npm run dev

cd packages/frontend-user
npm run dev
```

## Environment Variables Reference

### Backend (`packages/backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `CORS_ORIGIN` | Comma-separated list of allowed frontend domains | `https://domain.com,http://localhost:3000` |
| `PORT` | Backend server port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |

### Frontend Developer (`packages/frontend/.env.local`)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `https://api.domain.com` |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL | `https://api.domain.com` |
| `NEXT_PUBLIC_TRACKER_URL` | Tracker service URL | `https://api.domain.com` |

### Frontend User (`packages/frontend-user/.env.local`)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL with /api/v1 path | `https://api.domain.com/api/v1` |

## DNS Configuration

When deploying to a new domain:

1. **API Subdomain** (`api.domain.com`):
   - Create an A record pointing to your backend server IP
   - Set up SSL certificate (use Certbot with nginx)

2. **Frontend Domain** (`domain.com` and `www.domain.com`):
   - Create A records pointing to your frontend server IP
   - Or use a CDN like Cloudflare/Vercel
   - Set up SSL certificates

## Quick Domain Switch Checklist

- [ ] Update backend `.env` CORS_ORIGIN
- [ ] Update frontend-dev `.env.local` URLs (3 variables)
- [ ] Update frontend-user `.env.local` URL
- [ ] Configure DNS records for new domain
- [ ] Set up SSL certificates
- [ ] Restart all services
- [ ] Test API connectivity from frontends
- [ ] Verify CORS is working (no errors in browser console)
- [ ] Keep old domain in CORS during transition period

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console:

1. Verify the frontend domain is in `CORS_ORIGIN` (including https/http)
2. Check for trailing slashes (don't include them)
3. Restart the backend after updating `.env`

### API Connection Errors

If the frontend can't connect to the API:

1. Verify `NEXT_PUBLIC_API_URL` is correct
2. Check that the API domain is accessible (curl/ping)
3. Verify SSL certificates are valid
4. Check backend logs for connection attempts

### WebSocket Connection Errors

If WebSocket connections fail:

1. Verify `NEXT_PUBLIC_WS_URL` matches the backend domain
2. Check that WebSocket connections are allowed through your proxy/firewall
3. Ensure nginx is configured to proxy WebSocket connections (if using nginx)

## Notes

- All `NEXT_PUBLIC_*` variables are embedded at build time - you must rebuild the frontend after changing them
- In development, Next.js will pick up changes automatically
- In production, you need to rebuild: `npm run build`
- The backend picks up `.env` changes on restart (no rebuild needed)
