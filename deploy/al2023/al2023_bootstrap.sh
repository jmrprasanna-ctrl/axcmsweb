#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/AXIS_CMS_WEB}"
BRANCH="${BRANCH:-main}"
REPO_URL="${1:-}"
PM2_NAME="${PM2_NAME:-AXIS_CMS_WEB-backend}"
DOMAIN="${DOMAIN:-_}"
NODE_PORT="${NODE_PORT:-5000}"

if [[ -z "${REPO_URL}" ]]; then
  echo "Usage: $0 <repo-url>"
  echo "Example: $0 https://github.com/your-user/AXIS_CMS_WEB.git"
  exit 1
fi

echo "==> Installing base packages (Amazon Linux 2023)"
sudo dnf update -y
sudo dnf install -y git httpd curl wget unzip zip nano htop postgresql15

if ! command -v node >/dev/null 2>&1; then
  sudo dnf install -y nodejs20 || sudo dnf install -y nodejs npm
fi

if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm install -g pm2
fi

echo "==> Enabling services"
sudo systemctl enable httpd
sudo systemctl start httpd

echo "==> Preparing app directory"
sudo mkdir -p "$(dirname "${APP_DIR}")"
if [[ ! -d "${APP_DIR}/.git" ]]; then
  sudo git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
else
  sudo git -C "${APP_DIR}" fetch origin
  sudo git -C "${APP_DIR}" checkout "${BRANCH}"
  sudo git -C "${APP_DIR}" pull --ff-only origin "${BRANCH}"
fi
sudo chown -R "$USER":"$USER" "${APP_DIR}"

echo "==> Installing dependencies"
cd "${APP_DIR}"
npm install --no-package-lock
npm --prefix backend install --no-package-lock

if [[ ! -f "${APP_DIR}/backend/.env" && -f "${APP_DIR}/backend/.env.example" ]]; then
  cp "${APP_DIR}/backend/.env.example" "${APP_DIR}/backend/.env"
  echo "Created backend/.env from .env.example. Update values before first production use."
fi

echo "==> Running schema migration sync"
npm run migrate:sql

echo "==> Configuring Apache reverse proxy"
sudo tee /etc/httpd/conf.d/AXIS_CMS_WEB.conf >/dev/null <<EOF
<VirtualHost *:80>
    ServerName ${DOMAIN}
    DocumentRoot ${APP_DIR}/frontend

    <Directory ${APP_DIR}/frontend>
        AllowOverride All
        Require all granted
    </Directory>

    ProxyPreserveHost On
    ProxyPass /api http://127.0.0.1:${NODE_PORT}/api
    ProxyPassReverse /api http://127.0.0.1:${NODE_PORT}/api

    ErrorLog /var/log/httpd/axis-error.log
    CustomLog /var/log/httpd/axis-access.log combined
</VirtualHost>
EOF

echo "==> Restarting Apache"
sudo apachectl configtest
sudo systemctl restart httpd

echo "==> Starting backend with PM2"
if pm2 describe "${PM2_NAME}" >/dev/null 2>&1; then
  pm2 reload "${PM2_NAME}" || pm2 restart "${PM2_NAME}"
else
  pm2 start npm --name "${PM2_NAME}" -- run start
fi
pm2 save

echo "==> Bootstrap complete"
echo "App dir: ${APP_DIR}"
echo "PM2 app: ${PM2_NAME}"
echo "Run once for boot persistence:"
echo "sudo env PATH=\$PATH pm2 startup systemd -u $USER --hp $HOME"
