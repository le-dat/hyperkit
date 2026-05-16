# Step 05 — Nginx Reverse Proxy

## Goal

Configure Nginx as a reverse proxy in front of the FastAPI backend. Nginx terminates TLS, serves static assets, and forwards API requests to the FastAPI container. This is the public-facing entrypoint on the VPS.

---

## Step 5.1 — Install Nginx

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

## Step 5.2 — Nginx Site Configuration

Create a site config at `/etc/nginx/sites-available/ai-chatbot`:

```nginx
# /etc/nginx/sites-available/ai-chatbot

server {
    listen 80;
    server_name your-domain.com;

    # Redirect all HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # TLS configuration (certbot manages certificates)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logs
    access_log /var/log/nginx/ai-chatbot.access.log;
    error_log  /var/log/nginx/ai-chatbot.error.log;

    # ── FastAPI Proxy ──────────────────────────────────────────────────
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;

        # SSE streaming support
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE timeout (long-running connections)
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;

        # Disable request body buffering for streaming
        proxy_request_buffering off;
    }

    # ── Health Check Endpoint (no auth) ───────────────────────────────
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        access_log off;
    }

    # ── Static Assets (future) ─────────────────────────────────────────
    # location /static {
    #     alias /var/www/ai-chatbot/static;
    #     expires 1y;
    #     add_header Cache-Control "public, immutable";
    # }
}
```

---

## Step 5.3 — Enable Site and Obtain TLS Certificate

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/ai-chatbot /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Obtain TLS certificate (HTTP challenge)
sudo certbot --nginx -d your-domain.com
```

---

## Step 5.4 — Verify Proxy Pass

```bash
# From inside the VPS, test that Nginx forwards to FastAPI
curl -i http://127.0.0.1:8000/health

# From outside, test TLS
curl -I https://your-domain.com/health
```

---

## Step 5.5 — Systemd Service for FastAPI (Optional)

If you run FastAPI directly (not inside Docker), create a systemd service:

```ini
# /etc/systemd/system/ai-chatbot.service
[Unit]
Description=AI Chatbot FastAPI Backend
After=network.target redis.service postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/ai-chatbot
Environment="PATH=/opt/ai-chatbot/.venv/bin"
ExecStart=/opt/ai-chatbot/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

# Security: restrict capabilities
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadOnlyDirectories=/

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable ai-chatbot
sudo systemctl start ai-chatbot
```

---

## Verification Checklist

- [ ] `nginx -t` passes without errors
- [ ] `curl -I https://your-domain.com/health` returns 200
- [ ] SSE connections through Nginx work correctly
- [ ] Certbot auto-renewal is active: `sudo certbot renew --dry-run`

> ➡️ Next: [Step 06 — CI/CD Pipeline](./03-cicd.md) (or continue to [Step 07 — Deployment](./04-deploy.md))