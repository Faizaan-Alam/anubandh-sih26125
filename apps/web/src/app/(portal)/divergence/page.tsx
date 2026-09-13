"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { DEMO_ACCOUNTS } from "@/lib/accounts";
import { loadToken } from "@/lib/session";
import { Term } from "@/components/Term";
import { PageHeader } from "@/components/PageHeader";
import { HelpPanel } from "@/components/HelpPanel";
import { Alert } from "@/components/Alert";
import { StatusBadge } from "@/components/StatusBadge";
import { AddressChip } from "@/components/AddressChip";
import { txShort } from "@/lib/format";

interface DivergenceRow {
  id: string;
  tokenId: string;
  attestationA: string;
  attestationB: string;
  detectedAt: number;
  resolved: boolean;
  proposer: string;
  confirmer: string;
  pending: boolean;
}

export default function DivergencePage() {
  const [tokenId, setTokenId] = useState("1");
  const [items, setItems] = useState<DivergenceRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [divergenceId, setDivergenceId] = useState("");
  const [custodian, setCustodian] = useState(DEMO_ACCOUNTS[3].address);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const token = loadToken();

  async function load() {
    const r = await api<{ items: DivergenceRow[]; openDivergenceId: string | null }>(
      `/divergence/asset/${tokenId}`,
      {},
      token ?? undefined
    );
    setItems(r.items ?? []);
    setOpenId(r.openDivergenceId);
    if (r.openDivergenceId) setDivergenceId(String(r.openDivergenceId));
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
      setMsg(`Proposal tx ${txShort(r.txHash)}`);
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
      setMsg(`${r.note} tx ${txShort(r.txHash)}`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "confirm failed");
    }
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <PageHeader
        kicker="Conflicts"
        title={<Term label="Divergence" hint="Two attestations in the freshness window that disagree on custodian, location or condition." />}
      >
        Detection writes an immutable record and sets <Term label="Quarantine" hint="Transfers are blocked until reconciliation." />.
        History is never deleted. High-value assets require Manager proposal plus a different Admin confirmation.
      </PageHeader>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card bg-base-100 shadow-md p-4 space-y-3">
          <div className="flex gap-2">
            <input className="input input-bordered w-full" value={tokenId} onChange={(e) => setTokenId(e.target.value)} aria-label="Token id" />
            <button className="btn btn-primary" onClick={load}>Load</button>
          </div>
          {openId ? (
            <Alert kind="warn">Open divergence #{openId}. Transfers are blocked until this is reconciled.</Alert>
          ) : (
            <Alert kind="info">No open divergence for this token. Load after two conflicting attestations.</Alert>
          )}
          <label className="text-xs font-semibold opacity-80">Divergence id</label>
          <input className="input input-bordered w-full" value={divergenceId} onChange={(e) => setDivergenceId(e.target.value)} placeholder="divergence id" />
          <label className="text-xs font-semibold opacity-80">Accepted custodian after review</label>
          <select className="select select-bordered w-full" value={custodian} onChange={(e) => setCustodian(e.target.value)}>
            {DEMO_ACCOUNTS.map((a) => (
              <option key={a.address} value={a.address}>{a.label}</option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-outline" onClick={propose}>Propose reconciliation</button>
            <button className="btn btn-neutral" onClick={confirm}>Admin confirm</button>
          </div>
          {msg && <Alert kind="ok">{msg}</Alert>}
          {err && <Alert kind="err">{err}</Alert>}
        </div>
        <HelpPanel
          title="Unfreeze path"
          steps={[
            "Manager proposes the accepted custodian, location, and condition.",
            "Normal assets clear immediately.",
            "High-value assets need a different Admin to confirm. Records stay."
          ]}
        />
      </div>

      <div className="card bg-base-100 shadow-md overflow-auto">
        {items.length === 0 ? (
          <div className="px-4 py-6 text-sm opacity-60">No divergence records loaded.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="px-4 py-2">Id</th>
                <th className="px-4 py-2">Attestations</th>
                <th className="px-4 py-2">State</th>
                <th className="px-4 py-2">Actors</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t border-base-300 hover">
                  <td className="px-4 py-2">{row.id}</td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {row.attestationA} vs {row.attestationB}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge value={row.resolved ? "Clear" : "Quarantined"} />
                  </td>
                  <td className="px-4 py-2 space-y-1">
                    {row.proposer && row.proposer !== "0x0000000000000000000000000000000000000000" && (
                      <div>Proposed <AddressChip address={row.proposer} /></div>
                    )}
                    {row.confirmer && row.confirmer !== "0x0000000000000000000000000000000000000000" && (
                      <div>Confirmed <AddressChip address={row.confirmer} /></div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
