"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { DEMO_ACCOUNTS } from "@/lib/accounts";
import { loadToken } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import { Term } from "@/components/Term";

export default function RolesPage() {
  const [account, setAccount] = useState(DEMO_ACCOUNTS[3].address);
  const [role, setRole] = useState<"Admin" | "Manager" | "Auditor" | "User">("User");
  const [info, setInfo] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const token = loadToken();

  async function lookup() {
    setErr(null);
    const r = await api<Record<string, unknown>>(`/roles/${account}`, {}, token ?? undefined);
    setInfo(r);
  }

  async function grant() {
    if (!token) return;
    setErr(null);
    try {
      const r = await api<{ txHash: string }>("/roles/grant", {
        method: "POST",
        body: JSON.stringify({ account, role })
      }, token);
      setMsg(`Role granted on-chain. tx ${r.txHash}`);
      await lookup();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "grant failed");
    }
  }

  async function revoke() {
    if (!token) return;
    setErr(null);
    try {
      const r = await api<{ txHash: string }>("/roles/revoke", {
        method: "POST",
        body: JSON.stringify({ account, role })
      }, token);
      setMsg(`Role revoked on-chain. tx ${r.txHash}`);
      await lookup();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "revoke failed");
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">
        <Term label="Role" hint="Admin, Manager, Auditor or User, enforced by RoleManager." /> administration
      </h1>
      <p className="text-sm text-slate-600">
        Grant and revoke are Admin-only at the contract. A User session that calls these routes is rejected by the
        PEP after a fresh RoleManager check, and a direct contract call from a non-Admin reverts.
      </p>
      <div className="bg-white border border-line p-4 space-y-3">
        <label className="text-sm font-semibold">Account</label>
        <select className="w-full border border-line px-3 py-2" value={account} onChange={(e) => setAccount(e.target.value)}>
          {DEMO_ACCOUNTS.map((a) => (
            <option key={a.address} value={a.address}>
              {a.label} {a.address}
            </option>
          ))}
        </select>
        <label className="text-sm font-semibold">Role</label>
        <select className="w-full border border-line px-3 py-2" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
          <option>Admin</option>
          <option>Manager</option>
          <option>Auditor</option>
          <option>User</option>
        </select>
        <div className="flex gap-2">
          <button className="bg-accent text-white px-3 py-2 text-sm" onClick={lookup}>Read on-chain role</button>
          <button className="border border-line px-3 py-2 text-sm" onClick={grant}>Grant</button>
          <button className="border border-red-300 text-red-800 px-3 py-2 text-sm" onClick={revoke}>Revoke</button>
        </div>
        {msg && <div className="text-sm text-emerald-800">{msg}</div>}
        {err && <div className="text-sm text-red-800 bg-red-50 border border-red-200 px-3 py-2">{err}</div>}
        {info && (
          <div className="text-sm space-y-1">
            <div>
              Current role: <StatusBadge value={String(info.role)} />
            </div>
            <div className="text-xs text-slate-500">{String(info.roleSource)}</div>
            <pre className="bg-paper border border-line p-3 text-xs overflow-auto">{JSON.stringify(info, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
