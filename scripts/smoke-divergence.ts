import { Wallet, hexlify, randomBytes, id as keccakId } from "ethers";
import { buildLoginMessage, signAttestation } from "@anubandh/crypto";
import { formatDid } from "@anubandh/shared";

const API = "http://localhost:4000";
const CHAIN = 31337;
const user = new Wallet("0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6");
const user2 = new Wallet("0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a");
const manager = new Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");

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

async function attest(
  w: Wallet,
  token: string,
  tokenId: string,
  location: string,
  condition: "Good" | "Damaged",
  custodian: string
) {
  const ready = await fetch(`${API}/ready`).then((r) => r.json());
  const nonce = hexlify(randomBytes(32));
  const validUntil = Math.floor(Date.now() / 1000) + 3600;
  const payload = {
    tokenId,
    evidenceTier: 1,
    custodian,
    locationId: keccakId(location),
    condition: condition === "Good" ? 1 : 2,
    nonce,
    validUntil
  };
  const signature = await signAttestation(w, CHAIN, ready.contracts.AttestationRegistry, payload);
  const res = await fetch(`${API}/attestations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      observer: w.address,
      tokenId,
      evidenceTier: "SignedInspection",
      custodian,
      location,
      condition,
      nonce,
      validUntil,
      observationNotes: location,
      signature
    })
  });
  return { status: res.status, body: await res.json() };
}

async function main() {
  const s1 = await login(user);
  const s2 = await login(user2);
  const sm = await login(manager);
  const tokenId = "1";
  const a1 = await attest(user, s1.token, tokenId, "BEL-depot-A", "Good", user.address);
  console.log("attestation 1", a1.status, a1.body.txHash ?? a1.body.error);
  const a2 = await attest(user2, s2.token, tokenId, "BEL-depot-B", "Damaged", user2.address);
  console.log("attestation 2", a2.status, a2.body.txHash ?? a2.body.error);
  const asset = await fetch(`${API}/assets/${tokenId}`).then((r) => r.json());
  console.log("quarantined", asset.quarantined, "confidence", asset.confidence?.breakdown?.score);
  const xfer = await fetch(`${API}/assets/transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sm.token}` },
    body: JSON.stringify({ tokenId, newOwner: user2.address })
  }).then(async (r) => ({ status: r.status, b: await r.json() }));
  console.log("transfer while quarantined", xfer.status, xfer.b.error);
  const div = await fetch(`${API}/divergence/asset/${tokenId}`).then((r) => r.json());
  console.log("open divergence", div.openDivergenceId);
  const rec = await fetch(`${API}/divergence/propose`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sm.token}` },
    body: JSON.stringify({
      divergenceId: div.openDivergenceId,
      evidenceNotes: "accepted depot-A",
      acceptedCustodian: user.address,
      acceptedLocation: "BEL-depot-A",
      acceptedCondition: "Good"
    })
  }).then(async (r) => ({ status: r.status, b: await r.json() }));
  console.log("reconcile", rec.status, rec.b.txHash ?? rec.b.error);
  const after = await fetch(`${API}/divergence/asset/${tokenId}`).then((r) => r.json());
  console.log("history length", after.items?.length, "still readable", Boolean(after.items?.[0]));
  const asset2 = await fetch(`${API}/assets/${tokenId}`).then((r) => r.json());
  console.log("quarantined after", asset2.quarantined);
  if (!asset.quarantined) throw new Error("expected quarantine");
  if (xfer.status === 200) throw new Error("transfer should fail while quarantined");
  if (asset2.quarantined) throw new Error("expected clear after reconcile");
  if (!after.items?.length) throw new Error("divergence history must remain");
  console.log("SMOKE DIVERGENCE PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
