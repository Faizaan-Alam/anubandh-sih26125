"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { DEMO_ACCOUNTS } from "@/lib/accounts";
import { loadToken } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import { Term } from "@/components/Term";
import { PageHeader } from "@/components/PageHeader";
import { HelpPanel } from "@/components/HelpPanel";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { AddressChip } from "@/components/AddressChip";
import { Alert } from "@/components/Alert";
import { txShort } from "@/lib/format";

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
      setMsg(`Minted on-chain. tx ${txShort(r.txHash)} (${r.txHash})`);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "mint failed");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader kicker="Registry" title={<><Term label="Asset" hint="ERC-721 token with owner, custodian, freshness and quarantine state." /> registry</>}>
        Each row is one on-chain NFT. Owner is legal title. Custodian is who currently holds it. They can differ.
      </PageHeader>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card bg-base-100 shadow-md p-4 space-y-3">
          <div className="text-sm font-semibold">Mint (Admin only, real chain transaction)</div>
          <p className="text-xs opacity-80">
            If you are not Admin, this button still sends the request. The PEP and the contract will reject it.
          </p>
          <label className="text-xs font-semibold opacity-80">Human-readable serial (hashed on-chain)</label>
          <input
            data-testid="asset-identifier"
            className="input input-bordered w-full"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <label className="text-xs font-semibold opacity-80">Initial owner</label>
          <select className="select select-bordered w-full" value={to} onChange={(e) => setTo(e.target.value)}>
            {DEMO_ACCOUNTS.map((a) => (
              <option key={a.address} value={a.address}>
                {a.label} {a.address}
              </option>
            ))}
          </select>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={highValue} onChange={(e) => setHighValue(e.target.checked)} />
            High-value (separation of duties on quarantine release)
          </label>
          <button className="btn btn-primary" onClick={mint}>Mint asset NFT</button>
          {identifier.startsWith("SEED") && <StatusBadge value="seed" />}
          {msg && <Alert kind="ok">{msg}</Alert>}
          {err && <Alert kind="err">{err}</Alert>}
        </div>
        <HelpPanel
          title="How minting works"
          steps={[
            "Only Admin may mint. That check is on-chain.",
            "The serial is hashed. The raw label is not stored on the chain.",
            "Open a token row to see confidence, custody, and transfer controls."
          ]}
        />
      </div>

      <div className="card bg-base-100 shadow-md overflow-auto">
        <table className="table table-zebra">
          <thead>
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
              <tr key={a.tokenId} className="border-t border-base-300 hover">
                <td className="px-4 py-3">
                  <Link className="text-primary font-semibold" href={`/assets/${a.tokenId}`}>#{a.tokenId}</Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{a.assetIdentifier.slice(0, 18)}...</td>
                <td className="px-4 py-3 space-y-1">
                  <div><AddressChip address={a.owner} /></div>
                  <div><AddressChip address={a.custodian} /></div>
                </td>
                <td className="px-4 py-3 w-52">
                  <ConfidenceMeter score={a.confidence.score} />
                </td>
                <td className="px-4 py-3 space-x-1">
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
