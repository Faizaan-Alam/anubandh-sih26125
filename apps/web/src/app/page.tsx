"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_ACCOUNTS, IS_SEED_DATA } from "@/lib/accounts";
import { loginWithKey } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";

const LOGIN_STEPS = [
  "Pick a demo signer. Admin can mint. User can only attest.",
  "The portal asks the backend for a one-time nonce.",
  "Your local key signs DID + address + nonce. No password.",
  "The backend checks DIDRegistry and RoleManager on-chain, then opens a session."
];

export default function LoginPage() {
  const router = useRouter();
  const [selected, setSelected] = useState(DEMO_ACCOUNTS[0].privateKey);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onLogin() {
    setBusy(true);
    setError(null);
    try {
      await loginWithKey(custom.trim() || selected);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  const chosen = DEMO_ACCOUNTS.find((a) => a.privateKey === selected);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-0 bg-white border border-line shadow-sm fade-in-up">
        <div className="bg-navy text-white px-7 py-8 flex flex-col">
          <div className="text-xs uppercase tracking-wide text-slate-300">SIH26125 · Bharat Electronics Limited</div>
          <h1 className="text-3xl font-bold mt-2">ANUBANDH</h1>
          <p className="text-sm text-slate-300 mt-3 leading-relaxed">
            A permissioned blockchain portal for identity, role-based access, NFT assets, signed observations,
            conflict freeze, and an immutable audit trail.
          </p>
          <ol className="mt-8 space-y-3 text-sm">
            {LOGIN_STEPS.map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-white/10 text-xs font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-slate-200 leading-snug">{step}</span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-slate-400 mt-auto pt-8 leading-relaxed">
            Hiding a button is not security. Contracts reject unauthorized callers even if you bypass this screen.
          </p>
        </div>
        <div className="p-7 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge value="demo" />
            {IS_SEED_DATA && <StatusBadge value="seed" />}
            <span className="text-sm text-slate-600">Challenge-response login. No passwords.</span>
          </div>
          <label className="block text-sm font-semibold">Who are you signing in as?</label>
          <select
            className="field"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {DEMO_ACCOUNTS.map((a) => (
              <option key={a.address} value={a.privateKey}>
                {a.label} ({a.roleHint}) {a.address.slice(0, 10)}...
              </option>
            ))}
          </select>
          {chosen && (
            <div className="text-xs text-slate-600 border border-line bg-paper px-3 py-2">
              {chosen.label === "Admin" && "Can mint assets, grant roles, revoke DIDs, confirm high-value unfreeze."}
              {chosen.label === "Manager" && "Can allocate custody, transfer assets, propose reconciliation, attest."}
              {chosen.label === "Auditor" && "Read-only: event history and point-in-time reconstruction."}
              {chosen.label === "User" && "Can attest observations. Cannot mint or transfer. Try mint to see a 403."}
              {chosen.label === "User 2" && "Second observer. Use this after User to create a conflicting attestation."}
            </div>
          )}
          <label className="block text-sm font-semibold">Or paste a local private key</label>
          <input
            className="field font-mono text-sm"
            placeholder="0x..."
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
          {error && <div className="bg-red-50 border border-red-200 text-red-900 text-sm px-3 py-2 fade-in">{error}</div>}
          <button
            onClick={onLogin}
            disabled={busy}
            className="btn btn-primary w-full"
          >
            {busy ? "Verifying signature and on-chain DID..." : "Sign challenge and enter"}
          </button>
          <p className="text-xs text-slate-500 leading-relaxed">
            The backend recovers the signer, checks DIDRegistry for the current controller, and reads the
            role from RoleManager. The session token is not the authorization boundary.
          </p>
        </div>
      </div>
    </div>
  );
}
