import { Wallet } from "ethers";
import { buildLoginMessage } from "@anubandh/crypto";
import { formatDid } from "@anubandh/shared";

const API = "http://localhost:4000";
const w = new Wallet("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");

async function main() {
  const did = formatDid(31337, w.address);
  const ch = await fetch(`${API}/auth/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: w.address, did })
  }).then((r) => r.json());
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await w.signMessage(
    buildLoginMessage({ did, address: w.address, nonce: ch.nonce, timestamp })
  );
  const s = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: w.address, did, nonce: ch.nonce, timestamp, signature })
  }).then((r) => r.json());
  const at = new Date().toISOString();
  const pit = await fetch(`${API}/audit/point-in-time?tokenId=1&at=${encodeURIComponent(at)}`, {
    headers: { Authorization: `Bearer ${s.token}` }
  }).then((r) => r.json());
  const events = await fetch(`${API}/audit/events?tokenId=1`, {
    headers: { Authorization: `Bearer ${s.token}` }
  }).then((r) => r.json());
  console.log({
    role: s.role,
    owner: pit.owner,
    quarantined: pit.quarantined,
    openDivergence: pit.openDivergence,
    source: pit.reconstructedFrom,
    lastAttestation: pit.lastAttestation?.evidenceTier,
    eventCount: events.items?.length
  });
  if (!pit.reconstructedFrom?.includes("ChainEvent")) throw new Error("PIT did not use ChainEvent");
  if (!events.items?.length) throw new Error("no indexed events");
  console.log("SMOKE AUDIT PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
