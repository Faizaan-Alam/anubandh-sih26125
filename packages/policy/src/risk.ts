export type RiskTier = "low" | "high";

export const LOW_RISK_OPERATIONS = [
  "view_asset",
  "identifier_scan",
  "view_credential",
  "view_attestation",
  "cache_sync"
] as const;

export const HIGH_RISK_OPERATIONS = [
  "transfer_ownership",
  "transfer_custody",
  "allocate",
  "role_change",
  "reconciliation",
  "mint",
  "revoke_did"
] as const;

export const STALENESS_LIMITS_SECONDS: Record<RiskTier, number> = {
  low: 7 * 24 * 60 * 60,
  high: 15 * 60
};

export interface PolicySnapshot {
  version: number;
  capturedAt: number;
  stalenessLimitsSeconds: Record<RiskTier, number>;
  lowRiskOperations: string[];
  highRiskOperations: string[];
}

export function currentPolicySnapshot(now = Math.floor(Date.now() / 1000)): PolicySnapshot {
  return {
    version: 1,
    capturedAt: now,
    stalenessLimitsSeconds: { ...STALENESS_LIMITS_SECONDS },
    lowRiskOperations: [...LOW_RISK_OPERATIONS],
    highRiskOperations: [...HIGH_RISK_OPERATIONS]
  };
}

export function riskTierOf(operation: string): RiskTier {
  if ((HIGH_RISK_OPERATIONS as readonly string[]).includes(operation)) return "high";
  return "low";
}

export interface OfflineDecisionInput {
  operation: string;
  snapshotCapturedAt: number;
  now: number;
}

export interface OfflineGateResult {
  operation: string;
  riskTier: RiskTier;
  snapshotAgeSeconds: number;
  maxStalenessSeconds: number;
  allowed: boolean;
  reason: string;
}

export function evaluateOfflineOperation(input: OfflineDecisionInput): OfflineGateResult {
  const riskTier = riskTierOf(input.operation);
  const snapshotAgeSeconds = Math.max(0, input.now - input.snapshotCapturedAt);
  const maxStalenessSeconds = STALENESS_LIMITS_SECONDS[riskTier];
  const stale = snapshotAgeSeconds > maxStalenessSeconds;
  if (riskTier === "high" && stale) {
    return {
      operation: input.operation,
      riskTier,
      snapshotAgeSeconds,
      maxStalenessSeconds,
      allowed: false,
      reason:
        "Denied: cached authorization snapshot is older than the permitted threshold for this high-risk operation."
    };
  }
  return {
    operation: input.operation,
    riskTier,
    snapshotAgeSeconds,
    maxStalenessSeconds,
    allowed: true,
    reason:
      riskTier === "low"
        ? "Allowed: low-risk operation permitted against the cached snapshot."
        : "Allowed: high-risk operation is within the snapshot staleness bound."
  };
}
