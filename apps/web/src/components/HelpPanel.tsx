"use client";

export function HelpPanel({
  title,
  steps
}: {
  title: string;
  steps: string[];
}) {
  return (
    <aside className="card bg-base-100 shadow-md hover-lift fade-in-up h-full">
      <div className="card-body p-5">
        <h2 className="card-title text-base">{title}</h2>
        <ol className="space-y-3 mt-1">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm leading-snug">
              <span className="badge badge-primary badge-sm shrink-0 mt-0.5">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
