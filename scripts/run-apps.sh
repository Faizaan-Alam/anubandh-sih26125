#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
mkdir -p logs
npm run dev -w backend > logs/backend.log 2>&1 &
echo $! > logs/backend.pid
npm run dev -w indexer > logs/indexer.log 2>&1 &
echo $! > logs/indexer.pid
npm run dev -w @anubandh/web > logs/web.log 2>&1 &
echo $! > logs/web.pid
npm run dev -w @anubandh/verifier-pwa > logs/pwa.log 2>&1 &
echo $! > logs/pwa.pid
echo "Apps started. Logs in ./logs"
echo "Portal:    http://localhost:3000"
echo "Verifier:  http://localhost:3001"
echo "API:       http://localhost:4000"
