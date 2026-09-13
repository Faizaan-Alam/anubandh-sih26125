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
    ok: "alert-success",
    err: "alert-error",
    info: "alert-info",
    warn: "alert-warning"
  }[kind];
  return (
    <div role="alert" className={`alert ${cls} text-sm fade-in`}>
      <span>{children}</span>
    </div>
  );
}
