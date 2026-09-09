"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { clearSession, loadToken } from "@/lib/session";
import { StatusBadge } from "./StatusBadge";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/identity", label: "Identity" },
  { href: "/roles", label: "Roles" },
  { href: "/assets", label: "Assets" },
  { href: "/attestations", label: "Attestations" },
  { href: "/divergence", label: "Divergence" },
  { href: "/audit", label: "Audit Trail" }
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
    return <div className="p-8 text-slate-600">Checking session against RoleManager...</div>;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 bg-navy text-white flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="text-lg font-bold tracking-wide">ANUBANDH</div>
          <div className="text-xs text-slate-300 mt-1">SIH26125 / BEL</div>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-5 py-2 text-sm ${
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-white/10 font-semibold"
                  : "text-slate-200 hover:bg-white/5"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-white/10 text-xs space-y-1">
          <div className="text-slate-300">Current role (on-chain)</div>
          <StatusBadge value={me.role} />
          <div className="break-all text-slate-400 mt-2">{me.did}</div>
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
              className="text-sm border border-line px-3 py-1 bg-paper hover:bg-slate-100"
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
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
