"use client";

import { useEffect, useState } from "react";
import { formatDid } from "@anubandh/shared";
import { api } from "@/lib/api";
import { CHAIN_ID, DEMO_ACCOUNTS } from "@/lib/accounts";
import { loadStoredKey, loadToken, walletFromKey } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import { Term } from "@/components/Term";

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
      setMsg(`DID registered on-chain. tx ${r.txHash}`);
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
      setMsg(`DID revoked. tx ${r.txHash}`);
      await lookup();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "revoke failed");
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">
        <Term label="DID" hint="Decentralized identifier of the form did:ethr:chainId:address." /> registry
      </h1>
      <p className="text-sm text-slate-600">
        Registration, rotation and revocation are on-chain. Login is rejected if the recovered signer is not the
        current controller of an active DID.
      </p>
      <div className="bg-white border border-line p-4 space-y-3">
        <input className="w-full border border-line px-3 py-2 font-mono text-sm" value={did} onChange={(e) => setDid(e.target.value)} />
        <div className="flex gap-2">
          <button className="bg-accent text-white px-3 py-2 text-sm" onClick={lookup}>Lookup</button>
          <button className="border border-line px-3 py-2 text-sm" onClick={register}>Register my DID</button>
          <button className="border border-red-300 text-red-800 px-3 py-2 text-sm" onClick={revoke}>Revoke (Admin)</button>
        </div>
        {msg && <div className="text-sm text-emerald-800">{msg}</div>}
        {err && <div className="text-sm text-red-800">{err}</div>}
        {record && (
          <pre className="bg-paper border border-line p-3 text-xs overflow-auto">{JSON.stringify(record, null, 2)}</pre>
        )}
      </div>
      <div className="text-sm">
        <StatusBadge value="seed" /> Demo identities correspond to Anvil accounts:
        <ul className="mt-2 font-mono text-xs space-y-1">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.address}>
              {a.label}: {formatDid(CHAIN_ID, a.address)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
