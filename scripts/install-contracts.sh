#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.foundry/bin:$PATH"
cd "$(dirname "$0")/../contracts"
forge install OpenZeppelin/openzeppelin-contracts@v5.2.0 foundry-rs/forge-std --no-commit
echo "Contract libraries installed."
