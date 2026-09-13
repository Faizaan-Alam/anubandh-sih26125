"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { DEMO_ACCOUNTS } from "@/lib/accounts";
import { loadToken } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import { Term } from "@/components/Term";
import { PageHeader } from "@/components/PageHeader";
import { HelpPanel } from "@/components/HelpPanel";
import { Alert } from "@/components/Alert";
import { txShort } from "@/lib/format";

const ROLE_HELP: Record<string, string> = {
  Admin: "Mints assets, grants roles, revokes DIDs, confirms high-value unfreeze.",
  Manager: "Allocates custody, transfers, proposes reconciliation, may attest.",
  Auditor: "Reads history only. Cannot change assets or roles.",
  User: "Submits attestations. Cannot mint or transfer."
};

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
      setMsg(`Role granted on-chain. tx ${txShort(r.txHash)}`);
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
      setMsg(`Role revoked on-chain. tx ${txShort(r.txHash)}`);
      await lookup();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "revoke failed");
    }
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <PageHeader
        kicker="Access control"
        title={<><Term label="Role" hint="Admin, Manager, Auditor or User, enforced by RoleManager." /> administration</>}
      >
        Grant and revoke are Admin-only at the contract. A User session that calls these routes is rejected by the
        PEP after a fresh RoleManager check, and a direct contract call from a non-Admin reverts.
      </PageHeader>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {Object.entries(ROLE_HELP).map(([name, text]) => (
          <div key={name} className="bg-white border border-line p-3 fade-in-up">
            <StatusBadge value={name} />
            <p className="text-xs text-slate-600 mt-2 leading-snug">{text}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-line p-4 space-y-3">
          <label className="text-sm font-semibold">Account</label>
          <select className="field" value={account} onChange={(e) => setAccount(e.target.value)}>
            {DEMO_ACCOUNTS.map((a) => (
              <option key={a.address} value={a.address}>
                {a.label} {a.address}
              </option>
            ))}
          </select>
          <label className="text-sm font-semibold">Role</label>
          <select className="field" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
            <option>Admin</option>
            <option>Manager</option>
            <option>Auditor</option>
            <option>User</option>
          </select>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={lookup}>Read on-chain role</button>
            <button className="btn btn-secondary" onClick={grant}>Grant</button>
            <button className="btn btn-danger" onClick={revoke}>Revoke</button>
          </div>
          {msg && <Alert kind="ok">{msg}</Alert>}
          {err && <Alert kind="err">{err}</Alert>}
          {info && (
            <div className="text-sm space-y-1 fade-in">
              <div>
                Current role: <StatusBadge value={String(info.role)} />
              </div>
              <div className="text-xs text-slate-500">{String(info.roleSource)}</div>
            </div>
          )}
        </div>
        <HelpPanel
          title="Try this"
          steps={[
            "Read the on-chain role for User. It should be User.",
            "Sign in as User and try Grant. Expect a policy failure.",
            "Sign back in as Admin if you need to restore a role."
          ]}
        />
      </div>
    </div>
  );
}
