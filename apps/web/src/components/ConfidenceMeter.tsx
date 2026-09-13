"use client";

export function ConfidenceMeter({
  score,
  label = "Confidence"
}: {
  score: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
  const tone = clamped >= 70 ? "bg-emerald-700" : clamped >= 40 ? "bg-amber-600" : "bg-red-800";
  const word = clamped >= 70 ? "Strong" : clamped >= 40 ? "Moderate" : "Weak / disputed";
  return (
    <div className="min-w-[8rem]">
      <div className="flex justify-between text-xs text-slate-600 mb-1">
        <span>{label}</span>
        <span className="font-semibold text-ink">
          {clamped} / 100 · {word}
        </span>
      </div>
      <div className="h-2 bg-slate-200 overflow-hidden" role="meter" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full ${tone} meter-fill`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
