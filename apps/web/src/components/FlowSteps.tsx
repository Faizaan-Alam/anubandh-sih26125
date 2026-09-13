"use client";

export function FlowSteps({
  steps,
  active
}: {
  steps: { label: string; hint: string }[];
  active?: number;
}) {
  return (
    <ol className="grid grid-cols-2 md:grid-cols-5 gap-2">
      {steps.map((step, i) => (
        <li
          key={step.label}
          className={`border p-3 bg-white fade-in-up ${active === i ? "border-accent" : "border-line"}`}
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div className="text-xs font-semibold text-accent">Step {i + 1}</div>
          <div className="text-sm font-semibold text-ink mt-1">{step.label}</div>
          <div className="text-xs text-slate-600 mt-1 leading-snug">{step.hint}</div>
        </li>
      ))}
    </ol>
  );
}
