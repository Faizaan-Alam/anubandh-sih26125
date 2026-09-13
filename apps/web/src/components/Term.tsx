"use client";

export function Term({ label, hint }: { label: string; hint: string }) {
  return (
    <abbr
      title={hint}
      className="cursor-help border-b border-dotted border-slate-500 no-underline inline-flex items-center gap-0.5"
    >
      {label}
      <span className="inline-flex w-3.5 h-3.5 items-center justify-center rounded-full border border-slate-400 text-[9px] font-bold text-slate-500 leading-none" aria-hidden>
        ?
      </span>
    </abbr>
  );
}
