# ANUBANDH contracts

Foundry project. Solidity 0.8.24, OpenZeppelin 5.2.0.

```bash
forge install OpenZeppelin/openzeppelin-contracts@v5.2.0 foundry-rs/forge-std --no-commit
forge test
forge script script/Deploy.s.sol:Deploy --rpc-url http://127.0.0.1:8545 --broadcast --private-key $DEPLOYER_PRIVATE_KEY
```

Deploy writes `../packages/shared/deployments/<network>.json`. Run `node ../scripts/merge-abis.mjs` after that (or `bash ../scripts/deploy.sh`).
