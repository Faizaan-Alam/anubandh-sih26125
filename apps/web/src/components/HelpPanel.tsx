"use client";

export function HelpPanel({
  title,
  steps
}: {
  title: string;
  steps: string[];
}) {
  return (
    <aside className="bg-white border border-line p-4 fade-in-up">
      <div className="text-sm font-semibold text-ink">{title}</div>
      <ol className="mt-2 space-y-2">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3 text-sm text-slate-700">
            <span className="shrink-0 w-5 h-5 rounded-full bg-navy text-white text-xs font-semibold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
