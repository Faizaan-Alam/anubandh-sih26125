import { describe, expect, it } from "vitest";
import { evaluateOfflineOperation, STALENESS_LIMITS_SECONDS } from "./risk";

describe("offline risk gate", () => {
  it("allows a low-risk action even with an older snapshot", () => {
    const now = 1_000_000;
    const result = evaluateOfflineOperation({
      operation: "identifier_scan",
      snapshotCapturedAt: now - 2 * 24 * 3600,
      now
    });
    expect(result.allowed).toBe(true);
    expect(result.riskTier).toBe("low");
  });

  it("denies a high-risk action against a stale snapshot", () => {
    const now = 1_000_000;
    const result = evaluateOfflineOperation({
      operation: "transfer_ownership",
      snapshotCapturedAt: now - STALENESS_LIMITS_SECONDS.high - 1,
      now
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("older than the permitted threshold");
  });

  it("allows a high-risk action within the staleness bound", () => {
    const now = 1_000_000;
    const result = evaluateOfflineOperation({
      operation: "reconciliation",
      snapshotCapturedAt: now - 60,
      now
    });
    expect(result.allowed).toBe(true);
  });
});
