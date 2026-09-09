/**
 * Confidence = Evidence Weight x Freshness Decay x Divergence Penalty
 *
 * Evidence Weight:
 *   SignedInspection = 1.0 (role-bound signed observation)
 *   IdentifierScan   = 0.4 (QR/NFC-style identifier; weaker, not unclonable)
 *
 * Freshness Decay (linear):
 *   1.0 at the moment of the attestation
 *   decays to FRESHNESS_FLOOR (0.2) once age >= freshnessWindowSeconds
 *
 * Divergence Penalty:
 *   1.0 when no open divergence
 *   0.1 when an unresolved divergence exists (dominates the score)
 *
 * Display value is the product scaled to 0..100.
 */

export type EvidenceTierName = "IdentifierScan" | "SignedInspection";

export const EVIDENCE_WEIGHT: Record<EvidenceTierName, number> = {
  SignedInspection: 1.0,
  IdentifierScan: 0.4
};

export const FRESHNESS_FLOOR = 0.2;
export const DIVERGENCE_PENALTY_OPEN = 0.1;
export const DIVERGENCE_PENALTY_CLEAR = 1.0;

export interface ConfidenceInput {
  evidenceTier: EvidenceTierName;
  attestedAt: number;
  now: number;
  freshnessWindowSeconds: number;
  hasOpenDivergence: boolean;
}

export interface ConfidenceBreakdown {
  evidenceTier: EvidenceTierName;
  evidenceWeight: number;
  ageSeconds: number;
  freshnessWindowSeconds: number;
  freshnessDecay: number;
  hasOpenDivergence: boolean;
  divergencePenalty: number;
  product: number;
  score: number;
  explanation: string;
}

export function freshnessDecay(ageSeconds: number, windowSeconds: number): number {
  if (windowSeconds <= 0) return FRESHNESS_FLOOR;
  if (ageSeconds <= 0) return 1;
  if (ageSeconds >= windowSeconds) return FRESHNESS_FLOOR;
  const t = ageSeconds / windowSeconds;
  return 1 - t * (1 - FRESHNESS_FLOOR);
}

export function computeConfidence(input: ConfidenceInput): ConfidenceBreakdown {
  const ageSeconds = Math.max(0, input.now - input.attestedAt);
  const evidenceWeight = EVIDENCE_WEIGHT[input.evidenceTier];
  const decay = freshnessDecay(ageSeconds, input.freshnessWindowSeconds);
  const divergencePenalty = input.hasOpenDivergence ? DIVERGENCE_PENALTY_OPEN : DIVERGENCE_PENALTY_CLEAR;
  const product = evidenceWeight * decay * divergencePenalty;
  const score = Math.round(product * 100);
  const explanation = [
    `Evidence tier ${input.evidenceTier} contributes weight ${evidenceWeight}.`,
    `Observation age is ${ageSeconds}s against a freshness window of ${input.freshnessWindowSeconds}s, so freshness decay is ${decay.toFixed(3)}.`,
    input.hasOpenDivergence
      ? `An open divergence applies penalty ${divergencePenalty}, which dominates the score.`
      : `No open divergence; penalty is ${divergencePenalty}.`,
    `Displayed confidence is ${score} / 100.`
  ].join(" ");

  return {
    evidenceTier: input.evidenceTier,
    evidenceWeight,
    ageSeconds,
    freshnessWindowSeconds: input.freshnessWindowSeconds,
    freshnessDecay: decay,
    hasOpenDivergence: input.hasOpenDivergence,
    divergencePenalty,
    product,
    score,
    explanation
  };
}
