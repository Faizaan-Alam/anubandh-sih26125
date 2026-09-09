"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { DEMO_ACCOUNTS } from "@/lib/accounts";
import { loadToken } from "@/lib/session";
import { Term } from "@/components/Term";

export default function DivergencePage() {
  const [tokenId, setTokenId] = useState("1");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [divergenceId, setDivergenceId] = useState("");
  const [custodian, setCustodian] = useState(DEMO_ACCOUNTS[3].address);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const token = loadToken();

  async function load() {
    const r = await api<Record<string, unknown>>(`/divergence/asset/${tokenId}`, {}, token ?? undefined);
    setData(r);
    const open = r.openDivergenceId;
    if (open) setDivergenceId(String(open));
  }

  async function propose() {
    if (!token) return;
    try {
      const r = await api<{ txHash: string }>("/divergence/propose", {
        method: "POST",
        body: JSON.stringify({
          divergenceId,
          evidenceNotes: "Manager inspection accepted depot-A / Good",
          acceptedCustodian: custodian,
          acceptedLocation: "BEL-depot-A",
          acceptedCondition: "Good"
        })
      }, token);
      setMsg(`Proposal tx ${r.txHash}`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "propose failed");
    }
  }

  async function confirm() {
    if (!token) return;
    try {
      const r = await api<{ txHash: string; note: string }>("/divergence/confirm", {
        method: "POST",
        body: JSON.stringify({ divergenceId })
      }, token);
      setMsg(`${r.note} tx ${r.txHash}`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "confirm failed");
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold">
        <Term label="Divergence" hint="Two attestations in the freshness window that disagree on custodian, location or condition." />
      </h1>
      <p className="text-sm text-slate-600">
        Detection writes an immutable record and sets <Term label="Quarantine" hint="Transfers are blocked until reconciliation." />.
        History is never deleted. High-value assets require Manager proposal plus a different Admin confirmation.
      </p>
      <div className="flex gap-2">
        <input className="border border-line px-3 py-2" value={tokenId} onChange={(e) => setTokenId(e.target.value)} />
        <button className="bg-accent text-white px-3 py-2 text-sm" onClick={load}>Load</button>
      </div>
      <div className="bg-white border border-line p-4 space-y-3">
        <input className="border border-line px-3 py-2 w-full" value={divergenceId} onChange={(e) => setDivergenceId(e.target.value)} placeholder="divergence id" />
        <select className="border border-line px-3 py-2" value={custodian} onChange={(e) => setCustodian(e.target.value)}>
          {DEMO_ACCOUNTS.map((a) => (
            <option key={a.address} value={a.address}>{a.label}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button className="border border-line px-3 py-2 text-sm" onClick={propose}>Propose reconciliation</button>
          <button className="bg-navy text-white px-3 py-2 text-sm" onClick={confirm}>Admin confirm</button>
        </div>
        {msg && <div className="text-sm text-emerald-800">{msg}</div>}
        {err && <div className="text-sm text-red-800 bg-red-50 border border-red-200 px-3 py-2">{err}</div>}
      </div>
      <pre className="bg-white border border-line p-3 text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
