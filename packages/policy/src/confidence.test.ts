import { describe, expect, it } from "vitest";
import { computeConfidence, freshnessDecay, FRESHNESS_FLOOR } from "./confidence";

describe("confidence model", () => {
  it("gives 100 for a fresh signed inspection with no divergence", () => {
    const now = 1_000_000;
    const result = computeConfidence({
      evidenceTier: "SignedInspection",
      attestedAt: now,
      now,
      freshnessWindowSeconds: 86_400,
      hasOpenDivergence: false
    });
    expect(result.score).toBe(100);
    expect(result.evidenceWeight).toBe(1);
    expect(result.divergencePenalty).toBe(1);
  });

  it("weights identifier scans at 0.4", () => {
    const now = 1_000_000;
    const result = computeConfidence({
      evidenceTier: "IdentifierScan",
      attestedAt: now,
      now,
      freshnessWindowSeconds: 86_400,
      hasOpenDivergence: false
    });
    expect(result.score).toBe(40);
  });

  it("decays linearly to the floor", () => {
    expect(freshnessDecay(0, 100)).toBe(1);
    expect(freshnessDecay(100, 100)).toBe(FRESHNESS_FLOOR);
    expect(freshnessDecay(50, 100)).toBeCloseTo(0.6);
  });

  it("lets an open divergence dominate the score", () => {
    const now = 1_000_000;
    const result = computeConfidence({
      evidenceTier: "SignedInspection",
      attestedAt: now,
      now,
      freshnessWindowSeconds: 86_400,
      hasOpenDivergence: true
    });
    expect(result.score).toBe(10);
    expect(result.explanation).toContain("open divergence");
  });
});
