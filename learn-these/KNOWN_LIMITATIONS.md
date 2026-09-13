# Known limitations

This file exists even if short. A documented gap is acceptable; a disguised fake is not.

## Prototype key custody

The PEP holds well-known Anvil private keys so that `msg.sender` equals the authenticated DID controller. Production must not store user private keys on the server. Wallet-signed transactions (or a KMS) should be relayed after the PEP check.

## Local chain is Anvil, not Besu

Contracts are EVM-portable. Node permissioning, QBFT, and TLS for Hyperledger Besu are not configured in this repository. See `ARCHITECTURE.md` for the mapping.

## Credentials are VC-shaped, not a full VC-JWT stack

Signature verification is real (`packages/crypto`). Selective disclosure, DID resolution beyond `did:ethr`, and status-list registries are out of SIH scope.

## Identifier scans are software-only

There is no camera/NFC hardware integration. The IdentifierScan tier is a labeled weaker evidence type. The UI never claims a QR/NFC identifier is unclonable.

## Indexer is a polling listener

It is not Ponder. It can lag by `INDEXER_POLL_MS`. Reorg handling is minimal (Anvil does not reorg in the demo).

## Postgres without Docker

If Docker is unavailable, `scripts/start-postgres.mjs` tries a user-space binary. This is a development fallback, not a production database.

## PWA "age snapshot" demo helper

The verifier includes an explicit **Age snapshot (demo)** button so judges can exceed the 15-minute high-risk bound without waiting. The gating logic still uses the cached timestamp and `packages/policy`. Playwright also uses `setOffline(true)`.

## Scale, IAM, ERP, ZK

Enterprise SCIM, BEL ERP integration, cross-org interoperability, zero-knowledge disclosure, and large-scale deployment are explicitly out of scope (synopsis section 14).
