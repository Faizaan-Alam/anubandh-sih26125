"use client";

import type { ReactNode } from "react";

export function PageHeader({
  kicker,
  title,
  children
}: {
  kicker?: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="fade-in">
      {kicker && <div className="text-xs font-semibold uppercase tracking-wide text-accent mb-1">{kicker}</div>}
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      {children && <div className="text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">{children}</div>}
    </div>
  );
}
