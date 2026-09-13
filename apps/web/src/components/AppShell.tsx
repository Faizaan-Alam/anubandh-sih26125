"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { clearSession, loadToken } from "@/lib/session";
import { shortAddr } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

const NAV = [
  { href: "/dashboard", label: "Dashboard", hint: "Live overview" },
  { href: "/identity", label: "Identity", hint: "DIDs and keys" },
  { href: "/roles", label: "Roles", hint: "Who may act" },
  { href: "/assets", label: "Assets", hint: "NFT registry" },
  { href: "/attestations", label: "Attestations", hint: "Signed observations" },
  { href: "/divergence", label: "Divergence", hint: "Conflicts and freeze" },
  { href: "/audit", label: "Audit Trail", hint: "History replay" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<{ did: string; address: string; role: string; roleSource: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = loadToken();
    if (!token) {
      router.replace("/");
      return;
    }
    api<{ did: string; address: string; role: string; roleSource: string }>("/session", {}, token)
      .then(setMe)
      .catch((err: Error) => {
        setError(err.message);
        clearSession();
        router.replace("/");
      });
  }, [router, pathname]);

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        <div className="text-center fade-in">
          <div className="live-dot mx-auto mb-3" />
          <div>Checking session against RoleManager...</div>
          <div className="text-xs text-slate-500 mt-1">The UI is not the security boundary.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 bg-navy text-white flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="text-lg font-bold tracking-wide">ANUBANDH</div>
          <div className="text-xs text-slate-300 mt-1">SIH26125 / BEL</div>
          <div className="text-[11px] text-slate-400 mt-2 leading-snug">
            Identity, assets, access control, audit
          </div>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${active ? "nav-link-active" : ""}`}
              >
                <span className="block">{item.label}</span>
                <span className="block text-[11px] text-slate-400 font-normal">{item.hint}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-white/10 text-xs space-y-2">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="live-dot" />
            Current role (on-chain)
          </div>
          <StatusBadge value={me.role} />
          <div className="break-all text-slate-400" title={me.did}>
            {me.did}
          </div>
          <div className="text-slate-500">{shortAddr(me.address, 8, 6)}</div>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="bg-white border-b border-line px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Policy Enforcement Point session</div>
            <div className="text-xs text-slate-500">{me.roleSource}</div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge value="demo" />
            <button
              className="btn btn-secondary"
              onClick={() => {
                clearSession();
                router.replace("/");
              }}
            >
              Sign out
            </button>
          </div>
        </header>
        {error && <div className="bg-red-50 text-red-900 px-6 py-2 text-sm">{error}</div>}
        <main className="p-6 fade-in">{children}</main>
      </div>
    </div>
  );
}
