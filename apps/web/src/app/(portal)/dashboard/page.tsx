"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { loadToken } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import { Term } from "@/components/Term";
import Link from "next/link";

interface AssetRow {
  tokenId: string;
  assetIdentifier: string;
  owner: string;
  custodian: string;
  quarantined: boolean;
  highValue: boolean;
  confidence: { score: number; evidenceTier: string; hasOpenDivergence: boolean };
}

export default function DashboardPage() {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = loadToken();
    if (!token) return;
    api<{ items: AssetRow[] }>("/assets", {}, token)
      .then((r) => setAssets(r.items))
      .catch((e: Error) => setError(e.message));
  }, []);

  const quarantined = assets.filter((a) => a.quarantined).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Operations overview</h1>
        <p className="text-sm text-slate-600 mt-1">
          Live on-chain asset state. Numbers below come from AssetNFT and the confidence model, not placeholders.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-line p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Registered assets</div>
          <div className="text-3xl font-bold mt-1">{assets.length}</div>
        </div>
        <div className="bg-white border border-line p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            <Term label="Quarantine" hint="Non-transferable state after conflicting observations." />
          </div>
          <div className="text-3xl font-bold mt-1">{quarantined}</div>
        </div>
        <div className="bg-white border border-line p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            <Term label="Confidence" hint="Evidence weight x freshness decay x divergence penalty, 0-100." />
          </div>
          <div className="text-3xl font-bold mt-1">
            {assets[0] ? assets[0].confidence.score : "-"}
          </div>
          <div className="text-xs text-slate-500">Latest listed asset</div>
        </div>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-900 px-3 py-2 text-sm">{error}</div>}
      <div className="bg-white border border-line">
        <table className="w-full text-sm">
          <thead className="bg-paper text-left">
            <tr>
              <th className="px-4 py-2">Token</th>
              <th className="px-4 py-2">Owner</th>
              <th className="px-4 py-2">Custodian</th>
              <th className="px-4 py-2">Confidence</th>
              <th className="px-4 py-2">State</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.tokenId} className="border-t border-line">
                <td className="px-4 py-2">
                  <Link className="text-accent font-semibold" href={`/assets/${a.tokenId}`}>
                    #{a.tokenId}
                  </Link>
                  {a.assetIdentifier.includes("SEED") && (
                    <span className="ml-2">
                      <StatusBadge value="seed" />
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 font-mono text-xs">{a.owner.slice(0, 10)}...</td>
                <td className="px-4 py-2 font-mono text-xs">{a.custodian.slice(0, 10)}...</td>
                <td className="px-4 py-2">{a.confidence.score}</td>
                <td className="px-4 py-2">
                  <StatusBadge value={a.quarantined ? "Quarantined" : "Clear"} />
                </td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={5}>
                  No assets minted yet. Use the Assets page (Admin) or run scripts/demo-setup.ts.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
