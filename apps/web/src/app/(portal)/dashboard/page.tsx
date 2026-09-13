"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { loadToken } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import { Term } from "@/components/Term";
import { PageHeader } from "@/components/PageHeader";
import { HelpPanel } from "@/components/HelpPanel";
import { FlowSteps } from "@/components/FlowSteps";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { AddressChip } from "@/components/AddressChip";
import { Alert } from "@/components/Alert";

interface AssetRow {
  tokenId: string;
  assetIdentifier: string;
  owner: string;
  custodian: string;
  quarantined: boolean;
  highValue: boolean;
  confidence: { score: number; evidenceTier: string; hasOpenDivergence: boolean };
}

const FLOW = [
  { label: "Identity", hint: "DID + live role from RoleManager" },
  { label: "Asset NFT", hint: "Admin mints a unique token" },
  { label: "Attestation", hint: "Someone signs what they observed" },
  { label: "Trust score", hint: "Evidence x freshness x conflict" },
  { label: "Audit", hint: "Replay any moment from events" }
];

export default function DashboardPage() {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    const token = loadToken();
    if (!token) return;
    api<{ items: AssetRow[] }>("/assets", {}, token)
      .then((r) => setAssets(r.items))
      .catch((e: Error) => setError(e.message));
    api<{ role: string }>("/session", {}, token)
      .then((s) => setRole(s.role))
      .catch(() => undefined);
  }, []);

  const quarantined = assets.filter((a) => a.quarantined).length;
  const avg =
    assets.length === 0 ? 0 : Math.round(assets.reduce((s, a) => s + (a.confidence?.score ?? 0), 0) / assets.length);

  return (
    <div className="space-y-6">
      <PageHeader kicker="Home" title="Operations overview">
        Live on-chain asset state. Numbers below come from AssetNFT and the confidence model, not placeholders.
      </PageHeader>

      <FlowSteps steps={FLOW} />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-line p-4 fade-in-up">
            <div className="text-xs uppercase tracking-wide text-slate-500">Registered assets</div>
            <div className="text-3xl font-bold mt-1">{assets.length}</div>
            <Link className="text-xs text-accent font-semibold" href="/assets">
              Open registry
            </Link>
          </div>
          <div className="bg-white border border-line p-4 fade-in-up" style={{ animationDelay: "40ms" }}>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              <Term label="Quarantine" hint="Non-transferable state after conflicting observations." />
            </div>
            <div className="text-3xl font-bold mt-1">{quarantined}</div>
            <div className="text-xs text-slate-500">Blocked from transfer</div>
          </div>
          <div className="bg-white border border-line p-4 fade-in-up" style={{ animationDelay: "80ms" }}>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              <Term label="Confidence" hint="Evidence weight x freshness decay x divergence penalty, 0-100." />
            </div>
            <div className="mt-3">
              <ConfidenceMeter score={assets[0]?.confidence.score ?? avg} label="First listed / average" />
            </div>
          </div>
        </div>
        <HelpPanel
          title={role ? `What ${role} should do next` : "Suggested next steps"}
          steps={
            role === "Admin"
              ? [
                  "Mint or inspect an asset on Assets.",
                  "Grant a role on Roles if needed.",
                  "If a high-value item is frozen, confirm reconciliation after a Manager proposes it."
                ]
              : role === "Manager"
                ? [
                    "Allocate custody or transfer only if the asset is Clear.",
                    "Ask two Users to attest different locations to demo Divergence.",
                    "Propose reconciliation to unfreeze a normal asset."
                  ]
                : role === "Auditor"
                  ? [
                      "Open Audit Trail and load events for token 1.",
                      "Pick an earlier time and Reconstruct.",
                      "You cannot mint or transfer. That is expected."
                    ]
                  : [
                      "Open Attestations and submit a SignedInspection.",
                      "Sign out, log in as User 2, submit a conflicting observation.",
                      "Trying Mint should fail. The contract is the real gate."
                    ]
          }
        />
      </div>

      {error && <Alert kind="err">{error}</Alert>}

      <div className="bg-white border border-line overflow-auto">
        <div className="px-4 py-3 border-b border-line flex items-center justify-between">
          <div className="font-semibold text-sm">Assets on chain</div>
          <div className="text-xs text-slate-500">Hover a term with ? for a definition</div>
        </div>
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
              <tr key={a.tokenId} className="border-t border-line table-row">
                <td className="px-4 py-3">
                  <Link className="text-accent font-semibold" href={`/assets/${a.tokenId}`}>
                    #{a.tokenId}
                  </Link>
                  {a.assetIdentifier.includes("SEED") && (
                    <span className="ml-2">
                      <StatusBadge value="seed" />
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <AddressChip address={a.owner} />
                </td>
                <td className="px-4 py-3">
                  <AddressChip address={a.custodian} />
                </td>
                <td className="px-4 py-3 w-56">
                  <ConfidenceMeter score={a.confidence.score} />
                </td>
                <td className="px-4 py-3">
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
