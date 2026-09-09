#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
for name in anvil postgres backend indexer web pwa; do
  if [[ -f "logs/${name}.pid" ]]; then
    pid="$(cat "logs/${name}.pid")"
    kill "$pid" 2>/dev/null || true
    rm -f "logs/${name}.pid"
  fi
done
docker compose down 2>/dev/null || true
echo "Stopped local processes."
