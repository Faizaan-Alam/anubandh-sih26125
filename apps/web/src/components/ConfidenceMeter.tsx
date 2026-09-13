"use client";

export function ConfidenceMeter({
  score,
  label = "Confidence"
}: {
  score: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
  const tone = clamped >= 70 ? "progress-success" : clamped >= 40 ? "progress-warning" : "progress-error";
  const word = clamped >= 70 ? "Strong" : clamped >= 40 ? "Moderate" : "Weak / disputed";
  return (
    <div className="min-w-[8rem]">
      <div className="flex justify-between text-xs mb-1">
        <span className="opacity-70">{label}</span>
        <span className="font-semibold">
          {clamped} / 100 · {word}
        </span>
      </div>
      <progress className={`progress ${tone} w-full meter-fill`} value={clamped} max={100} />
    </div>
  );
}
