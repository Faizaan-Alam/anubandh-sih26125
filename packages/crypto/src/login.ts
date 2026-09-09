import { keccak256, toUtf8Bytes, verifyMessage } from "ethers";

export interface LoginMessage {
  did: string;
  address: string;
  nonce: string;
  timestamp: number;
}

export function buildLoginMessage(input: LoginMessage): string {
  return [
    "ANUBANDH login",
    `DID: ${input.did}`,
    `Address: ${input.address.toLowerCase()}`,
    `Nonce: ${input.nonce}`,
    `Timestamp: ${input.timestamp}`
  ].join("\n");
}

export function recoverLoginSigner(input: LoginMessage, signature: string): string {
  return verifyMessage(buildLoginMessage(input), signature).toLowerCase();
}

export function hashIdentifier(value: string): string {
  return keccak256(toUtf8Bytes(value));
}
