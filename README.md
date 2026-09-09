# ANUBANDH

A decentralized blockchain platform for identity, access control and digital asset management.

- **SIH problem ID:** SIH26125
- **Organization:** Bharat Electronics Limited (BEL)
- **Domain:** Software / Blockchain and Cybersecurity
- **Developer:** Faizaan Alam, B.Tech CSE (AI and ML)

ANUBANDH is a software-first, permissioned EVM platform. It unifies decentralized identity (DID), NFT-based asset management, smart-contract-enforced RBAC, signed attestations, divergence/quarantine, risk-aware offline verification, and an immutable audit trail.

This prototype does **not** depend on ESP32, PUFs, or any specialized hardware. QR/NFC-style identifiers are treated as the weaker `IdentifierScan` evidence tier. They are never described as unclonable or tamper-proof.

## What is real

- On-chain DID registration, key rotation and revocation
- Admin, Manager, Auditor and User roles enforced in `RoleManager`
- ERC-721 assets with owner, custodian, freshness and quarantine
- EIP-712 signed attestations with nonce replay protection
- Concrete divergence rule, immutable records, quarantine, reconciliation
- Challenge-response login (no passwords)
- Backend Policy Enforcement Point that re-checks on-chain roles
- PostgreSQL event indexer and point-in-time audit reconstruction
- Explainable confidence = evidence weight x freshness decay x divergence penalty
- Installable verifier PWA with IndexedDB, service worker, and genuine offline gating

Demo Anvil keys are public Foundry test keys. They are labeled as demo/seed data in the UI.

## Tech stack

| Layer | Technology |
|---|---|
| Local chain | Anvil (Foundry) |
| Contracts | Solidity 0.8.24, OpenZeppelin v5, Foundry |
| Target production chain | Hyperledger Besu (permissioned EVM). Anvil is the local stand-in, not Besu itself. |
| Identity | `did:ethr:<chainId>:<address>` |
| Backend PEP | Node.js, TypeScript, Express |
| Database | PostgreSQL + Prisma |
| Indexer | Custom ethers.js listener |
| Portal | Next.js, React, TailwindCSS, ethers.js v6 |
| Verifier | Next.js PWA, Service Worker, IndexedDB |
| Tests | Foundry, Vitest, Playwright |

## Repository layout

See `ARCHITECTURE.md` for the three data-flow chains and file-level mapping.

## Setup (from a clean clone)

Requirements: Node.js 20+, Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`), Docker (preferred) or the user-space Postgres fallback, Git.

```bash
cp .env.example .env
npm install
export PATH="$HOME/.foundry/bin:$PATH"
cd contracts && forge install OpenZeppelin/openzeppelin-contracts@v5.2.0 foundry-rs/forge-std --no-commit && cd ..
bash scripts/dev-up.sh
npx prisma generate --schema database/prisma/schema.prisma
npx prisma migrate deploy --schema database/prisma/schema.prisma
npm run demo:setup
bash scripts/run-apps.sh
```

- Portal: http://localhost:3000
- Verifier PWA: http://localhost:3001
- API: http://localhost:4000

If Docker is not available, `scripts/start-postgres.mjs` starts a user-space PostgreSQL binary on port 5432.

## Environment variables

See `.env.example`. All secrets come from the environment. The Anvil keys in `.env.example` are the well-known Foundry demo keys. Do not use them outside local development.

## Testing

```bash
cd contracts && forge test
npm run test -w @anubandh/policy
npm run test -w @anubandh/crypto
npm run test -w backend
# With the stack up:
cd tests/e2e && npx playwright install --with-deps chromium && npx playwright test
bash scripts/check-emdash.sh
```

## Demo

Follow `DEMO.md` for the five-act script (identity/RBAC, asset lifecycle, divergence, offline mode, trust decay and audit).

## Security

See `SECURITY.md`. Contract-level RBAC is the security boundary. The UI hiding a button is not.

## Known limitations

See `KNOWN_LIMITATIONS.md`.

## License

MIT. See `LICENSE`.
