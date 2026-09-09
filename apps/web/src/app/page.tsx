"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_ACCOUNTS, IS_SEED_DATA } from "@/lib/accounts";
import { loginWithKey } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";

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

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white border border-line shadow-sm">
        <div className="bg-navy text-white px-6 py-5">
          <h1 className="text-2xl font-bold">ANUBANDH</h1>
          <p className="text-sm text-slate-300 mt-1">
            Decentralized identity, access control and digital asset management
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <StatusBadge value="demo" />
            {IS_SEED_DATA && <StatusBadge value="seed" />}
            <span className="text-sm text-slate-600">Challenge-response login. No passwords.</span>
          </div>
          <label className="block text-sm font-semibold">Demo signer (Anvil local key)</label>
          <select
            className="w-full border border-line px-3 py-2 bg-white"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {DEMO_ACCOUNTS.map((a) => (
              <option key={a.address} value={a.privateKey}>
                {a.label} ({a.roleHint}) {a.address.slice(0, 10)}...
              </option>
            ))}
          </select>
          <label className="block text-sm font-semibold">Or paste a local private key</label>
          <input
            className="w-full border border-line px-3 py-2 font-mono text-sm"
            placeholder="0x..."
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
          {error && <div className="bg-red-50 border border-red-200 text-red-900 text-sm px-3 py-2">{error}</div>}
          <button
            onClick={onLogin}
            disabled={busy}
            className="bg-accent text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {busy ? "Verifying signature and on-chain DID..." : "Sign challenge and enter"}
          </button>
          <p className="text-xs text-slate-500">
            The backend recovers the signer, checks DIDRegistry for the current controller, and reads the
            role from RoleManager. The session token is not the authorization boundary.
          </p>
        </div>
      </div>
    </div>
  );
}
