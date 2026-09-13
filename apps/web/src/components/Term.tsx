"use client";

export function Term({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="tooltip tooltip-bottom z-20" data-tip={hint}>
      <abbr className="cursor-help border-b border-dotted border-current/40 no-underline inline-flex items-center gap-1">
        {label}
        <span className="badge badge-xs badge-outline">?</span>
      </abbr>
    </span>
  );
}
