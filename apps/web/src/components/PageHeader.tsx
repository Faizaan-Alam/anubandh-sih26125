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
    <div className="fade-in-up">
      {kicker && <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1">{kicker}</div>}
      <h1 className="text-3xl font-bold">{title}</h1>
      {children && <div className="text-sm opacity-80 mt-2 max-w-3xl leading-relaxed">{children}</div>}
    </div>
  );
}
