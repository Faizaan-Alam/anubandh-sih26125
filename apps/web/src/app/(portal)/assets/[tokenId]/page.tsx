"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { DEMO_ACCOUNTS } from "@/lib/accounts";
import { loadToken } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import { Term } from "@/components/Term";
import { PageHeader } from "@/components/PageHeader";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { AddressChip } from "@/components/AddressChip";
import { Alert } from "@/components/Alert";
import { txShort } from "@/lib/format";

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
      setMsg(`Transfer submitted. tx ${txShort(r.txHash)}`);
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
      setMsg(`Allocation submitted. tx ${txShort(r.txHash)}`);
      setErr(null);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "allocate failed");
    }
  }

  const conf = asset?.confidence as { breakdown?: Record<string, unknown> } | undefined;
  const breakdown = conf?.breakdown;
  const score = Number(breakdown?.score ?? 0);

  return (
    <div className="space-y-4 max-w-5xl">
      <PageHeader kicker="Asset NFT" title={`Asset #${tokenId}`}>
        <Link className="text-accent font-semibold" href="/assets">Back to registry</Link>
        {" · "}
        Owner is title. Custodian is possession. Confidence is not physical-world truth.
      </PageHeader>

      {asset && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white border border-line p-4 space-y-3 text-sm fade-in-up">
            <div className="font-semibold">Custody</div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-600">Owner</span>
              <AddressChip address={String(asset.owner)} />
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-600">
                <Term label="Custodian" hint="Party currently holding the asset, which may differ from the owner." />
              </span>
              <AddressChip address={String(asset.custodian)} />
            </div>
            <div className="flex justify-between gap-2 items-center">
              <span className="text-slate-600">Quarantine</span>
              <StatusBadge value={asset.quarantined ? "Quarantined" : "Clear"} />
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-600">High-value</span>
              <span>{String(asset.highValue)}</span>
            </div>
            <div>
              <div className="text-slate-600">Metadata hash</div>
              <div className="font-mono text-xs break-all mt-1">{String(asset.metadataHash)}</div>
              <div className="text-xs text-slate-500 mt-1">The raw document is off-chain. Only this hash is on-chain.</div>
            </div>
          </div>
          <div className="bg-white border border-line p-4 space-y-3 text-sm fade-in-up" style={{ animationDelay: "50ms" }}>
            <div className="font-semibold">
              <Term label="Confidence" hint="Explainable score from evidence, freshness and divergence." /> breakdown
            </div>
            <ConfidenceMeter score={score} />
            {breakdown ? (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <dt className="text-slate-500">Evidence tier</dt>
                <dd>{String(breakdown.evidenceTier)} (weight {String(breakdown.evidenceWeight)})</dd>
                <dt className="text-slate-500">Age / window</dt>
                <dd>
                  {String(breakdown.ageSeconds)}s / {String(breakdown.freshnessWindowSeconds)}s
                </dd>
                <dt className="text-slate-500">Freshness decay</dt>
                <dd>{Number(breakdown.freshnessDecay).toFixed(3)}</dd>
                <dt className="text-slate-500">Divergence penalty</dt>
                <dd>{String(breakdown.divergencePenalty)}</dd>
              </dl>
            ) : (
              <div>No attestation yet. IdentifierScan weight applies to the mint-time timestamp.</div>
            )}
            {breakdown?.explanation != null && (
              <p className="text-xs text-slate-600 leading-relaxed">{String(breakdown.explanation)}</p>
            )}
            <p className="text-xs text-slate-500">
              Cryptographic proof, human attestation, and physical-world truth are different claims. This number is
              not physical-world truth.
            </p>
          </div>
        </div>
      )}

      {Boolean(asset?.quarantined) && (
        <Alert kind="warn">
          This asset is quarantined after conflicting observations. Transfer and allocate will revert until
          reconciliation on the Divergence page.
        </Alert>
      )}

      <div className="bg-white border border-line p-4 space-y-3">
        <div className="text-sm font-semibold">Ownership / custody (Manager or Admin)</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">New owner</label>
            <select className="field" value={newOwner} onChange={(e) => setNewOwner(e.target.value)}>
              {DEMO_ACCOUNTS.map((a) => (
                <option key={a.address} value={a.address}>{a.label}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={transfer}>Transfer ownership</button>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">New custodian</label>
            <select className="field" value={newCustodian} onChange={(e) => setNewCustodian(e.target.value)}>
              {DEMO_ACCOUNTS.map((a) => (
                <option key={a.address} value={a.address}>{a.label}</option>
              ))}
            </select>
            <button className="btn btn-secondary" onClick={allocate}>Allocate custody</button>
          </div>
        </div>
        {msg && <Alert kind="ok">{msg}</Alert>}
        {err && <Alert kind="err">{err}</Alert>}
      </div>
    </div>
  );
}
