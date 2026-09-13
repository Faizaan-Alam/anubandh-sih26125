"use client";

import { useEffect, useState } from "react";
import { formatDid } from "@anubandh/shared";
import { api } from "@/lib/api";
import { CHAIN_ID, DEMO_ACCOUNTS } from "@/lib/accounts";
import { loadStoredKey, loadToken, walletFromKey } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import { Term } from "@/components/Term";
import { PageHeader } from "@/components/PageHeader";
import { HelpPanel } from "@/components/HelpPanel";
import { Alert } from "@/components/Alert";
import { AddressChip } from "@/components/AddressChip";
import { txShort } from "@/lib/format";

export default function IdentityPage() {
  const [did, setDid] = useState("");
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const token = loadToken();

  useEffect(() => {
    const key = loadStoredKey();
    if (key) {
      const w = walletFromKey(key);
      setDid(formatDid(CHAIN_ID, w.address));
    }
  }, []);

  async function lookup() {
    setErr(null);
    try {
      const r = await api<Record<string, unknown>>(`/identity/${encodeURIComponent(did)}`, {}, token ?? undefined);
      setRecord(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "lookup failed");
    }
  }

  async function register() {
    setErr(null);
    const key = loadStoredKey();
    if (!key || !token) return;
    const w = walletFromKey(key);
    try {
      const r = await api<{ txHash: string }>("/identity/register", {
        method: "POST",
        body: JSON.stringify({ did: formatDid(CHAIN_ID, w.address), controller: w.address })
      }, token);
      setMsg(`DID registered on-chain. tx ${txShort(r.txHash)}`);
      await lookup();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "register failed");
    }
  }

  async function revoke() {
    if (!token) return;
    try {
      const r = await api<{ txHash: string }>("/identity/revoke", {
        method: "POST",
        body: JSON.stringify({ did })
      }, token);
      setMsg(`DID revoked. tx ${txShort(r.txHash)}`);
      await lookup();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "revoke failed");
    }
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <PageHeader
        kicker="People"
        title={<><Term label="DID" hint="Decentralized identifier of the form did:ethr:chainId:address." /> registry</>}
      >
        Registration, rotation and revocation are on-chain. Login is rejected if the recovered signer is not the
        current controller of an active DID.
      </PageHeader>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card bg-base-100 shadow-md p-4 space-y-3">
          <label className="text-xs font-semibold opacity-80">DID to inspect</label>
          <input className="input input-bordered w-full font-mono text-sm" value={did} onChange={(e) => setDid(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={lookup}>Lookup</button>
            <button className="btn btn-outline" onClick={register}>Register my DID</button>
            <button className="btn btn-error btn-outline" onClick={revoke}>Revoke (Admin)</button>
          </div>
          {msg && <Alert kind="ok">{msg}</Alert>}
          {err && <Alert kind="err">{err}</Alert>}
          {record && (
            <dl className="grid grid-cols-2 gap-2 text-sm border border-base-300 bg-base-200 p-3 fade-in">
              <dt className="opacity-60">Status</dt>
              <dd><StatusBadge value={String(record.status)} /></dd>
              <dt className="opacity-60">Controller</dt>
              <dd><AddressChip address={String(record.controller)} /></dd>
              <dt className="opacity-60">Registered at</dt>
              <dd className="font-mono text-xs">{String(record.registeredAt)}</dd>
              <dt className="opacity-60">Revoked at</dt>
              <dd className="font-mono text-xs">{String(record.revokedAt || 0)}</dd>
            </dl>
          )}
        </div>
        <HelpPanel
          title="Why DIDs matter"
          steps={[
            "A DID names a person without a password database.",
            "The controller key can rotate. The DID string stays the same.",
            "Revoked DIDs cannot log in or attest."
          ]}
        />
      </div>

      <div className="card bg-base-100 shadow-md p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <StatusBadge value="seed" /> Demo identities (Anvil accounts)
        </div>
        <ul className="mt-3 divide-y divide-base-300">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.address} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold">{a.label}</span>
              <span className="font-mono text-xs opacity-80">{formatDid(CHAIN_ID, a.address)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
