"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { clearSession, loadToken } from "@/lib/session";
import { shortAddr } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";
import { ThemeSwitcher } from "./ThemeSwitcher";

const NAV = [
  { href: "/dashboard", label: "Dashboard", hint: "Live overview" },
  { href: "/identity", label: "Identity", hint: "DIDs and keys" },
  { href: "/roles", label: "Roles", hint: "Who may act" },
  { href: "/assets", label: "Assets", hint: "NFT registry" },
  { href: "/attestations", label: "Attestations", hint: "Signed observations" },
  { href: "/divergence", label: "Divergence", hint: "Conflicts and freeze" },
  { href: "/audit", label: "Audit Trail", hint: "History replay" }
];

export function AppShell({ children }: { children: ReactNode }) {
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
      <div className="min-h-screen grid place-items-center bg-base-200">
        <div className="text-center fade-in">
          <span className="loading loading-ring loading-lg text-primary" />
          <div className="mt-3 font-semibold">Checking session against RoleManager...</div>
          <div className="text-xs opacity-60 mt-1">The UI is not the security boundary.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="drawer lg:drawer-open min-h-screen">
      <input id="nav-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col min-h-screen">
        <header className="navbar bg-base-100 shadow-sm sticky top-0 z-20">
          <div className="flex-none lg:hidden">
            <label htmlFor="nav-drawer" className="btn btn-square btn-ghost" aria-label="Open menu">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </label>
          </div>
          <div className="flex-1 min-w-0 px-2">
            <div className="text-sm font-semibold truncate">Policy Enforcement Point session</div>
            <div className="text-xs opacity-60 truncate">{me.roleSource}</div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge value="demo" />
            <ThemeSwitcher compact />
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                clearSession();
                router.replace("/");
              }}
            >
              Sign out
            </button>
          </div>
        </header>
        {error && (
          <div className="alert alert-error rounded-none text-sm">
            <span>{error}</span>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6 fade-in">{children}</main>
      </div>
      <div className="drawer-side z-30">
        <label htmlFor="nav-drawer" aria-label="close sidebar" className="drawer-overlay" />
        <aside className="min-h-full w-64 bg-neutral text-neutral-content flex flex-col">
          <div className="p-5 border-b border-neutral-content/10">
            <div className="text-xl font-black tracking-wide">ANUBANDH</div>
            <div className="text-xs opacity-70 mt-1">SIH26125 / BEL</div>
            <div className="text-[11px] opacity-50 mt-2 leading-snug">Identity, assets, access control, audit</div>
          </div>
          <ul className="menu px-2 py-3 flex-1">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link href={item.href} className={active ? "active" : ""}>
                    <span>
                      <span className="block font-semibold">{item.label}</span>
                      <span className="block text-[11px] font-normal opacity-70">{item.hint}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="p-4 border-t border-neutral-content/10 text-xs space-y-2">
            <div className="flex items-center gap-2 opacity-80">
              <span className="live-dot" />
              Current role (on-chain)
            </div>
            <StatusBadge value={me.role} />
            <div className="break-all opacity-70" title={me.did}>
              {me.did}
            </div>
            <div className="opacity-50">{shortAddr(me.address, 8, 6)}</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
