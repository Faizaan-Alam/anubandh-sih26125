#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.foundry/bin:$PATH"
cd "$root"
if [[ ! -f .env ]]; then
  cp .env.example .env
fi
set -a
# shellcheck disable=SC1091
source .env
set +a

mkdir -p logs
echo "Starting PostgreSQL..."
node scripts/start-postgres.mjs > logs/postgres.log 2>&1 &
echo $! > logs/postgres.pid
sleep 3

echo "Starting Anvil..."
anvil --chain-id "${CHAIN_ID:-31337}" --block-time 1 > logs/anvil.log 2>&1 &
echo $! > logs/anvil.pid
sleep 1

echo "Deploying contracts..."
bash scripts/deploy.sh anvil

echo "Migrating database..."
npx prisma migrate deploy --schema database/prisma/schema.prisma

echo "Stack base is up. Start backend, indexer, web and PWA in separate terminals:"
echo "  npm run dev -w backend"
echo "  npm run dev -w indexer"
echo "  npm run dev -w @anubandh/web"
echo "  npm run dev -w @anubandh/verifier-pwa"
echo "Or: bash scripts/run-apps.sh"
