# ENGINEER.md

How ANUBANDH was built, in what order, with which tools, and how work flows through the system.

If you want a non-engineer tour, read `UNDERSTANDING.md` first. This file is the engineering story. All of these files sit in `learn-these/`.

- Product spec: `Anubandh_New_Synopsis_No_ESP32.docx`
- File-level architecture: `ARCHITECTURE.md`
- Run locally: `../README.md`
- Click-through demo: `DEMO.md`
- Vercel: `DEPLOY.md`
- Live portal: https://anubandh-web.vercel.app/ (Forest is the default DaisyUI theme)

---

## 1. What we were building

**ANUBANDH** is a software-first, permissioned EVM platform for:

1. Decentralized identity (DID)
2. NFT-based asset records
3. Smart-contract RBAC (Admin, Manager, Auditor, User)
4. Signed observations (attestations) with evidence tiers
5. Divergence, quarantine, reconciliation
6. Risk-aware offline verification
7. An immutable audit trail

SIH problem **SIH26125**, organization **Bharat Electronics Limited**. Explicitly no ESP32, no PUFs, no hardware root of trust. QR/NFC-style identifiers are the weaker `IdentifierScan` tier, never called unclonable.

The security rule that drove almost every design choice:

> The UI is not the security boundary. Contracts must revert unauthorized callers. The backend PEP re-checks `RoleManager` on every privileged request.

---

## 2. How the project was made

The repo started empty except the revised synopsis Word file. There was no prior code to resume.

Build order followed the SIH execution phases, contracts first, then policy, then apps. That is not cosmetic. If the chain does not enforce RBAC, a pretty dashboard is fake.

### Method

1. Extract the synopsis. Treat it as the spec. Stack choices that the synopsis left open were locked: Foundry + Anvil, Node/Express, Prisma, Next.js, custom indexer.
2. Scaffold the monorepo (`npm` workspaces) so backend, portal, PWA, and indexer share types.
3. Write Solidity with OpenZeppelin, then Foundry tests (including negative tests that call contracts as a stranger).
4. Shared packages: DID helpers, EIP-712 attestation signing, confidence formula, offline risk policy, filesystem object store.
5. Express PEP: challenge-response login, JWT that does **not** embed a trusted role, privileged routes that re-read the chain.
6. Prisma schema + indexer that turns contract logs into Postgres rows.
7. Next.js portal and a real PWA (manifest + service worker + IndexedDB).
8. Playwright against a live stack, including `browserContext.setOffline(true)`.
9. Docs, then UI polish (guided copy, then DaisyUI themes), then a Vercel guide.

Demo Anvil keys are public Foundry test keys. They are labeled demo/seed. They are not production secrets.

---

## 3. Entire timeline

Dates are git history on `main` (`https://github.com/Faizaan-Alam/anubandh-sih26125`).

### 2026-09-09 : core system in one day

| Commit | What landed |
|---|---|
| `750e175` | Monorepo scaffold: `.gitignore`, `.env.example`, Docker Compose, GitHub Actions, install/dev scripts |
| `858006e` | Five contracts + Foundry unit, fuzz, and invariant tests |
| `b22687a` | PEP backend, indexer, Prisma, `packages/shared`, `packages/crypto`, `packages/policy`, `packages/storage` |
| `4484466` | Next.js portal and offline verifier PWA |
| `f20d070` | README, ARCHITECTURE, DEMO, SECURITY, KNOWN_LIMITATIONS, Playwright |
| `045a1e0` | Auditor point-in-time smoke script |
| `b5647b3` | Audit event filter: JSON path was too strict, filter in process |
| `d8bbd74` | Serialize `ChainEvent.blockNumber` (Postgres BigInt cannot JSON.stringify) |

Same-day engineering notes that are not obvious from commit titles:

- Foundry was installed on the machine. Docker was not available, so local Postgres uses `embedded-postgres` as a fallback. `docker-compose.yml` still exists for people who have Docker.
- OpenZeppelin v5 `ownerOf` collision with `IAssetNFT` required an explicit override.
- `AttestationRegistry.submitAttestation` needed `via_ir` (stack too deep).
- Two Foundry tests failed because `vm.expectRevert` was consumed by helper `view` calls. Signing was moved before `expectRevert`.
- Invariant `quarantinedNeverTransferred` failed because ghost state remembered the *first* quarantine owner after a later unfreeze + transfer + re-quarantine. Handler now snapshots owner only when quarantine *becomes* true.
- The well-known Anvil account-2 private key circulating online did not match this Foundry mnemonic. Auditor key was corrected to the mnemonic-derived key.
- Indexer first wrote empty `{}` payloads because ethers v6 `Result` numeric keys hid named args. Parsing switched to `parsed.fragment.inputs`.

### 2026-09-10 : explain the product

| Commit | What landed |
|---|---|
| `a1c3561` | `UNDERSTANDING.md` plus a pointer from README |

### 2026-09-14 : UI, themes, deploy docs

| Commit | What landed |
|---|---|
| `2e9f1a4` | Clearer copy, confidence meters, help panels, light motion (still enterprise, no glass) |
| `1cd78dd` | DaisyUI, 12 themes, restyled portal and PWA |
| `feb3a04` | `DEPLOY.md` and `vercel.json` for the two Next apps |

UI work kept Playwright strings load-bearing (`Sign challenge and enter`, `Operations overview`, `Mint asset NFT`, offline test ids). Theme dropdown required `data-testid="demo-signer"` so the role `<select>` is not confused with the theme `<select>`.

---

## 4. Tech stack (what was actually used)

| Layer | Technology | Why |
|---|---|---|
| Local chain | Anvil (Foundry 1.8) | One toolchain. Not Hardhat. Instant blocks for demo. |
| Contracts | Solidity 0.8.24, OpenZeppelin 5.2 | ERC-721, AccessControl, EIP-712, ReentrancyGuard already exist and are safer than hand-rolled copies |
| Tests (chain) | Foundry: unit, fuzz, invariants | Negative tests call contracts directly |
| Production target | Hyperledger Besu (documented only) | Same bytecode, different network. Anvil is not Besu. |
| Identity | `did:ethr:<chainId>:<address>` | Controller key is on-chain verifiable |
| Credentials | VC-shaped JSON + secp256k1 message signatures | Full VC-JWT stack was out of scope. Signatures are real. |
| PEP | Node 20, TypeScript, Express | Single backend. No FastAPI twin. |
| Auth | Challenge nonce in Postgres, `personal_sign`, JWT | JWT carries DID + address only. Role is re-read from chain. |
| ORM / DB | Prisma 6 + PostgreSQL 16 | Off-chain index, not a second source of truth |
| Indexer | Custom `ethers` v6 poller | Writes append-only `ChainEvent` plus derived tables |
| Object store | Local filesystem (`packages/storage`) | Only the hash goes on-chain |
| Shared libs | `packages/shared`, `crypto`, `policy` | One confidence formula and one risk table for PEP and PWA |
| Portal | Next.js 14.2 App Router, React 18, Tailwind 3, DaisyUI 4, ethers v6 | Themed enterprise UI |
| Verifier | Same Next stack + manifest + `sw.js` + IndexedDB | Real installable PWA |
| App tests | Vitest (policy, crypto, backend schemas), Playwright | Playwright includes genuine offline emulation |
| Dev orchestration | bash scripts, optional Docker Compose, embedded-postgres fallback | `dev-up` / `run-apps` / `dev-down` |
| CI | GitHub Actions: `forge test` + Vitest + em-dash grep + Postgres service | |
| Hosting (frontend) | Vercel possible for Next apps only | API, indexer, chain stay off Vercel |

### Contracts in `contracts/src/`

| Contract | Responsibility |
|---|---|
| `RoleManager` | Admin / Manager / Auditor / User. `hasRole` respects expiry |
| `DIDRegistry` | Register, rotate controller, revoke |
| `AssetNFT` | Permissioned ERC-721. Approvals disabled. Quarantine blocks `_update` |
| `AttestationRegistry` | EIP-712 observations, nonce replay protection, evidence tiers 0/1 |
| `DivergenceRegistry` | Conflict rule, quarantine, SoD for high-value unfreeze. No delete |

Deploy script `contracts/script/Deploy.s.sol` writes addresses to `packages/shared/deployments/<network>.json`. `scripts/merge-abis.mjs` adds ABIs. Backend, indexer, and `/ready` all read **that one file**.

---

## 5. Repository map

```
apps/web                 Next.js portal (:3000)
apps/verifier-pwa        Offline verifier PWA (:3001)
backend                  Express PEP (:4000)
contracts                Solidity + Foundry
indexer                  Log poller -> Postgres
database/prisma          Schema and migrations
packages/shared          Types, Zod, deployments loader
packages/crypto          Login, attestation, VC, offline signatures
packages/policy          Confidence + offline risk gates
packages/storage         Filesystem blobs
scripts                  start/stop, deploy, demo-setup, smokes
tests/e2e                Playwright
.github/workflows/ci.yml
```

---

## 6. Workflows

### 6.1 Local development (daily)

```bash
cp -n .env.example .env
npm install
export PATH="$HOME/.foundry/bin:$PATH"
bash scripts/install-contracts.sh   # forge-std + OpenZeppelin
bash scripts/dev-up.sh              # Postgres + Anvil + forge script deploy
npx prisma generate --schema database/prisma/schema.prisma
npx prisma migrate deploy --schema database/prisma/schema.prisma
npm run demo:setup                  # DIDs, roles, SEED-RADIO-001
bash scripts/run-apps.sh            # PEP, indexer, portal, PWA
```

Stop with `bash scripts/dev-down.sh`.

`dev-up` is infrastructure. `run-apps` is the four Node processes. If Anvil restarts, addresses change: redeploy, then `demo:setup` again.

### 6.2 Request workflow (privileged write)

```
Browser (apps/web)
  -> POST /auth/challenge  (nonce stored in LoginNonce)
  -> user key signs DID + address + nonce + timestamp
  -> POST /auth/login
       recover signer
       DIDRegistry: active controller?
       RoleManager.hasActiveRole (fresh)
       issue JWT (did, address, no role claim)
  -> POST /assets/mint (or transfer, attest, ...)
       JWT ok?
       RoleManager again
       PEP sends a real tx from the matching demo signer
  -> Anvil executes contract
  -> event log
  -> indexer poll (~2s)
  -> ChainEvent + derived Asset/Did/Attestation rows
  -> Audit UI reads Postgres
```

Read-only displays may go portal -> PEP -> `eth_call`. Privileged state changes must go through the PEP. Frontend hiding Mint is UX. The contract still reverts a User who calls `mint`.

### 6.3 Identity and authorization workflow

```
DIDRegistry.register
  -> optional VC-shaped credential (off-chain, signed)
  -> RoleManager.grantRole / grantRoleWithExpiry
  -> PEP requireRoles
  -> AssetNFT / AttestationRegistry / DivergenceRegistry
  -> event -> indexer
```

There is no floating role in React state that can authorize a write.

### 6.4 Asset trust workflow

```
mint NFT
  -> allocate / transfer (blocked if quarantined)
  -> submitAttestation (EIP-712)
  -> confidence = evidenceWeight x freshnessDecay x divergencePenalty
  -> if two attestations in the freshness window disagree on
     custodian OR locationId OR condition:
       DivergenceRecord (never deleted)
       AssetNFT.setQuarantine(true)
  -> Manager proposeReconciliation
       low-value: unfreeze immediately
       high-value: different Admin must confirm (separation of duties)
  -> audit reconstruction from ChainEvent where timestamp <= T
```

Confidence code: `packages/policy/src/confidence.ts`. The asset page must show the breakdown. A bare number with no trace is treated as a fake.

### 6.5 Offline verifier workflow

```
Online: GET /offline/snapshot -> IndexedDB
  (policy, DID, role, credentials, capturedAt)
Offline (Playwright setOffline, or airplane mode):
  low-risk (identifier_scan): allowed up to 7-day stale cache
  high-risk (transfer, mint, role_change, reconcile): denied if snapshot > 15 minutes
  decision signed locally, queued in IndexedDB
Reconnect: POST /offline/reconcile
  PEP verifies signature, re-checks DID/role, records accept/reject
```

PWA pieces: `apps/verifier-pwa/public/manifest.json`, `public/sw.js`, `src/lib/idb.ts`.

### 6.6 Test workflow

| Layer | Command | What it proves |
|---|---|---|
| Contracts | `cd contracts && forge test` | RBAC reverts, replay, quarantine, SoD, invariants |
| Policy / crypto | `npm run test -w @anubandh/policy` (and crypto) | Formula and signatures |
| Backend unit | `npm run test -w backend` | Schemas, JWT has no role claim |
| Live API | `npx tsx scripts/smoke-auth.ts` | User mint 403, Admin mint real tx |
| Divergence | `npx tsx scripts/smoke-divergence.ts` | Conflict, blocked transfer, history kept |
| Audit | `npx tsx scripts/smoke-audit.ts` | PIT from ChainEvent |
| E2E | `cd tests/e2e && npx playwright test` | Login, mint, unauthorized, offline PWA |
| Writing | `bash scripts/check-emdash.sh` | No U+2014 in the repo |

CI (`.github/workflows/ci.yml`) runs Foundry, Vitest, and the em-dash check. Playwright needs the full stack, so it is local/demo, not the default CI job.

### 6.7 Git workflow

Conventional commits on `main`, pushed to GitHub. Logical chunks followed the phases (scaffold, contracts, PEP, UI, docs) rather than one giant commit. `.env` is gitignored. Anvil keys in `.env.example` are public test keys.

### 6.8 Deploy workflow (public internet)

See `DEPLOY.md`.

```
Vercel: apps/web and apps/verifier-pwa
  NEXT_PUBLIC_API_URL = public PEP
Railway/Render/VPS: Express + indexer
Neon: Postgres
Sepolia or Besu RPC: contracts
```

Vercel cannot run Anvil or the indexer loop. `localhost:8545` is invisible to Vercel and to visitors.

---

## 7. Decision log (why not the alternatives)

| Choice | Rejected option | Reason |
|---|---|---|
| Foundry + Anvil only | Parallel Hardhat project | One toolchain, one test runner |
| Express PEP | Frontend talks to contracts for writes | Need a policy checkpoint and a single audit path |
| JWT without role claim | Put `role: Admin` in the token | Token theft would mint forever. Role is on-chain. |
| Custom indexer | Ponder | Faster to stand up for a prototype |
| Filesystem blobs | IPFS in v1 | Interface is swappable. Hash on-chain is the commitment. |
| PWA in the same product family | Responsive page only | Synopsis requires cached trust anchors and offline gating |
| DaisyUI later | Keep custom CSS only | Themes and denser components; behavior unchanged |
| Embedded Postgres fallback | Docker-only | This machine had no Docker; Compose file remains for others |

---

## 8. What "done" meant for this prototype

Working, tested, documented:

- DID register / rotate / revoke
- Four roles, contract-level deny
- Mint, allocate, transfer, quarantine-blocked transfer
- Signed attestations, evidence tiers, nonce replay
- Divergence record, freeze, reconcile without deleting history
- Explainable confidence
- Offline PWA with real offline tests
- Indexer + point-in-time from events
- Zero em dash characters in the tree

Documented as not done (see `KNOWN_LIMITATIONS.md`):

- Production key custody (PEP holds Anvil keys so `msg.sender` is the user in demo)
- Live Besu cluster
- Full VC-JWT / selective disclosure
- BEL ERP, SCIM, cross-org interoperability
- Camera/NFC hardware for IdentifierScan

---

## 9. If you extend this

Keep the three chains intact:

1. UI -> PEP -> contracts -> events -> Postgres -> audit
2. DID -> credential (optional) -> RoleManager -> authorization
3. Asset -> attestation -> confidence -> divergence -> quarantine -> reconcile

If you add a feature that authorizes a write only in React state, you have broken the project. Add a Foundry negative test first, then the PEP route, then the button.
