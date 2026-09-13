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
        <div className="lg:col-span-2 stats stats-vertical sm:stats-horizontal shadow-md bg-base-100 w-full fade-in-up">
          <div className="stat">
            <div className="stat-title">Registered assets</div>
            <div className="stat-value text-primary">{assets.length}</div>
            <div className="stat-desc">
              <Link className="link link-primary" href="/assets">
                Open registry
              </Link>
            </div>
          </div>
          <div className="stat">
            <div className="stat-title">
              <Term label="Quarantine" hint="Non-transferable state after conflicting observations." />
            </div>
            <div className="stat-value text-error">{quarantined}</div>
            <div className="stat-desc">Blocked from transfer</div>
          </div>
          <div className="stat">
            <div className="stat-title">
              <Term label="Confidence" hint="Evidence weight x freshness decay x divergence penalty, 0-100." />
            </div>
            <div className="stat-value text-lg mt-2">
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

      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-0">
          <div className="px-4 py-3 border-b border-base-300 flex items-center justify-between">
            <div className="font-semibold">Assets on chain</div>
            <div className="text-xs opacity-60">Hover a term with ? for a definition</div>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Owner</th>
                  <th>Custodian</th>
                  <th>Confidence</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.tokenId} className="hover">
                    <td>
                      <Link className="link link-primary font-semibold" href={`/assets/${a.tokenId}`}>
                        #{a.tokenId}
                      </Link>
                      {a.assetIdentifier.includes("SEED") && (
                        <span className="ml-2">
                          <StatusBadge value="seed" />
                        </span>
                      )}
                    </td>
                    <td>
                      <AddressChip address={a.owner} />
                    </td>
                    <td>
                      <AddressChip address={a.custodian} />
                    </td>
                    <td className="w-56">
                      <ConfidenceMeter score={a.confidence.score} />
                    </td>
                    <td>
                      <StatusBadge value={a.quarantined ? "Quarantined" : "Clear"} />
                    </td>
                  </tr>
                ))}
                {assets.length === 0 && (
                  <tr>
                    <td className="py-6 opacity-60" colSpan={5}>
                      No assets minted yet. Use the Assets page (Admin) or run scripts/demo-setup.ts.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
