"use client";

import { useState } from "react";
import { Wallet, randomBytes, hexlify } from "ethers";
import { signAttestation } from "@anubandh/crypto";
import { api } from "@/lib/api";
import { CHAIN_ID, DEMO_ACCOUNTS } from "@/lib/accounts";
import { loadStoredKey, loadToken } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import { Term } from "@/components/Term";

export default function AttestationsPage() {
  const [tokenId, setTokenId] = useState("1");
  const [tier, setTier] = useState<"SignedInspection" | "IdentifierScan">("SignedInspection");
  const [location, setLocation] = useState("BEL-depot-A");
  const [condition, setCondition] = useState<"Good" | "Damaged" | "Missing" | "Unknown">("Good");
  const [custodian, setCustodian] = useState(DEMO_ACCOUNTS[3].address);
  const [items, setItems] = useState<unknown[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const token = loadToken();

  async function load() {
    const r = await api<{ items: unknown[] }>(`/attestations/asset/${tokenId}`, {}, token ?? undefined);
    setItems(r.items);
  }

  async function submit() {
    if (!token) return;
    const pk = loadStoredKey();
    if (!pk) return;
    setErr(null);
    try {
      const ready = await api<{ contracts: { AttestationRegistry: string } }>("/ready");
      const wallet = new Wallet(pk);
      const nonce = hexlify(randomBytes(32));
      const validUntil = Math.floor(Date.now() / 1000) + 3600;
      const { id: keccakId } = await import("ethers");
      const payload = {
        tokenId,
        evidenceTier: tier === "SignedInspection" ? 1 : 0,
        custodian,
        locationId: keccakId(location),
        condition: { Unknown: 0, Good: 1, Damaged: 2, Missing: 3 }[condition],
        nonce,
        validUntil
      };
      const signature = await signAttestation(wallet, CHAIN_ID, ready.contracts.AttestationRegistry, payload);
      const r = await api<{ txHash: string; note: string }>("/attestations", {
        method: "POST",
        body: JSON.stringify({
          observer: wallet.address,
          tokenId,
          evidenceTier: tier,
          custodian,
          location,
          condition,
          nonce,
          validUntil,
          observationNotes: `${tier} at ${location}`,
          signature
        })
      }, token);
      setMsg(`${r.note} tx ${r.txHash}`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "attest failed");
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold">
        <Term label="Attestation" hint="A signed, role-bound observation of an asset." />
      </h1>
      <p className="text-sm text-slate-600">
        <Term label="Evidence Tier" hint="IdentifierScan is weaker QR/NFC-style evidence. SignedInspection is stronger." />:
        IdentifierScan is not unclonable. SignedInspection is an organizational attestation, not physical-world truth.
      </p>
      <div className="bg-white border border-line p-4 grid md:grid-cols-2 gap-3">
        <input className="border border-line px-3 py-2" value={tokenId} onChange={(e) => setTokenId(e.target.value)} />
        <select className="border border-line px-3 py-2" value={tier} onChange={(e) => setTier(e.target.value as typeof tier)}>
          <option>SignedInspection</option>
          <option>IdentifierScan</option>
        </select>
        <input className="border border-line px-3 py-2" value={location} onChange={(e) => setLocation(e.target.value)} />
        <select className="border border-line px-3 py-2" value={condition} onChange={(e) => setCondition(e.target.value as typeof condition)}>
          <option>Good</option>
          <option>Damaged</option>
          <option>Missing</option>
          <option>Unknown</option>
        </select>
        <select className="border border-line px-3 py-2" value={custodian} onChange={(e) => setCustodian(e.target.value)}>
          {DEMO_ACCOUNTS.map((a) => (
            <option key={a.address} value={a.address}>{a.label}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button className="bg-accent text-white px-3 py-2 text-sm" onClick={submit}>Sign and submit</button>
          <button className="border border-line px-3 py-2 text-sm" onClick={load}>Refresh history</button>
        </div>
      </div>
      {tier === "IdentifierScan" && (
        <div className="text-sm bg-amber-50 border border-amber-200 px-3 py-2">
          IdentifierScan is weaker evidence. A QR or NFC identifier is not physically unclonable or tamper-proof.
        </div>
      )}
      {msg && <div className="text-sm text-emerald-800">{msg}</div>}
      {err && <div className="text-sm text-red-800 bg-red-50 border border-red-200 px-3 py-2">{err}</div>}
      <pre className="bg-white border border-line p-3 text-xs overflow-auto">{JSON.stringify(items, null, 2)}</pre>
      <StatusBadge value="demo" />
    </div>
  );
}
