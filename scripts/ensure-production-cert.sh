#!/bin/bash
# Ensure the production nginx certificate covers every supported public host.
# Runs on the production VM after nginx is up so certbot can use webroot ACME.
set -euo pipefail

REPO_DIR="${VM_DEPLOY_PATH:-${REPO_DIR:-/home/humanly/humanly}}"
CERT_DIR="${CERT_DIR:-nginx/ssl}"
WEBROOT_DIR="${WEBROOT_DIR:-nginx/certbot}"
LETSENCRYPT_DIR="${LETSENCRYPT_DIR:-nginx/letsencrypt}"
CERTBOT_CERT_NAME="${CERTBOT_CERT_NAME:-writehumanly.net}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-support@writehumanly.net}"
CERTBOT_DOMAINS="${CERTBOT_DOMAINS:-app.writehumanly.net admin.writehumanly.net api.writehumanly.net}"

cd "$REPO_DIR"

mkdir -p "$CERT_DIR" "$WEBROOT_DIR" "$LETSENCRYPT_DIR"

missing_domains=()
if [[ -f "$CERT_DIR/fullchain.pem" ]]; then
  current_san="$(openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -ext subjectAltName 2>/dev/null || true)"
else
  current_san=""
fi

for domain in $CERTBOT_DOMAINS; do
  if ! grep -Fq "DNS:${domain}" <<<"$current_san"; then
    missing_domains+=("$domain")
  fi
done

if (( ${#missing_domains[@]} == 0 )); then
  echo "==> TLS certificate already covers: ${CERTBOT_DOMAINS}"
  exit 0
fi

echo "==> TLS certificate is missing SAN entries: ${missing_domains[*]}"
echo "==> Requesting/expanding Let's Encrypt certificate: ${CERTBOT_CERT_NAME}"

domain_args=()
for domain in $CERTBOT_DOMAINS; do
  domain_args+=("-d" "$domain")
done

staging_args=()
if [[ "${CERTBOT_STAGING:-}" == "1" ]]; then
  staging_args+=("--staging")
fi

docker run --rm \
  -v "$PWD/$WEBROOT_DIR:/var/www/certbot" \
  -v "$PWD/$LETSENCRYPT_DIR:/etc/letsencrypt" \
  certbot/certbot:latest \
  certonly \
  --webroot \
  -w /var/www/certbot \
  --email "$CERTBOT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  --non-interactive \
  --expand \
  --cert-name "$CERTBOT_CERT_NAME" \
  "${staging_args[@]}" \
  "${domain_args[@]}"

docker run --rm \
  -v "$PWD/$LETSENCRYPT_DIR:/etc/letsencrypt:ro" \
  -v "$PWD/$CERT_DIR:/ssl" \
  alpine:3.20 \
  sh -ceu '
    cert_name="$1"
    cp -L "/etc/letsencrypt/live/${cert_name}/fullchain.pem" /ssl/fullchain.pem
    cp -L "/etc/letsencrypt/live/${cert_name}/privkey.pem" /ssl/privkey.pem
    chmod 644 /ssl/fullchain.pem
    chmod 600 /ssl/privkey.pem
  ' sh "$CERTBOT_CERT_NAME"

updated_san="$(openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -ext subjectAltName)"
for domain in $CERTBOT_DOMAINS; do
  if ! grep -Fq "DNS:${domain}" <<<"$updated_san"; then
    echo "ERROR: updated certificate still does not include ${domain}" >&2
    exit 1
  fi
done

echo "==> TLS certificate now covers: ${CERTBOT_DOMAINS}"
