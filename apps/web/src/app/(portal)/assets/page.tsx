"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { DEMO_ACCOUNTS } from "@/lib/accounts";
import { loadToken } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import { Term } from "@/components/Term";

interface AssetRow {
  tokenId: string;
  assetIdentifier: string;
  owner: string;
  custodian: string;
  quarantined: boolean;
  highValue: boolean;
  confidence: { score: number };
}

export default function AssetsPage() {
  const [items, setItems] = useState<AssetRow[]>([]);
  const [identifier, setIdentifier] = useState("SEED-RADIO-001");
  const [to, setTo] = useState(DEMO_ACCOUNTS[3].address);
  const [highValue, setHighValue] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const token = loadToken();

  async function refresh() {
    const r = await api<{ items: AssetRow[] }>("/assets", {}, token ?? undefined);
    setItems(r.items);
  }

  useEffect(() => {
    refresh().catch((e: Error) => setErr(e.message));
  }, []);

  async function mint() {
    if (!token) return;
    setErr(null);
    try {
      const r = await api<{ txHash: string }>("/assets/mint", {
        method: "POST",
        body: JSON.stringify({
          to,
          assetIdentifier: identifier,
          highValue,
          assetClass: highValue ? 1 : 0,
          freshnessWindowSeconds: 7 * 24 * 3600
        })
      }, token);
      setMsg(`Minted on-chain. tx ${r.txHash}`);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "mint failed");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">
        <Term label="Asset" hint="ERC-721 token with owner, custodian, freshness and quarantine state." /> registry
      </h1>
      <div className="bg-white border border-line p-4 space-y-3 max-w-3xl">
        <div className="text-sm font-semibold">Mint (Admin only, real chain transaction)</div>
        <input className="w-full border border-line px-3 py-2" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        <select className="w-full border border-line px-3 py-2" value={to} onChange={(e) => setTo(e.target.value)}>
          {DEMO_ACCOUNTS.map((a) => (
            <option key={a.address} value={a.address}>
              {a.label} {a.address}
            </option>
          ))}
        </select>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={highValue} onChange={(e) => setHighValue(e.target.checked)} />
          High-value (separation of duties on quarantine release)
        </label>
        <button className="bg-accent text-white px-3 py-2 text-sm" onClick={mint}>Mint asset NFT</button>
        {identifier.startsWith("SEED") && <StatusBadge value="seed" />}
        {msg && <div className="text-sm text-emerald-800">{msg}</div>}
        {err && <div className="text-sm text-red-800 bg-red-50 border border-red-200 px-3 py-2">{err}</div>}
      </div>
      <div className="bg-white border border-line overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-paper text-left">
            <tr>
              <th className="px-4 py-2">Token</th>
              <th className="px-4 py-2">Identifier hash</th>
              <th className="px-4 py-2">Owner / Custodian</th>
              <th className="px-4 py-2">Confidence</th>
              <th className="px-4 py-2">Flags</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.tokenId} className="border-t border-line">
                <td className="px-4 py-2">
                  <Link className="text-accent font-semibold" href={`/assets/${a.tokenId}`}>#{a.tokenId}</Link>
                </td>
                <td className="px-4 py-2 font-mono text-xs">{a.assetIdentifier.slice(0, 18)}...</td>
                <td className="px-4 py-2 font-mono text-xs">
                  {a.owner.slice(0, 8)}... / {a.custodian.slice(0, 8)}...
                </td>
                <td className="px-4 py-2">{a.confidence.score}</td>
                <td className="px-4 py-2 space-x-1">
                  <StatusBadge value={a.quarantined ? "Quarantined" : "Clear"} />
                  {a.highValue && <StatusBadge value="high" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
