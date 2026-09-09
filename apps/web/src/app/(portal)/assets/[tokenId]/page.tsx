"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { DEMO_ACCOUNTS } from "@/lib/accounts";
import { loadToken } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import { Term } from "@/components/Term";

export default function AssetDetailPage() {
  const params = useParams<{ tokenId: string }>();
  const tokenId = params.tokenId;
  const [asset, setAsset] = useState<Record<string, unknown> | null>(null);
  const [newOwner, setNewOwner] = useState(DEMO_ACCOUNTS[4].address);
  const [newCustodian, setNewCustodian] = useState(DEMO_ACCOUNTS[4].address);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const token = loadToken();

  async function refresh() {
    const r = await api<Record<string, unknown>>(`/assets/${tokenId}`, {}, token ?? undefined);
    setAsset(r);
  }

  useEffect(() => {
    refresh().catch((e: Error) => setErr(e.message));
  }, [tokenId]);

  async function transfer() {
    if (!token) return;
    try {
      const r = await api<{ txHash: string }>("/assets/transfer", {
        method: "POST",
        body: JSON.stringify({ tokenId, newOwner })
      }, token);
      setMsg(`Transfer submitted. tx ${r.txHash}`);
      setErr(null);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "transfer failed");
    }
  }

  async function allocate() {
    if (!token) return;
    try {
      const r = await api<{ txHash: string }>("/assets/allocate", {
        method: "POST",
        body: JSON.stringify({ tokenId, newCustodian })
      }, token);
      setMsg(`Allocation submitted. tx ${r.txHash}`);
      setErr(null);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "allocate failed");
    }
  }

  const conf = asset?.confidence as { breakdown?: Record<string, unknown> } | undefined;
  const breakdown = conf?.breakdown;

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold">Asset #{tokenId}</h1>
      {asset && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white border border-line p-4 space-y-2 text-sm">
            <div>Owner: <span className="font-mono text-xs">{String(asset.owner)}</span></div>
            <div>
              <Term label="Custodian" hint="Party currently holding the asset, which may differ from the owner." />:{" "}
              <span className="font-mono text-xs">{String(asset.custodian)}</span>
            </div>
            <div>Quarantine: <StatusBadge value={asset.quarantined ? "Quarantined" : "Clear"} /></div>
            <div>High-value: {String(asset.highValue)}</div>
            <div>Metadata hash: <span className="font-mono text-xs break-all">{String(asset.metadataHash)}</span></div>
            <div className="text-xs text-slate-500">The raw document is off-chain. Only this hash is on-chain.</div>
          </div>
          <div className="bg-white border border-line p-4 space-y-2 text-sm">
            <div className="font-semibold">
              <Term label="Confidence" hint="Explainable score from evidence, freshness and divergence." /> breakdown
            </div>
            {breakdown ? (
              <ul className="text-sm space-y-1">
                <li>Score: <strong>{String(breakdown.score)}</strong> / 100</li>
                <li>Evidence tier: {String(breakdown.evidenceTier)} (weight {String(breakdown.evidenceWeight)})</li>
                <li>Age: {String(breakdown.ageSeconds)}s / window {String(breakdown.freshnessWindowSeconds)}s</li>
                <li>Freshness decay: {String(breakdown.freshnessDecay)}</li>
                <li>Divergence penalty: {String(breakdown.divergencePenalty)}</li>
                <li className="text-slate-600">{String(breakdown.explanation)}</li>
              </ul>
            ) : (
              <div>No attestation yet. IdentifierScan weight applies to the mint-time timestamp.</div>
            )}
            <p className="text-xs text-slate-500">
              Cryptographic proof, human attestation, and physical-world truth are different claims. This number is
              not physical-world truth.
            </p>
          </div>
        </div>
      )}
      <div className="bg-white border border-line p-4 space-y-3">
        <div className="text-sm font-semibold">Ownership / custody (Manager or Admin)</div>
        <div className="flex flex-wrap gap-2">
          <select className="border border-line px-2 py-1" value={newOwner} onChange={(e) => setNewOwner(e.target.value)}>
            {DEMO_ACCOUNTS.map((a) => (
              <option key={a.address} value={a.address}>{a.label}</option>
            ))}
          </select>
          <button className="bg-accent text-white px-3 py-1 text-sm" onClick={transfer}>Transfer ownership</button>
          <select className="border border-line px-2 py-1" value={newCustodian} onChange={(e) => setNewCustodian(e.target.value)}>
            {DEMO_ACCOUNTS.map((a) => (
              <option key={a.address} value={a.address}>{a.label}</option>
            ))}
          </select>
          <button className="border border-line px-3 py-1 text-sm" onClick={allocate}>Allocate custody</button>
        </div>
        {msg && <div className="text-sm text-emerald-800">{msg}</div>}
        {err && <div className="text-sm text-red-800 bg-red-50 border border-red-200 px-3 py-2">{err}</div>}
      </div>
    </div>
  );
}
