import { verifyMessage } from "ethers";
import type { MessageSigner } from "./credential";

export interface OfflineDecisionMessage {
  actorDid: string;
  actorAddress: string;
  operation: string;
  riskTier: string;
  allowed: boolean;
  reason: string;
  nonce: string;
  signedAt: number;
}

export function buildOfflineDecisionMessage(input: OfflineDecisionMessage): string {
  return [
    "ANUBANDH offline decision",
    `DID: ${input.actorDid}`,
    `Address: ${input.actorAddress.toLowerCase()}`,
    `Operation: ${input.operation}`,
    `RiskTier: ${input.riskTier}`,
    `Allowed: ${input.allowed}`,
    `Reason: ${input.reason}`,
    `Nonce: ${input.nonce}`,
    `SignedAt: ${input.signedAt}`
  ].join("\n");
}

export async function signOfflineDecision(
  wallet: MessageSigner,
  input: OfflineDecisionMessage
): Promise<string> {
  return wallet.signMessage(buildOfflineDecisionMessage(input));
}

export function recoverOfflineDecisionSigner(
  input: OfflineDecisionMessage,
  signature: string
): string {
  return verifyMessage(buildOfflineDecisionMessage(input), signature).toLowerCase();
}
