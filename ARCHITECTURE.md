# ANUBANDH architecture

Authoritative product spec: `docs/Anubandh_New_Synopsis_No_ESP32.docx` (software-first, no ESP32). This document describes the implementation.

## Synopsis resolutions

The synopsis allows Anvil/Hardhat and Node/Express or Python. This repo uses **Foundry + Anvil only** (single toolchain) and **Node.js/Express** as required by the execution prompt. Off-chain documents use a filesystem object store (`packages/storage`) behind an interface that can later be swapped for IPFS or S3. Only hashes go on-chain.

Local development uses Anvil. Production target is **Hyperledger Besu** (permissioned EVM). Anvil is not Besu. Mapping:

| Concern | Anvil (dev) | Besu (target) |
|---|---|---|
| EVM | Ethereum-compatible | Same bytecode |
| Consensus | Instant/local | QBFT/IBFT in a permissioned network |
| Accounts | Well-known demo keys | Validator and org keys via Besu account management |
| Chain ID | 31337 | Organization-assigned |
| JSON-RPC | `http://127.0.0.1:8545` | Besu RPC / TLS |
| Permissioning | None (open Anvil) | Node and account permissioning on Besu |
| Contracts | Identical Solidity 0.8.x | Same deploy scripts, different RPC/keys |

Redeploy with `ANVIL_RPC_URL` pointed at Besu and `ANUBANDH_NETWORK=besu`. Consumers read `packages/shared/deployments/<network>.json` only.

## Three chains (acceptance)

### 1. Request flow

Frontend (`apps/web`) -> Backend PEP (`backend/src/app.ts`, `backend/src/auth.ts`, `backend/src/routes/*`) -> Smart contracts (`contracts/src/*`) -> Anvil -> Indexer (`indexer/src/index.ts`) -> PostgreSQL (`database/prisma/schema.prisma`) -> Audit dashboard (`apps/web/src/app/(portal)/audit/page.tsx`).

Privileged writes never go frontend-to-chain. The PEP checks the session JWT **and** `RoleManager.hasActiveRole` (`backend/src/chain.ts` `onChainRole`, `backend/src/auth.ts` `requireRoles`) before submitting a transaction with the authenticated demo signer (`signerFor`).

Read-only displays may call the PEP, which in turn reads chain state.

### 2. Identity / authorization flow

DID (`DIDRegistry.sol` `register`) -> optional W3C-shaped credential (`backend/src/routes/credentials.ts`, `packages/crypto/src/credential.ts`) -> Role (`RoleManager.sol` `grantRole` / `grantRoleWithExpiry`) -> PEP decision (`requireRoles`) -> asset operation (`AssetNFT.sol`) -> event -> indexer `ChainEvent` row.

There is no floating role in the JWT. `backend/src/pep.test.ts` asserts the token does not embed a role claim.

### 3. Asset trust flow

Asset mint (`AssetNFT.mint`) -> NFT owner/custodian -> Attestation (`AttestationRegistry.submitAttestation`) -> confidence (`packages/policy/src/confidence.ts`, shown on `apps/web/src/app/(portal)/assets/[tokenId]/page.tsx`) -> divergence (`DivergenceRegistry.onAttestation`) -> quarantine (`AssetNFT.setQuarantine`) -> reconciliation (`proposeReconciliation` / `confirmReconciliation`) -> audit history (`ChainEvent`).

Confidence is never a bare number. The dashboard shows evidence tier, age vs window, and divergence penalty.

## Contracts

| Contract | File | Notes |
|---|---|---|
| RoleManager | `contracts/src/RoleManager.sol` | OZ AccessControl; `hasRole` respects expiry |
| DIDRegistry | `contracts/src/DIDRegistry.sol` | `did:ethr:<chainId>:<address>` |
| AssetNFT | `contracts/src/AssetNFT.sol` | ERC-721, approvals disabled, quarantine blocks `_update` |
| AttestationRegistry | `contracts/src/AttestationRegistry.sol` | EIP-712, nonce map, evidence tiers 0/1 |
| DivergenceRegistry | `contracts/src/DivergenceRegistry.sol` | Concrete conflict rule, no delete |

**Separation of duties:** releasing a **high-value** quarantined asset requires a Manager (or Admin) `proposeReconciliation` and a **different** Admin `confirmReconciliation`. Low-value assets finalize on the proposal. Documented in `DivergenceRegistry` NatSpec.

**Divergence rule:** for the same token, two attestations both inside the asset's freshness window that differ in `custodian`, `locationId`, or `condition` create a `DivergenceRecord` and set quarantine.

## Confidence model

```
Confidence = Evidence Weight x Freshness Decay x Divergence Penalty
```

- SignedInspection weight = 1.0
- IdentifierScan weight = 0.4 (QR/NFC-style; weaker by design)
- Linear decay from 1.0 to floor 0.2 across the freshness window
- Open divergence penalty = 0.1; otherwise 1.0
- Displayed as 0..100

Implemented in `packages/policy/src/confidence.ts` and tested in `packages/policy/src/confidence.test.ts`.

## Offline verifier

`apps/verifier-pwa` is an installable PWA (`public/manifest.json`, `public/sw.js`). Before offline it caches a policy snapshot, DID/role, and credentials in IndexedDB (`apps/verifier-pwa/src/lib/idb.ts`). While offline, `packages/policy/src/risk.ts` `evaluateOfflineOperation` allows low-risk actions and denies high-risk actions when the snapshot is older than 15 minutes. Decisions are signed locally (`packages/crypto/src/offline.ts`) and reconciled on `/offline/reconcile`.

Playwright uses `browserContext.setOffline(true)` in `tests/e2e/specs/offline.spec.ts`.

## Event indexing

`indexer/src/index.ts` polls contract logs, writes append-only `ChainEvent` rows, and updates derived tables. Point-in-time reconstruction (`backend/src/routes/audit.ts`) filters `ChainEvent` where `timestamp <= T`.

## Deployment artifacts

`contracts/script/Deploy.s.sol` writes addresses to `packages/shared/deployments/<network>.json`. `scripts/merge-abis.mjs` adds ABIs. Backend, indexer, and (via `/ready`) the frontend all consume that file. No separately hardcoded contract addresses.

## Structural notes vs the prompt's tree

- Playwright lives in `tests/e2e` (still under `tests/`).
- Prisma schema lives in `database/prisma` as specified.
- `packages/crypto` and `packages/policy` are used by backend, portal and PWA.
- Postgres: `docker-compose.yml` is the primary path. `scripts/start-postgres.mjs` is a documented fallback when Docker is unavailable on the developer machine.
