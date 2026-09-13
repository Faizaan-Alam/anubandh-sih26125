"use client";

export function FlowSteps({
  steps
}: {
  steps: { label: string; hint: string }[];
  active?: number;
}) {
  return (
    <ul className="steps steps-vertical lg:steps-horizontal w-full bg-base-100 shadow-md rounded-box p-4 fade-in-up">
      {steps.map((step) => (
        <li key={step.label} className="step step-primary">
          <div className="text-left">
            <div className="font-semibold">{step.label}</div>
            <div className="text-xs opacity-70 font-normal">{step.hint}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
