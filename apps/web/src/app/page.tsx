"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_ACCOUNTS, IS_SEED_DATA } from "@/lib/accounts";
import { loginWithKey } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

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
    <div className="min-h-screen bg-base-200">
      <div className="navbar bg-base-100 shadow-sm sticky top-0 z-20">
        <div className="flex-1 px-2">
          <span className="text-lg font-black tracking-wide">ANUBANDH</span>
          <span className="ml-2 text-xs opacity-60 hidden sm:inline">SIH26125</span>
        </div>
        <div className="flex-none px-2">
          <ThemeSwitcher />
        </div>
      </div>

      <div className="hero min-h-[calc(100vh-4rem)]">
        <div className="hero-content flex-col lg:flex-row gap-8 max-w-6xl w-full py-10">
          <div className="lg:w-1/2 fade-in-up">
            <div className="badge badge-primary badge-outline mb-3">Bharat Electronics Limited</div>
            <h1 className="text-4xl md:text-5xl font-black leading-tight">
              Identity. Assets.
              <span className="text-primary"> Trust you can audit.</span>
            </h1>
            <p className="py-5 opacity-80 leading-relaxed">
              A permissioned blockchain portal for identity, role-based access, NFT assets, signed observations,
              conflict freeze, and an immutable audit trail.
            </p>
            <ul className="steps steps-vertical w-full">
              {LOGIN_STEPS.map((step) => (
                <li key={step} className="step step-primary">
                  <span className="text-left text-sm font-normal">{step}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs opacity-60 mt-6 leading-relaxed">
              Hiding a button is not security. Contracts reject unauthorized callers even if you bypass this screen.
            </p>
          </div>

          <div className="card bg-base-100 shadow-xl w-full max-w-md fade-in-up hover-lift" style={{ animationDelay: "80ms" }}>
            <div className="card-body">
              <h2 className="card-title">Enter the portal</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge value="demo" />
                {IS_SEED_DATA && <StatusBadge value="seed" />}
                <span className="text-sm opacity-70">Challenge-response login. No passwords.</span>
              </div>
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text font-semibold">Who are you signing in as?</span>
                </div>
                <select
                  data-testid="demo-signer"
                  className="select select-bordered w-full"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {DEMO_ACCOUNTS.map((a) => (
                    <option key={a.address} value={a.privateKey}>
                      {a.label} ({a.roleHint}) {a.address.slice(0, 10)}...
                    </option>
                  ))}
                </select>
              </label>
              {chosen && (
                <div className="alert text-sm">
                  <span>
                    {chosen.label === "Admin" && "Can mint assets, grant roles, revoke DIDs, confirm high-value unfreeze."}
                    {chosen.label === "Manager" && "Can allocate custody, transfer assets, propose reconciliation, attest."}
                    {chosen.label === "Auditor" && "Read-only: event history and point-in-time reconstruction."}
                    {chosen.label === "User" && "Can attest observations. Cannot mint or transfer. Try mint to see a 403."}
                    {chosen.label === "User 2" && "Second observer. Use this after User to create a conflicting attestation."}
                  </span>
                </div>
              )}
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text font-semibold">Or paste a local private key</span>
                </div>
                <input
                  className="input input-bordered font-mono text-sm"
                  placeholder="0x..."
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                />
              </label>
              {error && (
                <div className="alert alert-error text-sm">
                  <span>{error}</span>
                </div>
              )}
              <button onClick={onLogin} disabled={busy} className="btn btn-primary mt-2">
                {busy && <span className="loading loading-spinner loading-sm" />}
                {busy ? "Verifying signature and on-chain DID..." : "Sign challenge and enter"}
              </button>
              <p className="text-xs opacity-60 leading-relaxed">
                The backend recovers the signer, checks DIDRegistry for the current controller, and reads the
                role from RoleManager. The session token is not the authorization boundary.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
