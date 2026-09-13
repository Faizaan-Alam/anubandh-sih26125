"use client";

import { useEffect, useState } from "react";
import { Wallet, hexlify, randomBytes } from "ethers";
import { formatDid } from "@anubandh/shared";
import { buildLoginMessage, signOfflineDecision } from "@anubandh/crypto";
import { currentPolicySnapshot, evaluateOfflineOperation, STALENESS_LIMITS_SECONDS } from "@anubandh/policy";
import { idbGet, idbSet, queueAll, queuePut } from "@/lib/idb";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 31337);

const DEMO = {
  label: "User",
  address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
};

interface Snapshot {
  capturedAt: number;
  identity: { did: string; address: string; role: string };
  policy: ReturnType<typeof currentPolicySnapshot>;
  credentials: unknown[];
}

interface Queued {
  nonce: string;
  operation: string;
  riskTier: string;
  allowed: boolean;
  reason: string;
  signature: string;
  signedAt: number;
  snapshotAgeSeconds: number;
  reconciled?: boolean;
  reconcileReason?: string;
}

export default function VerifierHome() {
  const [online, setOnline] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [queue, setQueue] = useState<Queued[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [sw, setSw] = useState("unregistered");

  function push(line: string) {
    setLog((l) => [line, ...l].slice(0, 20));
  }

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then(
        () => setSw("registered"),
        () => setSw("failed")
      );
    }
    idbGet<Snapshot>("snapshot").then((s) => s && setSnapshot(s));
    queueAll().then((items) => setQueue(items as unknown as Queued[]));
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  async function loginAndSync() {
    const wallet = new Wallet(DEMO.privateKey);
    const did = formatDid(CHAIN_ID, wallet.address);
    const challenge = await fetch(`${API}/auth/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: wallet.address, did })
    }).then((r) => r.json());
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await wallet.signMessage(
      buildLoginMessage({ did, address: wallet.address, nonce: challenge.nonce, timestamp })
    );
    const session = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: wallet.address, did, nonce: challenge.nonce, timestamp, signature })
    }).then((r) => r.json());
    if (!session.token) throw new Error(session.error ?? "login failed");
    setToken(session.token);
    const snap = await fetch(`${API}/offline/snapshot`, {
      headers: { Authorization: `Bearer ${session.token}` }
    }).then((r) => r.json());
    const stored: Snapshot = {
      capturedAt: snap.capturedAt,
      identity: snap.identity,
      policy: snap.policy ?? currentPolicySnapshot(),
      credentials: snap.credentials ?? []
    };
    await idbSet("snapshot", stored);
    await idbSet("token", session.token);
    setSnapshot(stored);
    push("Synced trust anchors, credential status and policy snapshot into IndexedDB.");
  }

  async function decide(operation: string) {
    const snap = snapshot ?? (await idbGet<Snapshot>("snapshot"));
    if (!snap) {
      push("No cached snapshot. Sync while online first.");
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    const gate = evaluateOfflineOperation({
      operation,
      snapshotCapturedAt: snap.capturedAt,
      now
    });
    const wallet = new Wallet(DEMO.privateKey);
    const nonce = hexlify(randomBytes(32));
    const signedAt = now;
    const payload = {
      actorDid: snap.identity.did,
      actorAddress: wallet.address,
      operation,
      riskTier: gate.riskTier,
      allowed: gate.allowed,
      reason: gate.reason,
      nonce,
      signedAt
    };
    const signature = await signOfflineDecision(wallet, payload);
    const record = {
      ...payload,
      snapshotAgeSeconds: gate.snapshotAgeSeconds,
      payload: { operation },
      signature,
      reconciled: false
    };
    await queuePut(record);
    const all = (await queueAll()) as unknown as Queued[];
    setQueue(all);
    push(`${gate.allowed ? "ALLOWED" : "DENIED"} ${operation}: ${gate.reason}`);
  }

  async function ageSnapshot() {
    const snap = snapshot ?? (await idbGet<Snapshot>("snapshot"));
    if (!snap) return;
    const aged = { ...snap, capturedAt: snap.capturedAt - STALENESS_LIMITS_SECONDS.high - 60 };
    await idbSet("snapshot", aged);
    setSnapshot(aged);
    push("Aged cached snapshot beyond the high-risk staleness bound (demo helper).");
  }

  async function reconnect() {
    const tokenNow = token ?? ((await idbGet<string>("token")) || null);
    if (!tokenNow) {
      push("No session. Login while online first.");
      return;
    }
    const items = (await queueAll()) as unknown as Queued[];
    for (const item of items) {
      if (item.reconciled) continue;
      const res = await fetch(`${API}/offline/reconcile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenNow}` },
        body: JSON.stringify({
          actorDid: snapshot?.identity.did,
          actorAddress: DEMO.address,
          operation: item.operation,
          riskTier: item.riskTier,
          snapshotAgeSeconds: item.snapshotAgeSeconds,
          allowed: item.allowed,
          reason: item.reason,
          payload: { operation: item.operation },
          signedAt: item.signedAt,
          nonce: item.nonce,
          signature: item.signature
        })
      }).then((r) => r.json());
      item.reconciled = true;
      item.reconcileReason = res.reconcileReason ?? res.error;
      await queuePut(item as unknown as Record<string, unknown>);
      push(`Reconciled ${item.operation}: ${item.reconcileReason}`);
    }
    setQueue((await queueAll()) as unknown as Queued[]);
  }

  const age = snapshot ? Math.max(0, Math.floor(Date.now() / 1000) - snapshot.capturedAt) : null;

  return (
    <div className="min-h-screen bg-base-200">
      <header className="navbar bg-neutral text-neutral-content shadow-md">
        <div className="flex-1 px-2">
          <div className="font-black tracking-wide">ANUBANDH Verifier</div>
          <div className="text-xs opacity-70">Installable PWA · SW {sw}</div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <span
            data-testid="online-status"
            className={`badge ${online ? "badge-success" : "badge-error"}`}
          >
            {online ? "Online" : "Offline"}
          </span>
        </div>
      </header>
      <main className="p-4 space-y-4 max-w-3xl mx-auto">
        <div className="card bg-base-100 shadow-md text-sm fade-in-up">
          <div className="card-body p-4">
            <h2 className="card-title text-base">How this screen works</h2>
            <ol className="mt-1 space-y-1 list-decimal list-inside opacity-80">
              <li>While online, cache keys, role, and policy into IndexedDB.</li>
              <li>Disconnect the network. A low-risk identifier scan is allowed.</li>
              <li>Age the snapshot, then try a high-risk transfer. It should be denied.</li>
              <li>Reconnect to submit the signed queue for reconciliation.</li>
            </ol>
          </div>
        </div>
        <div className="alert alert-warning text-sm">
          <span>Demo signer: {DEMO.label} {DEMO.address.slice(0, 10)}... (Anvil public key)</span>
        </div>
        <div className="card bg-base-100 shadow-md text-sm fade-in-up">
          <div className="card-body p-4 space-y-2">
            <div>Cached snapshot age: {age === null ? "none" : `${age}s`}</div>
            <div>Role: {snapshot?.identity.role ?? "-"}</div>
            <div>High-risk max staleness: {STALENESS_LIMITS_SECONDS.high}s</div>
            <progress
              className={`progress w-full ${age !== null && age > STALENESS_LIMITS_SECONDS.high ? "progress-error" : "progress-success"}`}
              value={Math.min(100, ((age ?? 0) / STALENESS_LIMITS_SECONDS.high) * 100)}
              max={100}
            />
            <div className="text-xs opacity-60">Bar fills as the cache ages toward the 15-minute high-risk limit.</div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button className="btn btn-primary btn-sm" onClick={() => loginAndSync().catch((e) => push(String(e)))}>
                Login and cache snapshot
              </button>
              <button className="btn btn-outline btn-sm" data-testid="low-risk" onClick={() => decide("identifier_scan")}>
                Low-risk: identifier scan
              </button>
              <button className="btn btn-outline btn-sm" onClick={ageSnapshot}>
                Age snapshot (demo)
              </button>
              <button className="btn btn-error btn-outline btn-sm" data-testid="high-risk" onClick={() => decide("transfer_ownership")}>
                High-risk: transfer ownership
              </button>
              <button className="btn btn-neutral btn-sm" data-testid="reconcile" onClick={() => reconnect().catch((e) => push(String(e)))}>
                Reconnect and reconcile
              </button>
            </div>
          </div>
        </div>
        <div className="card bg-base-100 shadow-md">
          <div className="card-body p-4">
            <div className="font-semibold text-sm mb-2">Signed local decisions (IndexedDB)</div>
            <ul className="text-xs space-y-2" data-testid="decision-log">
              {queue.map((q) => (
                <li key={q.nonce} className="border border-base-300 rounded-lg p-2">
                  <div>
                    {q.operation} · {q.riskTier} · {q.allowed ? "allowed" : "denied"}
                  </div>
                  <div>{q.reason}</div>
                  {q.reconcileReason && <div>Reconciliation: {q.reconcileReason}</div>}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="card bg-base-100 shadow-md p-4 text-xs space-y-1" data-testid="activity-log">
          {log.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </main>
    </div>
  );
}
