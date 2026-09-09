# Understand ANUBANDH

Read this file first. It explains the project in plain language: what it is, why each piece exists, how a request actually moves, and what you can click in the demo.

Other docs go deeper:

- `README.md`: setup and stack
- `ARCHITECTURE.md`: file-level design
- `DEMO.md`: five-act judge script
- `SECURITY.md`: what cryptography actually proves
- `KNOWN_LIMITATIONS.md`: honest gaps

---

## 1. The problem in one paragraph

BEL (and similar organizations) track people and equipment with centralized systems. Those systems are a single point of failure: if the database is tampered with, history can be rewritten. SIH problem SIH26125 asks for a blockchain platform where:

1. Each person has a cryptographically verifiable identity (a DID).
2. Each asset is a unique on-chain token (an NFT).
3. Roles (Admin, Manager, Auditor, User) are enforced by smart contracts, not by hiding a button in the UI.
4. Important actions leave an immutable event trail that an auditor can replay later.

ANUBANDH also adds a trust layer the minimum SIH statement does not require: observations can go stale, two observers can disagree, a disputed asset can be frozen, and a field verifier can keep working for a while without network.

This prototype is **software-first**. There is no ESP32, no PUF chip, and no claim that a QR code is unclonable.

---

## 2. Picture of the running system

```
  You (browser)
       |
       |  login + privileged actions
       v
  Portal  http://localhost:3000          Verifier PWA  http://localhost:3001
  apps/web                               apps/verifier-pwa  (works offline)
       |
       |  HTTP JSON
       v
  Backend PEP  http://localhost:4000
  backend/     "Policy Enforcement Point"
       |  checks session token
       |  re-reads role from the chain
       |  then sends a real transaction
       v
  Smart contracts on Anvil  http://127.0.0.1:8545
  contracts/src/
       |
       |  events (logs)
       v
  Indexer  indexer/
       |
       v
  PostgreSQL  (fast search, not the source of truth)
       |
       v
  Audit page in the portal
```

Remember the split of truth:

- **Blockchain** is authoritative. If Postgres and the chain disagree, the chain wins.
- **Postgres** is an index so auditors can search and reconstruct history quickly.
- **The UI** is convenience. Hiding a Mint button does not secure anything. The contract must still revert if a User calls mint.

---

## 3. Glossary (the words on the screens)

Hover labels in the UI match these meanings.

| Word | What it actually means here |
|---|---|
| **DID** | Decentralized identifier. Format: `did:ethr:31337:0x...`. The address at the end is the controlling key. |
| **Controller** | The Ethereum address currently allowed to act as that DID. Can be rotated. |
| **Role** | Admin, Manager, Auditor, or User, stored in `RoleManager` on-chain, with optional expiry. |
| **PEP** | Policy Enforcement Point. The Express backend. It checks policy, then talks to the chain. |
| **Asset / NFT** | One ERC-721 token = one registered item (radio, document, spare, ...). |
| **Owner** | Who the token says owns it. |
| **Custodian** | Who currently holds it. Can differ from owner. |
| **Attestation** | A signed observation: "I saw this asset at this place, in this condition." |
| **Evidence tier** | How strong that observation is. `SignedInspection` is strong (weight 1.0). `IdentifierScan` is a QR/NFC-style scan (weight 0.4), weaker, not unclonable. |
| **Freshness** | How recently the last observation was. Old observations decay. |
| **Confidence** | A 0-100 score: evidence weight x freshness decay x divergence penalty. Always explainable. |
| **Divergence** | Two recent observations that disagree on custodian, location, or condition. |
| **Quarantine** | Frozen state. Transfers and custody changes revert until reconciliation. |
| **Reconciliation** | An authorized decision that accepts one final state. The original conflict is **never deleted**. |
| **Risk tier** | Offline: low-risk (view / scan) vs high-risk (transfer, role change, reconcile). |
| **Snapshot** | Cached keys, role, credentials, and policy the PWA stores before going offline. |
| **Audit trail** | Indexed contract events. Point-in-time means "what was true at time T", computed from events up to T. |

Three kinds of claim, do not mix them:

1. **Cryptographic proof:** this key signed this payload. Nothing more.
2. **Human attestation:** a person/role *says* the radio is in Depot A.
3. **Physical-world truth:** where the radio actually is. The platform never sees that directly.

---

## 4. The four roles

| Role | Can do | Cannot do |
|---|---|---|
| **Admin** | Register/revoke DIDs, grant/revoke roles, mint assets, confirm high-value reconciliation | Nothing privileged is blocked; still leaves an audit trail |
| **Manager** | Allocate custody, transfer ownership/custody, propose reconciliation, attest | Cannot mint, cannot grant roles, cannot confirm their own high-value proposal |
| **Auditor** | Read history, point-in-time reconstruction | Cannot mutate assets or roles |
| **User** | Attest on assigned work, log in | Cannot mint or transfer |

If a User clicks Mint, the backend returns 403 after reading `RoleManager`. If someone bypasses the UI and calls `AssetNFT.mint` from a non-Admin key, the **contract reverts**. That second check is the real security boundary.

---

## 5. Walk through one story

Imagine a radio set `SEED-RADIO-001`.

1. **Admin logs in.** The browser signs a one-time challenge. The backend recovers the signer, checks `DIDRegistry` that this key still controls the DID, reads `RoleManager` (Admin), and issues a short session token. The token does **not** store a trusted role. Every privileged call re-reads the chain.

2. **Admin mints the asset.** `AssetNFT.mint` creates token `#1`. Owner and custodian start as User. Only a hash of any metadata document goes on-chain. The file itself stays in local object storage.

3. **Manager allocates custody** to a depot holder if needed.

4. **User attests:** SignedInspection, location `BEL-depot-A`, condition Good. That is a real EIP-712 signature and a real transaction.

5. **User 2 attests something incompatible** (different location or Damaged) inside the freshness window. `DivergenceRegistry` writes an immutable record and sets quarantine. Confidence collapses (divergence penalty 0.1, score around 10).

6. **Manager tries to transfer.** The contract reverts. The asset cannot move while disputed.

7. **Manager proposes reconciliation** (accepted location Depot A). For a normal asset this clears quarantine immediately. For a **high-value** asset, a *different* Admin must confirm (separation of duties). The old divergence row stays forever.

8. **Auditor opens Audit Trail**, picks a datetime, and reconstructs owner / custodian / quarantine as of that moment from indexed events, not from the latest row only.

9. **Field verifier (PWA)** caches a snapshot while online. Offline, a low-risk identifier scan is allowed. A high-risk transfer against a snapshot older than 15 minutes is denied, signed locally, queued, and reconciled when the network returns.

That story is Acts 1-5 in `DEMO.md`.

---

## 6. Smart contracts (the five on-chain programs)

All live in `contracts/src/`. Tests live in `contracts/test/`.

| Contract | Job |
|---|---|
| `DIDRegistry.sol` | Register DID, rotate controller key, revoke. Rejects duplicates and unauthorized callers. |
| `RoleManager.sol` | Admin / Manager / Auditor / User. Grants can expire. `hasRole` is false after expiry even if nobody revoked it. |
| `AssetNFT.sol` | ERC-721 asset. Mint = Admin only. Transfer/allocate = Admin or Manager. Quarantine blocks movement. Marketplace-style `approve` is disabled. |
| `AttestationRegistry.sol` | Accepts a signed observation. Rejects bad signatures, reused nonces, revoked DIDs, and observers without an allowed role. |
| `DivergenceRegistry.sol` | Compares new attestation against recent ones. Conflict => record + quarantine. No delete function exists. |

Deploy script: `contracts/script/Deploy.s.sol`. It writes addresses and ABIs to `packages/shared/deployments/anvil.json`. Backend, indexer, and portal all read **that one file**. Never hardcode addresses in three places.

Local chain: **Anvil**. Production *target* is Hyperledger Besu. Same bytecode, different network. Anvil is not Besu.

---

## 7. Confidence formula

```
score (0-100) = EvidenceWeight x FreshnessDecay x DivergencePenalty x 100
```

- SignedInspection weight = 1.0
- IdentifierScan weight = 0.4
- Freshness decays linearly from 1.0 (just attested) to 0.2 once age >= the asset's freshness window
- Open divergence: penalty = 0.1 (dominates the score)
- No open divergence: penalty = 1.0

Code: `packages/policy/src/confidence.ts`. The asset page must show the breakdown, not a naked number. If you cannot explain a score from specific attestations and elapsed time, the number is fake. This implementation is not fake.

---

## 8. Login (no passwords)

1. Frontend asks `POST /auth/challenge` with an address.
2. Backend stores a single-use nonce with a short TTL.
3. The local key signs: DID + address + nonce + timestamp.
4. Backend recovers the signer, checks it matches the **current** DID controller on-chain, marks the nonce used, reads the role fresh from `RoleManager`, returns a JWT.
5. Privileged routes: valid JWT **and** a live `hasActiveRole` check.

Demo keys are the public Anvil accounts 0-4 (Admin, Manager, Auditor, User, User 2). They are labeled **demo** / **seed** in the UI. Do not use them outside local dev.

---

## 9. Folder map

```
apps/web                 Portal you open at :3000
apps/verifier-pwa        Offline verifier at :3001
backend                  Express PEP at :4000
contracts                Solidity + Foundry tests
indexer                  Chain events -> Postgres
database                 Prisma schema and migrations
packages/shared          Types, Zod API schemas, deployments loader
packages/crypto          Login / attestation / VC / offline signatures
packages/policy          Confidence + offline risk tiers (shared by backend and PWA)
packages/storage         Local files; only hashes go on-chain
scripts                  start/stop, deploy, demo-setup, smokes
tests/e2e                Playwright (including real browser offline)
```

---

## 10. How to run it

If the stack is already up on this machine, just open:

- Portal: http://localhost:3000
- Verifier: http://localhost:3001
- API health: http://localhost:4000/health

From a clean start:

```bash
cd /home/faizaan-alam/sih/sih_project
cp -n .env.example .env
npm install
export PATH="$HOME/.foundry/bin:$PATH"
bash scripts/install-contracts.sh
bash scripts/dev-up.sh
npx prisma generate --schema database/prisma/schema.prisma
npx prisma migrate deploy --schema database/prisma/schema.prisma
npm run demo:setup
bash scripts/run-apps.sh
```

Stop:

```bash
bash scripts/dev-down.sh
```

What each command does:

| Command | Meaning |
|---|---|
| `dev-up.sh` | Postgres + Anvil + contract deploy |
| `demo:setup` | Registers demo DIDs, grants roles, mints `SEED-RADIO-001` |
| `run-apps.sh` | Backend, indexer, portal, PWA |

---

## 11. What to click (quick tour)

1. http://localhost:3000 , choose **Admin**, Sign challenge.
2. **Assets**: you should see seed token `#1`. Open it. Read the confidence breakdown.
3. Sign out, login as **User**. Try **Mint**. You should see an authorization failure naming the on-chain role. That is the PEP. The contract would also revert.
4. **Attestations**: submit a SignedInspection for token 1.
5. Sign out, login as **User 2**, submit a conflicting location/condition. **Divergence** and **Quarantined** should appear. Manager transfer should fail.
6. Login as **Auditor**, **Audit Trail**, reconstruct at "now" and at an earlier time.
7. http://localhost:3001 : Login and cache snapshot. Use browser airplane mode (or Playwright). Low-risk scan allowed. Age snapshot, then high-risk transfer denied.

---

## 12. What is real vs what is demo

**Real**

- On-chain transactions (hashes you can look up on Anvil)
- Contract reverts for unauthorized mint/transfer
- Signature checks and nonce replay protection
- Divergence, quarantine, preserved history
- Indexer writing Postgres from events
- PWA service worker + IndexedDB + `setOffline(true)` tests

**Demo / labeled seed**

- Anvil private keys in the login dropdown
- Asset id `SEED-RADIO-001`
- "Age snapshot (demo)" button so you need not wait 15 minutes

**Not in this prototype**

- ESP32 / PUF hardware
- BEL's real ERP
- Hyperledger Besu cluster
- Storing user keys in production (the PEP holds Anvil keys only so `msg.sender` is the user during the demo)

---

## 13. If you are presenting this (SIH)

Lead with: identities, assets, and permissions are on-chain; the UI is not the security boundary; confidence models *freshness and disagreement*, not "the NFT exists therefore the radio is here"; offline mode is risk-tiered and honest about stale cache.

Then run `DEMO.md` Acts 1 to 5 in order.

---

## 14. If something breaks

| Symptom | Likely cause |
|---|---|
| Login fails | Anvil down, or `demo:setup` not run (DID missing) |
| Mint 403 | You are not Admin; that is correct |
| Transfer reverts | Asset is quarantined |
| Empty audit | Indexer not running, or wait ~2s after a tx |
| Port in use | `bash scripts/dev-down.sh` then start again |
| Postgres errors | `scripts/start-postgres.mjs` / Docker; `DATABASE_URL` in `.env` |

Contract tests (no UI needed):

```bash
export PATH="$HOME/.foundry/bin:$PATH"
cd contracts && forge test
```
