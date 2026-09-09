#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.foundry/bin:$PATH"
network="${1:-anvil}"
cd "$root"
if [[ ! -f .env ]]; then
  cp .env.example .env
fi
set -a
# shellcheck disable=SC1091
source .env
set +a
export ANUBANDH_NETWORK="$network"
mkdir -p packages/shared/deployments
cd "$root/contracts"
forge script script/Deploy.s.sol:Deploy --rpc-url "${ANVIL_RPC_URL:-http://127.0.0.1:8545}" --broadcast --private-key "$DEPLOYER_PRIVATE_KEY"
cd "$root"
node scripts/merge-abis.mjs "$network"
echo "Deployed and wrote packages/shared/deployments/${network}.json"
