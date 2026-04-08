#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -f "${SCRIPT_DIR}/deploy/al2023/al2023_update.sh" ]]; then
  echo "ERROR: missing deploy script: ${SCRIPT_DIR}/deploy/al2023/al2023_update.sh"
  exit 1
fi

bash "${SCRIPT_DIR}/deploy/al2023/al2023_update.sh" "${1:-main}"
