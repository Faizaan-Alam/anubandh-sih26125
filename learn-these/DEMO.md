# ANUBANDH demo script

These five acts match the synopsis. Each step is a real chain or PWA action.

## Bring the stack up (clean clone)

```bash
cp .env.example .env
npm install
export PATH="$HOME/.foundry/bin:$PATH"
cd contracts && forge install OpenZeppelin/openzeppelin-contracts@v5.2.0 foundry-rs/forge-std --no-commit && forge build && cd ..
bash scripts/dev-up.sh
npx prisma generate --schema database/prisma/schema.prisma
npx prisma migrate deploy --schema database/prisma/schema.prisma
npm run demo:setup
bash scripts/run-apps.sh
```

Open:

- Portal http://localhost:3000
- Verifier http://localhost:3001
- API health http://localhost:4000/health

Demo signers are Anvil accounts 0-4 (Admin, Manager, Auditor, User, User 2). The UI shows a **demo** / **seed** badge.

## Act 1. Identity and RBAC

Expected: authorized mint succeeds on-chain; unauthorized mint is rejected by the PEP after a RoleManager check, and the contract would revert if called directly.

1. At http://localhost:3000 choose **Admin** and click **Sign challenge and enter**.
2. Confirm the header shows role Admin and `RoleManager.hasActiveRole (fresh on-chain check)`.
3. Open **Assets**, mint `SEED-RADIO-ACT1` to User. Observe a transaction hash, not a simulated success.
4. Sign out. Login as **User**. Open **Assets** and click **Mint asset NFT**.
5. Observe `Authorization failed at the policy enforcement point` with `On-chain role is User`.
6. Optional (contract-level proof already in tests): `cd contracts && forge test --match-test test_strangerDirectMintReverts`.

## Act 2. Asset lifecycle

Expected: NFT exists with owner/custodian and an event history.

1. Login as Admin. Open **Assets** / token `#1` (or the token just minted).
2. Note owner, custodian, metadata hash (document is off-chain).
3. Login as Manager. Use **Allocate custody** to User 2. Observe a tx hash and updated custodian.
4. Open **Audit Trail**, load events for that token. `AssetMinted` and `AssetAllocated` appear from the indexer (allow ~2s).

## Act 3. Divergence

Expected: two incompatible observations quarantine the asset; transfer reverts; history remains.

1. Login as **User**. Open **Attestations**. Token `1`, location `BEL-depot-A`, condition `Good`, custodian User. Submit.
2. Sign out. Login as **User 2**. Submit a second attestation for token `1` with location `BEL-depot-B` or condition `Damaged`.
3. Open **Divergence**. Load token `1`. An open divergence id is present. Asset detail shows **Quarantined** and confidence near 10.
4. Login as **Manager**. On the asset page, **Transfer ownership**. Observe a revert (`AssetQuarantined` / execution reverted).
5. On **Divergence**, propose reconciliation (low-value asset finalizes immediately). History still lists the original divergence record.

## Act 4. Offline mode

Expected: genuine browser offline; low-risk allowed; stale high-risk denied; reconnect reconciles.

1. Open http://localhost:3001. Click **Login and cache snapshot**.
2. DevTools or Playwright: take the tab offline (`context.setOffline(true)`). The header shows **Offline**.
3. Click **Low-risk: identifier scan**. Decision is allowed and stored in IndexedDB.
4. Click **Age snapshot (demo)** then **High-risk: transfer ownership**.
5. Observe: `Denied: cached authorization snapshot is older than the permitted threshold for this high-risk operation.`
6. Go online. Click **Reconnect and reconcile**. Each queued item shows an accepted/rejected reconciliation reason.

Automated: `npx playwright test tests/e2e/specs/offline.spec.ts` (stack must be up).

## Act 5. Trust decay and audit

Expected: confidence drops with age; point-in-time reconstruction uses events, not only the latest row.

1. After Act 3, open the asset detail. Read the confidence breakdown (tier, age, window, penalty).
2. Advance time on Anvil: `cast rpc evm_increaseTime 259200 && cast rpc evm_mine` (3 days) from a shell with Foundry.
3. Refresh the asset page. Freshness decay lowers the score; explanation cites age vs window.
4. Login as **Auditor**. Open **Audit Trail**. Pick a timestamp **before** the divergence. Reconstruct. Quarantine should be false at that earlier time. Pick a timestamp **after** detection. Quarantine should be true.

## Shut down

```bash
bash scripts/dev-down.sh
```
