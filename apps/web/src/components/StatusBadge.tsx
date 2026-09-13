"use client";

const styles: Record<string, string> = {
  Admin: "badge-neutral",
  Manager: "badge-primary",
  Auditor: "badge-secondary",
  User: "badge-accent",
  Active: "badge-success",
  Revoked: "badge-error",
  Quarantined: "badge-error",
  Clear: "badge-success",
  seed: "badge-warning",
  demo: "badge-warning",
  high: "badge-error badge-outline",
  low: "badge-ghost"
};

export function StatusBadge({ value }: { value: string }) {
  return <span className={`badge badge-sm ${styles[value] ?? "badge-ghost"}`}>{value}</span>;
}
