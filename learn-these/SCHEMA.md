# Database schema

PostgreSQL is an off-chain index, not a second source of truth. The chain remains authoritative.

Generated from `database/prisma/schema.prisma`.

- `ChainEvent`: append-only logs. Point-in-time queries filter `timestamp <= T`.
- `DidRecord`, `RoleGrant`, `Asset`, `Attestation`, `Divergence`: derived current-state tables updated by the indexer.
- `LoginNonce`: single-use login challenges.
- `Credential`: off-chain VC-shaped documents.
- `OfflineDecision`: signed local decisions and reconciliation outcomes.
- `IndexerCursor`: last processed block.
- `StoredDocument`: metadata for filesystem blobs (hashes only on-chain).
