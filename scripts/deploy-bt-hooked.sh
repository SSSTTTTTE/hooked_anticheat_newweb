#!/usr/bin/env bash
set -Eeuo pipefail

DOMAIN="${DOMAIN:-hooked.cn}"
REPO="${REPO:-https://github.com/SSSTTTTTE/hooked_anticheat_newweb.git}"
APP_DIR="${APP_DIR:-/www/wwwroot/${DOMAIN}}"
HOST_BIND="${HOST_BIND:-127.0.0.1}"
HOST_PORT="${HOST_PORT:-3021}"
CONTAINER_PORT="${CONTAINER_PORT:-5173}"
CONTAINER_NAME="${CONTAINER_NAME:-hooked-anticheat-site}"
SERVICE_NAME="${SERVICE_NAME:-hooked-site}"
HEALTH_PATH="${HEALTH_PATH:-/api/health}"

timestamp="$(date +%Y%m%d%H%M%S)"

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
  else
    echo "docker compose/docker-compose is not installed" >&2
    exit 1
  fi
}

require_env_file() {
  if [ ! -f "${APP_DIR}/.env" ]; then
    echo "Missing ${APP_DIR}/.env. Create it from .env.example before deploying." >&2
    exit 1
  fi
}

check_port() {
  if ss -lnt | awk '{print $4}' | grep -q ":${HOST_PORT}$"; then
    echo "Host port ${HOST_PORT} is already in use. Set HOST_PORT to a free localhost port." >&2
    exit 1
  fi
}

backup_existing_site() {
  if [ -d "${APP_DIR}" ] && [ "$(ls -A "${APP_DIR}" 2>/dev/null | wc -l)" -gt 0 ]; then
    local backup_dir="/www/backup/site/${DOMAIN}-${timestamp}"
    mkdir -p "$(dirname "${backup_dir}")"
    cp -a "${APP_DIR}" "${backup_dir}"
    echo "Backed up ${APP_DIR} to ${backup_dir}"
  fi
}

sync_repo() {
  mkdir -p /www/wwwroot

  if [ -d "${APP_DIR}/.git" ]; then
    git -C "${APP_DIR}" remote set-url origin "${REPO}"
    git -C "${APP_DIR}" fetch --depth=1 origin main
    git -C "${APP_DIR}" reset --hard origin/main
    return
  fi

  local env_backup=""
  if [ -f "${APP_DIR}/.env" ]; then
    env_backup="/tmp/${DOMAIN}.env.${timestamp}"
    cp "${APP_DIR}/.env" "${env_backup}"
  fi

  chattr -i "${APP_DIR}/.user.ini" 2>/dev/null || true
  rm -rf "${APP_DIR}"
  git clone --depth=1 "${REPO}" "${APP_DIR}"

  if [ -n "${env_backup}" ]; then
    mv "${env_backup}" "${APP_DIR}/.env"
    chmod 600 "${APP_DIR}/.env"
  fi
}

write_compose_override() {
  cat >"${APP_DIR}/docker-compose.override.yml" <<EOF
services:
  ${SERVICE_NAME}:
    container_name: ${CONTAINER_NAME}
    environment:
      TRUST_PROXY_HEADERS: "true"
EOF
}

write_nginx_conf() {
  local nginx_conf="/www/server/panel/vhost/nginx/${DOMAIN}.conf"
  mkdir -p /www/server/panel/vhost/nginx /www/wwwlogs

  if [ -f "${nginx_conf}" ]; then
    cp "${nginx_conf}" "${nginx_conf}.bak.${timestamp}"
    echo "Backed up ${nginx_conf} to ${nginx_conf}.bak.${timestamp}"
  fi

  local cert_dir="/www/server/panel/vhost/cert/${DOMAIN}"
  if [ -s "${cert_dir}/fullchain.pem" ] && [ -s "${cert_dir}/privkey.pem" ]; then
    cat >"${nginx_conf}" <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate ${cert_dir}/fullchain.pem;
    ssl_certificate_key ${cert_dir}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers EECDH+CHACHA20:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    access_log /www/wwwlogs/${DOMAIN}.log;
    error_log /www/wwwlogs/${DOMAIN}.error.log;

    location / {
        proxy_pass http://${HOST_BIND}:${HOST_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300;
        proxy_send_timeout 300;
    }
}
EOF
  else
    cat >"${nginx_conf}" <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    access_log /www/wwwlogs/${DOMAIN}.log;
    error_log /www/wwwlogs/${DOMAIN}.error.log;

    location / {
        proxy_pass http://${HOST_BIND}:${HOST_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300;
        proxy_send_timeout 300;
    }
}
EOF
  fi

  nginx -t
  nginx -s reload
}

main() {
  require_command git
  require_command docker
  require_command ss
  local compose
  compose="$(compose_cmd)"

  backup_existing_site
  sync_repo
  require_env_file
  check_port
  write_compose_override

  cd "${APP_DIR}"
  export HOST_BIND HOST_PORT
  ${compose} up -d --build
  ${compose} ps

  curl -fsS "http://${HOST_BIND}:${HOST_PORT}${HEALTH_PATH}" >/dev/null
  write_nginx_conf
  curl -fsS -H "Host: ${DOMAIN}" "http://127.0.0.1${HEALTH_PATH}" >/dev/null

  echo "DEPLOY_OK domain=${DOMAIN} app_dir=${APP_DIR} port=${HOST_PORT} container=${CONTAINER_NAME}"
}

main "$@"
