import { Wallet } from "ethers";
import { buildLoginMessage } from "@anubandh/crypto";
import { formatDid } from "@anubandh/shared";

const API = "http://localhost:4000";
const CHAIN = 31337;
const admin = new Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
const user = new Wallet("0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6");

async function login(w: Wallet) {
  const did = formatDid(CHAIN, w.address);
  const ch = await fetch(`${API}/auth/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: w.address, did })
  }).then((r) => r.json());
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await w.signMessage(
    buildLoginMessage({ did, address: w.address, nonce: ch.nonce, timestamp })
  );
  return fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: w.address, did, nonce: ch.nonce, timestamp, signature })
  }).then((r) => r.json());
}

async function main() {
  const a = await login(admin);
  console.log("admin login", a.role, a.error ?? "ok");
  const u = await login(user);
  console.log("user login", u.role, u.error ?? "ok");

  const mintUser = await fetch(`${API}/assets/mint`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${u.token}` },
    body: JSON.stringify({
      to: user.address,
      assetIdentifier: "SHOULD-FAIL",
      highValue: false,
      assetClass: 0,
      freshnessWindowSeconds: 86400
    })
  }).then(async (r) => ({ status: r.status, b: await r.json() }));
  console.log("user mint", mintUser.status, mintUser.b.error);

  const mintAdmin = await fetch(`${API}/assets/mint`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${a.token}` },
    body: JSON.stringify({
      to: user.address,
      assetIdentifier: "SEED-RADIO-ACT-API",
      highValue: false,
      assetClass: 0,
      freshnessWindowSeconds: 86400
    })
  }).then(async (r) => ({ status: r.status, b: await r.json() }));
  console.log("admin mint", mintAdmin.status, mintAdmin.b.txHash ?? mintAdmin.b.error);

  const assets = await fetch(`${API}/assets`).then((r) => r.json());
  console.log(
    "assets",
    assets.items?.length,
    assets.items?.map((x: { tokenId: string; quarantined: boolean; confidence: { score: number } }) => ({
      id: x.tokenId,
      q: x.quarantined,
      c: x.confidence?.score
    }))
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
