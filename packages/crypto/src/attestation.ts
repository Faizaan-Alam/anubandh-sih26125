import { TypedDataEncoder, verifyTypedData, type TypedDataDomain, type Wallet } from "ethers";

export const ATTESTATION_TYPES: Record<string, { name: string; type: string }[]> = {
  Attestation: [
    { name: "tokenId", type: "uint256" },
    { name: "evidenceTier", type: "uint8" },
    { name: "custodian", type: "address" },
    { name: "locationId", type: "bytes32" },
    { name: "condition", type: "uint8" },
    { name: "nonce", type: "bytes32" },
    { name: "validUntil", type: "uint256" }
  ]
};

export interface AttestationPayload {
  tokenId: bigint | number | string;
  evidenceTier: number;
  custodian: string;
  locationId: string;
  condition: number;
  nonce: string;
  validUntil: number;
}

export function attestationDomain(chainId: number, verifyingContract: string): TypedDataDomain {
  return {
    name: "ANUBANDH Attestation",
    version: "1",
    chainId,
    verifyingContract
  };
}

export async function signAttestation(
  wallet: Wallet,
  chainId: number,
  verifyingContract: string,
  payload: AttestationPayload
): Promise<string> {
  return wallet.signTypedData(attestationDomain(chainId, verifyingContract), ATTESTATION_TYPES, payload);
}

export function recoverAttestationSigner(
  chainId: number,
  verifyingContract: string,
  payload: AttestationPayload,
  signature: string
): string {
  return verifyTypedData(
    attestationDomain(chainId, verifyingContract),
    ATTESTATION_TYPES,
    payload,
    signature
  ).toLowerCase();
}

export function attestationDigest(
  chainId: number,
  verifyingContract: string,
  payload: AttestationPayload
): string {
  return TypedDataEncoder.hash(
    attestationDomain(chainId, verifyingContract),
    ATTESTATION_TYPES,
    payload
  );
}
