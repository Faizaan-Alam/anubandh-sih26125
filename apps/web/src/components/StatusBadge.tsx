"use client";

const styles: Record<string, string> = {
  Admin: "bg-slate-800 text-white",
  Manager: "bg-blue-800 text-white",
  Auditor: "bg-indigo-800 text-white",
  User: "bg-slate-600 text-white",
  Active: "bg-emerald-700 text-white",
  Revoked: "bg-red-800 text-white",
  Quarantined: "bg-red-800 text-white",
  Clear: "bg-emerald-700 text-white",
  seed: "bg-amber-100 text-amber-900 border border-amber-300",
  demo: "bg-amber-100 text-amber-900 border border-amber-300",
  high: "bg-red-100 text-red-900 border border-red-300",
  low: "bg-slate-200 text-slate-800"
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded ${styles[value] ?? "bg-slate-200 text-slate-800"}`}>
      {value}
    </span>
  );
}
