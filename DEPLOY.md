# Deploy ANUBANDH on Vercel

Vercel hosts **Next.js frontends**. It does not run Anvil, Foundry, a long-lived Express process, or the event indexer.

You can put these on Vercel:

- Portal: `apps/web`
- Verifier PWA: `apps/verifier-pwa` (second Vercel project)

You must host these somewhere else (Railway, Render, Fly.io, a VPS):

- Backend PEP (`backend/`)
- Indexer (`indexer/`)
- PostgreSQL
- An EVM RPC (Sepolia, a Besu node, or a always-on Anvil). Local `127.0.0.1:8545` is not reachable from Vercel.

If you only deploy the portal and leave `NEXT_PUBLIC_API_URL=http://localhost:4000`, login will fail in the browser. The API URL must be a public HTTPS backend.

---

## Architecture that actually works

```
Browser
  -> Vercel (portal + PWA)
       -> Railway / Render (Express PEP + indexer)
            -> Neon / Vercel Postgres
            -> Public RPC (Sepolia or hosted Besu)
                 -> deployed ANUBANDH contracts
```

---

## 1. Host the backend first

The portal is useless until `/auth/challenge` and `/auth/login` are on the public internet.

1. Create a PostgreSQL database (Neon is simple). Copy the `DATABASE_URL`.
2. Deploy `backend` as a Node service that runs `npx tsx src/index.ts` (or `npm run start` after `tsc`).
3. Deploy `indexer` as a second worker, or the same machine with a process manager.
4. Point the chain RPC at a public node. Deploy contracts with Foundry against that RPC. Put the result in `packages/shared/deployments/<network>.json` and set `ANUBANDH_NETWORK` to that name.
5. Set backend env (never put these in Vercel frontend settings except the public ones):

```
DATABASE_URL=postgresql://...
ANVIL_RPC_URL=https://your-rpc.example
CHAIN_ID=11155111
ANUBANDH_NETWORK=sepolia
JWT_SECRET=a-long-random-string
CORS_ORIGIN=https://your-portal.vercel.app
VERIFIER_ORIGIN=https://your-pwa.vercel.app
DEPLOYER_PRIVATE_KEY=...
DEMO_MANAGER_PRIVATE_KEY=...
DEMO_AUDITOR_PRIVATE_KEY=...
DEMO_USER_PRIVATE_KEY=...
DEMO_USER2_PRIVATE_KEY=...
```

6. Run migrations on that database:

```bash
npx prisma migrate deploy --schema database/prisma/schema.prisma
```

7. Confirm:

```bash
curl https://your-api.example/health
```

You should see `{"ok":true,"service":"anubandh-pep"}`.

---

## 2. Deploy the portal on Vercel (dashboard)

1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub.
2. **Add New Project** and import `Faizaan-Alam/anubandh-sih26125`.
3. Configure:

   | Setting | Value |
   |---|---|
   | Framework Preset | Next.js |
   | Root Directory | `apps/web` (click Edit) |
   | Install Command | `cd ../.. && npm install` |
   | Build Command | `npm run build` |
   | Output | leave default (Next.js) |

4. Environment variables (Production + Preview):

   | Name | Example |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://anubandh-api.up.railway.app` |
   | `NEXT_PUBLIC_CHAIN_ID` | `11155111` |

   Do **not** add private keys here. The browser already has demo Anvil keys for local use. On a public chain, users should sign with a wallet. Do not paste `DEPLOYER_PRIVATE_KEY` into Vercel.

5. Deploy. You get a URL like `https://anubandh-web.vercel.app`.
6. Put that URL into the backend `CORS_ORIGIN`, redeploy the backend, then try login.

### CLI equivalent

```bash
npm i -g vercel
cd /home/faizaan-alam/sih/sih_project
vercel login
vercel link
```

When prompted, set the project root to `apps/web`, or from the repo root:

```bash
vercel --cwd apps/web
```

Then:

```bash
vercel env add NEXT_PUBLIC_API_URL
vercel env add NEXT_PUBLIC_CHAIN_ID
vercel --prod
```

---

## 3. Deploy the verifier PWA (second project)

Repeat the same import of the **same GitHub repo**, but:

| Setting | Value |
|---|---|
| Project name | `anubandh-verifier` (or similar) |
| Root Directory | `apps/verifier-pwa` |
| Install Command | `cd ../.. && npm install` |
| Build Command | `npm run build` |

Env:

```
NEXT_PUBLIC_API_URL=https://your-api.example
NEXT_PUBLIC_CHAIN_ID=11155111
```

Set backend `VERIFIER_ORIGIN` to this Vercel URL.

---

## 4. Local Anvil cannot serve Vercel

`http://127.0.0.1:8545` exists only on your laptop. A Vercel serverless function and every visitor's browser cannot reach it.

For a public demo you need one of:

- Sepolia (or another testnet) with contracts deployed there
- A cloud VM running Anvil/Besu with an HTTPS RPC (ngrok is a short-lived hack, not a demo you leave running)

After you deploy contracts to that network, write `packages/shared/deployments/<network>.json` (addresses + ABIs) and set `ANUBANDH_NETWORK` on the backend to match.

---

## 5. Checklist if login fails after deploy

- Browser Network tab: does `POST https://your-api.../auth/challenge` succeed, or CORS error?
- Backend `CORS_ORIGIN` must be the exact Vercel origin (`https://....vercel.app`), no trailing slash mismatch.
- `NEXT_PUBLIC_API_URL` has no trailing slash.
- Postgres is up and migrations applied (`LoginNonce` table exists).
- Chain RPC is public and the DID for the demo account is registered (`npm run demo:setup` against that RPC).
- Rebuild the Vercel project after changing `NEXT_PUBLIC_*` variables. They are baked in at build time.

---

## 6. What not to do

- Do not set Root Directory to the repo root and expect Vercel to guess which Next app to build.
- Do not put the Express indexer loop on Vercel serverless. It will time out.
- Do not commit `.env` or real keys.
- Do not expect the current demo private keys in `apps/web/src/lib/accounts.ts` to control accounts on Sepolia. Those keys are Anvil defaults. On a public testnet you must fund and use keys you control, then register their DIDs.
