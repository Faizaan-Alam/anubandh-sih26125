"use client";

export function Term({ label, hint }: { label: string; hint: string }) {
  return (
    <abbr title={hint} className="cursor-help border-b border-dotted border-slate-500 no-underline">
      {label}
    </abbr>
  );
}
