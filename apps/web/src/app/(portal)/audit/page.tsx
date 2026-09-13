"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { loadToken } from "@/lib/session";
import { Term } from "@/components/Term";
import { PageHeader } from "@/components/PageHeader";
import { HelpPanel } from "@/components/HelpPanel";
import { Alert } from "@/components/Alert";
import { StatusBadge } from "@/components/StatusBadge";
import { AddressChip } from "@/components/AddressChip";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";

interface ChainEventRow {
  id: string;
  eventName: string;
  contractName: string;
  txHash: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

interface Pit {
  tokenId: string;
  at: string;
  reconstructedFrom: string;
  owner: string | null;
  custodian: string | null;
  quarantined: boolean;
  openDivergence: boolean;
  confidence: { score: number; explanation: string } | null;
  lastAttestation: { evidenceTier: string; timestamp: number } | null;
}

export default function AuditPage() {
  const [tokenId, setTokenId] = useState("1");
  const [at, setAt] = useState(new Date().toISOString().slice(0, 16));
  const [events, setEvents] = useState<ChainEventRow[]>([]);
  const [pit, setPit] = useState<Pit | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const token = loadToken();

  async function loadEvents() {
    setErr(null);
    try {
      const r = await api<{ items: ChainEventRow[] }>(`/audit/events?tokenId=${tokenId}`, {}, token ?? undefined);
      setEvents(r.items ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "events failed");
    }
  }

  async function reconstruct() {
    setErr(null);
    try {
      const iso = new Date(at).toISOString();
      const r = await api<Pit>(
        `/audit/point-in-time?tokenId=${tokenId}&at=${encodeURIComponent(iso)}`,
        {},
        token ?? undefined
      );
      setPit(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "reconstruction failed");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        kicker="History"
        title={<Term label="Audit Trail" hint="Indexed on-chain events. Point-in-time views filter events up to timestamp T." />}
      >
        Reconstruction uses the append-only ChainEvent table, not the latest derived row. Auditor and Admin only.
      </PageHeader>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card bg-base-100 shadow-md p-4 flex flex-wrap gap-3 items-end">
          <label className="text-sm">
            Token
            <input className="input input-bordered w-full mt-1" value={tokenId} onChange={(e) => setTokenId(e.target.value)} />
          </label>
          <label className="text-sm">
            Point in time
            <input type="datetime-local" className="input input-bordered w-full mt-1" value={at} onChange={(e) => setAt(e.target.value)} />
          </label>
          <button className="btn btn-outline" onClick={loadEvents}>Load event history</button>
          <button className="btn btn-primary" onClick={reconstruct}>Reconstruct</button>
        </div>
        <HelpPanel
          title="How to read this"
          steps={[
            "Load events: every mint, transfer, attestation, freeze.",
            "Reconstruct: the system replays events up to the time you picked.",
            "Compare an earlier time with now. Quarantine should appear only after the conflict."
          ]}
        />
      </div>

      {err && <Alert kind="err">{err}</Alert>}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card bg-base-100 shadow-md overflow-auto min-h-64">
          <div className="px-4 py-2 border-b border-base-300 text-sm font-semibold">Event history</div>
          {events.length === 0 ? (
            <div className="px-4 py-6 text-sm opacity-60">No events loaded yet.</div>
          ) : (
            <ul className="divide-y divide-base-300 text-sm">
              {events.map((ev) => (
                <li key={ev.id} className="px-4 py-2 fade-in">
                  <div className="font-semibold">{ev.eventName}</div>
                  <div className="text-xs opacity-60">
                    {ev.contractName} · {new Date(ev.timestamp).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card bg-base-100 shadow-md p-4 min-h-64 space-y-3">
          <div className="text-sm font-semibold">Reconstructed state</div>
          {!pit && <div className="text-sm opacity-60">Pick a time and click Reconstruct.</div>}
          {pit && (
            <div className="space-y-2 text-sm fade-in">
              <div className="text-xs opacity-60">{pit.reconstructedFrom}</div>
              <div className="flex justify-between">
                <span>Owner</span>
                {pit.owner ? <AddressChip address={pit.owner} /> : "-"}
              </div>
              <div className="flex justify-between">
                <span>Custodian</span>
                {pit.custodian ? <AddressChip address={pit.custodian} /> : "-"}
              </div>
              <div className="flex justify-between items-center">
                <span>Quarantine</span>
                <StatusBadge value={pit.quarantined ? "Quarantined" : "Clear"} />
              </div>
              {pit.confidence && <ConfidenceMeter score={pit.confidence.score} />}
              {pit.lastAttestation && (
                <div className="text-xs opacity-80">
                  Last attestation: {pit.lastAttestation.evidenceTier}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
