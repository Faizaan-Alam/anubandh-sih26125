# Security model

## Threat model (prototype)

In scope for this prototype:

- Unauthorized role grants, mints, transfers
- Attestation replay and signature forgery
- Transfer of a disputed (quarantined) asset
- Stale offline high-risk actions
- Login nonce reuse
- Secrets in git or the frontend bundle

Out of scope (see `KNOWN_LIMITATIONS.md`): production key custody, Besu node permissioning, DDoS at internet scale, supply-chain of npm beyond a documented audit, physical anti-counterfeit.

## Trust assumptions

1. **Cryptographic proof.** A valid secp256k1 signature over a specific payload proves that the holder of that key authorized that payload, at that nonce/timestamp. Nothing more.
2. **Human / organizational attestation.** A signed inspection is a statement by a role-bearing identity. The chain records it. The platform does not independently verify physical reality.
3. **Physical-world truth.** The platform never has direct access to the physical asset. Confidence approximates it from (1) and (2) plus time.

QR/NFC identifiers are **not** unclonable and **not** tamper-proof. They are `IdentifierScan` (weight 0.4).

## Contract RBAC

`RoleManager.hasRole` (overridden) returns false after expiry. `AssetNFT`, `AttestationRegistry` and `DivergenceRegistry` call `hasActiveRole`. Negative Foundry tests call privileged functions from an unauthorized account and expect a revert (`contracts/test/RoleManager.t.sol` `test_directUnauthorizedCallReverts`, `contracts/test/AssetNFT.t.sol` `test_strangerDirectMintReverts`).

## Replay protection

- Login: single-use nonce in PostgreSQL with TTL (`backend/src/routes/auth.ts`).
- Attestations: `nonceUsed` mapping (`AttestationRegistry.sol`).
- Offline decisions: unique nonce stored in `OfflineDecision`.

## Credentials

VC-shaped JSON is signed by the issuer key (`packages/crypto/src/credential.ts`). Expiry is checked with `credentialIsExpired`. Revocation is an off-chain flag plus DID revocation on-chain. A credential never grants a role by itself; `RoleManager` does.

## Offline risk

High-risk operations (transfer, role change, reconciliation, mint) require a snapshot no older than 15 minutes. Low-risk identifier scans may proceed against a snapshot up to 7 days old. On reconnect, `/offline/reconcile` re-checks DID/role state.

## Quarantine

Conflicting observations inside the freshness window freeze transfers via `AssetNFT._update`. High-value release requires two distinct actors (Manager proposal, Admin confirm).

## Key management (prototype)

Local Anvil keys are loaded from environment variables into the PEP so that `msg.sender` is the user's controller. This is a demo convenience. Production should use wallet-signed transactions relayed by the PEP, or a KMS.

## Documents

Raw documents stay in `packages/storage` (filesystem). Only a hash is passed to `AssetNFT.mint`.

## Secrets

- `.env` is gitignored
- `scripts/check-secrets.sh` refuses to commit `.env` and key files
- Frontend demo keys are the public Anvil keys, labeled as demo

## Dependency audit

Run before delivery:

```bash
npm audit --omit=dev
cd contracts && forge --version
```

Record findings below after the audit is actually run.

### Audit results (2026-09-09, `npm audit`)

Addressed:

- Next.js bumped from 14.2.15 (known RCE advisories) to 14.2.35, the latest 14.x patch line.

Accepted residual risk (prototype, not a public internet deployment):

- Remaining Next.js 14 advisories that `npm audit` still reports require a breaking jump to Next 16. This app does not use Server Actions, Edge runtime, rewrite hostnames, or AVIF image optimization on Windows, which is where those advisories concentrate.
- `postcss` high findings come in via Next.js's nested dependency. Same constraint.
- `prisma` / `@prisma/config` high findings: staying on Prisma 6 to match the generated client used by the indexer and PEP. A major Prisma upgrade is out of prototype scope.
- `express` 4 / `qs` moderate DoS findings: accepted for local demo; production should pin a patched Express 5 or qs after regression testing.
- `vitest` / `vite` / `esbuild` moderate/critical: dev-only test tooling, not shipped in the portal bundle.

`forge` itself has no package-audit equivalent beyond pinning OpenZeppelin 5.2.0.
