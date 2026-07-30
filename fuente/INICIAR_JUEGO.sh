#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Necesitas instalar Node.js 22 o superior."
  exit 1
fi

if [[ ! -d node_modules ]]; then
  npm install
fi

npm run dev
