#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-main}"
APP_DIR="${APP_DIR:-/var/www/AXIS_CMS_WEB}"
PM2_NAME="${PM2_NAME:-AXIS_CMS_WEB-backend}"
API_HEALTH_URL="${API_HEALTH_URL:-http://127.0.0.1:5000/api/health}"
WEB_HEALTH_URL="${WEB_HEALTH_URL:-http://127.0.0.1}"
RUN_DB_CLEANUP="${RUN_DB_CLEANUP:-false}"
RUN_SCHEMA_MIGRATION="${RUN_SCHEMA_MIGRATION:-true}"
API_HEALTH_RETRIES="${API_HEALTH_RETRIES:-30}"
API_HEALTH_RETRY_DELAY_SECONDS="${API_HEALTH_RETRY_DELAY_SECONDS:-2}"
API_HEALTH_STARTUP_GRACE_SECONDS="${API_HEALTH_STARTUP_GRACE_SECONDS:-3}"

echo "==> AWS AL2023 update started"
echo "    app: ${APP_DIR}"
echo "    branch: ${BRANCH}"
echo "    pm2: ${PM2_NAME}"

if [[ ! -d "${APP_DIR}" ]]; then
  echo "ERROR: app directory not found: ${APP_DIR}"
  exit 1
fi

cd "${APP_DIR}"

echo "==> Fetching latest code"
git fetch origin
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

echo "==> Installing dependencies"
npm install --no-package-lock
npm --prefix backend install --no-package-lock

if [[ "${RUN_DB_CLEANUP}" == "true" ]]; then
  echo "==> Running sample/test data cleanup (axiscmsdb + demo)"
  npm --prefix backend run cleanup:test-data
fi

if [[ "${RUN_SCHEMA_MIGRATION}" == "true" ]]; then
  echo "==> Running schema migration sync (single canonical sql)"
  npm run migrate:sql
fi

echo "==> Restarting app via PM2"
if pm2 describe "${PM2_NAME}" >/dev/null 2>&1; then
  pm2 reload "${PM2_NAME}" || pm2 restart "${PM2_NAME}"
else
  pm2 start npm --name "${PM2_NAME}" -- run start
fi
pm2 save

echo "==> Health checks"
curl -fsS -I "${WEB_HEALTH_URL}" >/dev/null
echo "    web ok: ${WEB_HEALTH_URL}"

sleep "${API_HEALTH_STARTUP_GRACE_SECONDS}"
for ((i=1; i<=API_HEALTH_RETRIES; i++)); do
  if curl -fsS "${API_HEALTH_URL}" >/dev/null 2>&1; then
    echo "    api ok: ${API_HEALTH_URL}"
    echo "==> Update completed successfully"
    exit 0
  fi
  sleep "${API_HEALTH_RETRY_DELAY_SECONDS}"
done

echo "ERROR: api health check failed after retries (${API_HEALTH_RETRIES})"
pm2 logs "${PM2_NAME}" --lines 120
exit 1
