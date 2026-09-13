"use client";

import { useState } from "react";
import { Wallet, randomBytes, hexlify } from "ethers";
import { signAttestation } from "@anubandh/crypto";
import { api } from "@/lib/api";
import { CHAIN_ID, DEMO_ACCOUNTS } from "@/lib/accounts";
import { loadStoredKey, loadToken } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import { Term } from "@/components/Term";
import { PageHeader } from "@/components/PageHeader";
import { HelpPanel } from "@/components/HelpPanel";
import { Alert } from "@/components/Alert";
import { AddressChip } from "@/components/AddressChip";
import { txShort } from "@/lib/format";

interface AttestationRow {
  id: string;
  observer: string;
  evidenceTier: string;
  custodian: string;
  locationId: string;
  condition: string;
  timestamp: number;
}

export default function AttestationsPage() {
  const [tokenId, setTokenId] = useState("1");
  const [tier, setTier] = useState<"SignedInspection" | "IdentifierScan">("SignedInspection");
  const [location, setLocation] = useState("BEL-depot-A");
  const [condition, setCondition] = useState<"Good" | "Damaged" | "Missing" | "Unknown">("Good");
  const [custodian, setCustodian] = useState(DEMO_ACCOUNTS[3].address);
  const [items, setItems] = useState<AttestationRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const token = loadToken();

  async function load() {
    const r = await api<{ items: AttestationRow[] }>(`/attestations/asset/${tokenId}`, {}, token ?? undefined);
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
      setMsg(`${r.note} tx ${txShort(r.txHash)}`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "attest failed");
    }
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <PageHeader
        kicker="Observations"
        title={<Term label="Attestation" hint="A signed, role-bound observation of an asset." />}
      >
        <Term label="Evidence Tier" hint="IdentifierScan is weaker QR/NFC-style evidence. SignedInspection is stronger." />
        : IdentifierScan is not unclonable. SignedInspection is an organizational attestation, not physical-world truth.
      </PageHeader>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-line p-4 grid sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
            Token id
            <input className="field mt-1" value={tokenId} onChange={(e) => setTokenId(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Evidence tier
            <select className="field mt-1" value={tier} onChange={(e) => setTier(e.target.value as typeof tier)}>
              <option>SignedInspection</option>
              <option>IdentifierScan</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Observed condition
            <select className="field mt-1" value={condition} onChange={(e) => setCondition(e.target.value as typeof condition)}>
              <option>Good</option>
              <option>Damaged</option>
              <option>Missing</option>
              <option>Unknown</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Location label (hashed on-chain)
            <input className="field mt-1" value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Observed custodian
            <select className="field mt-1" value={custodian} onChange={(e) => setCustodian(e.target.value)}>
              {DEMO_ACCOUNTS.map((a) => (
                <option key={a.address} value={a.address}>{a.label}</option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2 flex gap-2">
            <button className="btn btn-primary" onClick={submit}>Sign and submit</button>
            <button className="btn btn-secondary" onClick={load}>Refresh history</button>
          </div>
        </div>
        <HelpPanel
          title="How to demo a conflict"
          steps={[
            "As User, submit Good at BEL-depot-A.",
            "Sign out. Log in as User 2.",
            "Submit Damaged or a different location. Divergence should fire."
          ]}
        />
      </div>

      {tier === "IdentifierScan" && (
        <Alert kind="warn">
          IdentifierScan is weaker evidence. A QR or NFC identifier is not physically unclonable or tamper-proof.
        </Alert>
      )}
      {msg && <Alert kind="ok">{msg}</Alert>}
      {err && <Alert kind="err">{err}</Alert>}

      <div className="bg-white border border-line overflow-auto">
        <div className="px-4 py-2 border-b border-line text-sm font-semibold flex items-center gap-2">
          History <StatusBadge value="demo" />
        </div>
        {items.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500">No attestations loaded. Submit one or click Refresh history.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-paper text-left">
              <tr>
                <th className="px-4 py-2">Id</th>
                <th className="px-4 py-2">Observer</th>
                <th className="px-4 py-2">Tier</th>
                <th className="px-4 py-2">Condition</th>
                <th className="px-4 py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t border-line table-row">
                  <td className="px-4 py-2">{row.id}</td>
                  <td className="px-4 py-2"><AddressChip address={row.observer} /></td>
                  <td className="px-4 py-2">{row.evidenceTier}</td>
                  <td className="px-4 py-2">{row.condition}</td>
                  <td className="px-4 py-2 font-mono text-xs">{row.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
