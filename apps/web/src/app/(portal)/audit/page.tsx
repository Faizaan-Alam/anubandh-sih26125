"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { loadToken } from "@/lib/session";
import { Term } from "@/components/Term";

export default function AuditPage() {
  const [tokenId, setTokenId] = useState("1");
  const [at, setAt] = useState(new Date().toISOString().slice(0, 16));
  const [events, setEvents] = useState<unknown>(null);
  const [pit, setPit] = useState<unknown>(null);
  const [err, setErr] = useState<string | null>(null);
  const token = loadToken();

  async function loadEvents() {
    setErr(null);
    try {
      const r = await api(`/audit/events?tokenId=${tokenId}`, {}, token ?? undefined);
      setEvents(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "events failed");
    }
  }

  async function reconstruct() {
    setErr(null);
    try {
      const iso = new Date(at).toISOString();
      const r = await api(`/audit/point-in-time?tokenId=${tokenId}&at=${encodeURIComponent(iso)}`, {}, token ?? undefined);
      setPit(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "reconstruction failed");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">
        <Term label="Audit Trail" hint="Indexed on-chain events. Point-in-time views filter events up to timestamp T." />
      </h1>
      <p className="text-sm text-slate-600">
        Reconstruction uses the append-only ChainEvent table, not the latest derived row. Auditor and Admin only.
      </p>
      <div className="bg-white border border-line p-4 flex flex-wrap gap-2 items-end">
        <label className="text-sm">
          Token
          <input className="block border border-line px-3 py-2" value={tokenId} onChange={(e) => setTokenId(e.target.value)} />
        </label>
        <label className="text-sm">
          Point in time
          <input type="datetime-local" className="block border border-line px-3 py-2" value={at} onChange={(e) => setAt(e.target.value)} />
        </label>
        <button className="border border-line px-3 py-2 text-sm" onClick={loadEvents}>Load event history</button>
        <button className="bg-accent text-white px-3 py-2 text-sm" onClick={reconstruct}>Reconstruct</button>
      </div>
      {err && <div className="text-sm text-red-800 bg-red-50 border border-red-200 px-3 py-2">{err}</div>}
      <div className="grid md:grid-cols-2 gap-4">
        <pre className="bg-white border border-line p-3 text-xs overflow-auto min-h-64">{JSON.stringify(events, null, 2)}</pre>
        <pre className="bg-white border border-line p-3 text-xs overflow-auto min-h-64">{JSON.stringify(pit, null, 2)}</pre>
      </div>
    </div>
  );
}
