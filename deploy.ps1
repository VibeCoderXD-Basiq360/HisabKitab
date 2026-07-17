#!/usr/bin/env pwsh
# HisabKitab — deploy / redeploy to VPS (binny-nginx pattern)
#
# Architecture:
#   binny-nginx container owns ports 80/443 on edge-network
#   Each app: hisabkitab-web + hisabkitab-backend on edge-network
#             hisabkitab-db on internal network only
#   SSL: host-level certbot (/etc/letsencrypt)
#
# First run:  builds, gets SSL cert, adds vhost to binny-nginx
# Re-runs:    rebuilds images only (cert + vhost already in place)

$ErrorActionPreference = "Stop"

$SERVER     = "187.127.130.99"
$USER       = "root"
$REMOTE_DIR = "/opt/hisabkitab"
$DOMAIN     = "hisabkitab.basiq360.com"
$EMAIL      = "adityaarora0601@gmail.com"
$NGINX_CONF = "/opt/binny/nginx.binny.conf"
$SSH_KEY    = "$env:USERPROFILE\.ssh\id_ed25519"

function ssh_run([string]$cmd) {
    & ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${USER}@${SERVER}" $cmd
    if ($LASTEXITCODE -ne 0) { throw "Remote command failed (exit $LASTEXITCODE)" }
}
function scp_put([string]$local, [string]$remote) {
    & scp -i "$SSH_KEY" -o StrictHostKeyChecking=no $local "${USER}@${SERVER}:${remote}"
    if ($LASTEXITCODE -ne 0) { throw "scp failed: $local → $remote" }
}

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  HisabKitab  →  https://$DOMAIN" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Upload project ──────────────────────────────────────────────────
Write-Host "[1/5] Packaging & uploading..." -ForegroundColor Yellow
$tmpTar = "$env:TEMP\hisabkitab_deploy.tar.gz"
& git archive HEAD --format=tar.gz -o $tmpTar
if ($LASTEXITCODE -ne 0) { throw "git archive failed — commit your changes first" }
$sizeMB = [Math]::Round((Get-Item $tmpTar).Length / 1MB, 1)
Write-Host "  Archive: ${sizeMB} MB"
scp_put $tmpTar "/tmp/hisabkitab_deploy.tar.gz"
scp_put "Backend\.env.production" "/tmp/hisabkitab_backend_env"
ssh_run "mkdir -p $REMOTE_DIR && tar -xzf /tmp/hisabkitab_deploy.tar.gz -C $REMOTE_DIR && mv /tmp/hisabkitab_backend_env $REMOTE_DIR/Backend/.env.production && rm /tmp/hisabkitab_deploy.tar.gz && echo 'Upload done.'"

# ── Step 2: Build images and start containers ────────────────────────────────
Write-Host "[2/5] Building images & starting containers..." -ForegroundColor Yellow
ssh_run "cd $REMOTE_DIR && docker compose build --no-cache 2>&1 | tail -30 && docker compose up -d && echo '' && docker compose ps"

# ── Step 3: SSL certificate (first run only) ─────────────────────────────────
Write-Host "[3/5] SSL certificate..." -ForegroundColor Yellow
# Write the certbot command to a temp script to avoid PS dollar-sign expansion
$certScript = @"
#!/bin/bash
set -e
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
if [ -d "`$CERT_DIR" ]; then
  echo "Cert already exists — skipping."
else
  echo "Requesting Let's Encrypt cert for $DOMAIN..."
  certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN
  echo "Cert obtained."
fi
"@
$tmpCertScript = "$env:TEMP\hk_certbot.sh"
$certScript | Out-File -FilePath $tmpCertScript -Encoding utf8 -NoNewline
scp_put $tmpCertScript "/tmp/hk_certbot.sh"
ssh_run "chmod +x /tmp/hk_certbot.sh && bash /tmp/hk_certbot.sh && rm /tmp/hk_certbot.sh"

# ── Step 4: Add vhost to binny-nginx (first run only) ───────────────────────
Write-Host "[4/5] Registering vhost in binny-nginx..." -ForegroundColor Yellow

# Write the nginx vhost block to a local file — avoids $ escaping nightmare
$vhostBlock = @"

  # ─── HisabKitab ($DOMAIN) ─────────────────────────────────────────────────
  server {
    listen 443 ssl;
    http2 on;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    client_max_body_size 20m;

    location /api/ {
      set `$hk_be hisabkitab-backend;
      limit_req zone=api burst=30 nodelay;
      proxy_pass http://`$hk_be:5000;
      proxy_http_version 1.1;
      proxy_set_header Host `$host;
      proxy_set_header X-Real-IP `$remote_addr;
      proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto `$scheme;
      proxy_read_timeout 120s;
    }

    location / {
      set `$hk_web hisabkitab-web;
      proxy_pass http://`$hk_web:80;
      proxy_http_version 1.1;
      proxy_set_header Host `$host;
      proxy_set_header X-Real-IP `$remote_addr;
      proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto `$scheme;
    }
  }

"@
$tmpVhost = "$env:TEMP\hk_vhost.conf"
$vhostBlock | Out-File -FilePath $tmpVhost -Encoding utf8 -NoNewline
scp_put $tmpVhost "/tmp/hk_vhost.conf"

# Python script to insert vhost into nginx.binny.conf (also uploaded as a file)
$pyInsert = @"
import sys

with open('/tmp/hk_vhost.conf', 'r') as f:
    vhost = f.read()

with open('$NGINX_CONF', 'r') as f:
    content = f.read()

if '$DOMAIN' in content:
    print('Vhost already present — no change.')
    sys.exit(0)

marker = 'listen 443 ssl default_server'
idx = content.find(marker)
if idx == -1:
    print('ERROR: catch-all marker not found', file=sys.stderr)
    sys.exit(1)

block_start = content.rfind('\n  server {', 0, idx)
if block_start == -1:
    print('ERROR: server block start not found', file=sys.stderr)
    sys.exit(1)

import shutil
shutil.copy('$NGINX_CONF', '$NGINX_CONF.bak-hisabkitab')
new_content = content[:block_start] + vhost + content[block_start:]
with open('$NGINX_CONF', 'w') as f:
    f.write(new_content)
print('Vhost inserted.')
"@
$tmpPy = "$env:TEMP\hk_insert_vhost.py"
$pyInsert | Out-File -FilePath $tmpPy -Encoding utf8 -NoNewline
scp_put $tmpPy "/tmp/hk_insert_vhost.py"
ssh_run "python3 /tmp/hk_insert_vhost.py && rm /tmp/hk_insert_vhost.py /tmp/hk_vhost.conf"

# ── Step 5: Reload binny-nginx ───────────────────────────────────────────────
Write-Host "[5/5] Reloading binny-nginx..." -ForegroundColor Yellow
ssh_run "docker exec binny-nginx nginx -t && docker kill -s HUP binny-nginx && echo 'binny-nginx reloaded.'"
Start-Sleep -Seconds 3
ssh_run "curl -sf https://$DOMAIN/api/health && echo ' — Health check OK' || echo 'Health check: check manually — backend may still be starting'"

Remove-Item $tmpTar, $tmpCertScript, $tmpVhost, $tmpPy -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  Done!  https://$DOMAIN" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  Backend logs:  ssh root@$SERVER 'docker logs -f hisabkitab-backend'"
Write-Host "  All logs:      ssh root@$SERVER 'cd $REMOTE_DIR && docker compose logs -f'"
Write-Host "  DB shell:      ssh root@$SERVER 'docker exec -it hisabkitab-db psql -U hkuser -d hisabkitab'"
Write-Host "  Restart:       ssh root@$SERVER 'cd $REMOTE_DIR && docker compose restart'"
Write-Host "  nginx test:    ssh root@$SERVER 'docker exec binny-nginx nginx -t'"
