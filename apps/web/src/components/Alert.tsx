"use client";

import type { ReactNode } from "react";

export function Alert({
  kind,
  children
}: {
  kind: "ok" | "err" | "info" | "warn";
  children: ReactNode;
}) {
  const cls = {
    ok: "bg-emerald-50 border-emerald-200 text-emerald-950",
    err: "bg-red-50 border-red-200 text-red-950",
    info: "bg-slate-50 border-line text-slate-800",
    warn: "bg-amber-50 border-amber-200 text-amber-950"
  }[kind];
  return <div className={`border px-3 py-2 text-sm fade-in ${cls}`}>{children}</div>;
}
