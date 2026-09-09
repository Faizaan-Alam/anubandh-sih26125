import { verifyMessage } from "ethers";

export interface MessageSigner {
  signMessage: (message: string | Uint8Array) => Promise<string>;
}

export interface VerifiableCredential {
  "@context": string[];
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate: string;
  credentialSubject: {
    id: string;
    role: string;
    [key: string]: unknown;
  };
  proof: {
    type: "EcdsaSecp256k1Signature2019";
    created: string;
    proofPurpose: "assertionMethod";
    verificationMethod: string;
    signatureValue: string;
  };
}

function canonicalPayload(vc: Omit<VerifiableCredential, "proof">): string {
  return JSON.stringify({
    id: vc.id,
    type: vc.type,
    issuer: vc.issuer,
    issuanceDate: vc.issuanceDate,
    expirationDate: vc.expirationDate,
    credentialSubject: vc.credentialSubject
  });
}

export async function signCredential(
  issuerWallet: MessageSigner,
  unsigned: Omit<VerifiableCredential, "proof">
): Promise<VerifiableCredential> {
  const message = canonicalPayload(unsigned);
  const signatureValue = await issuerWallet.signMessage(message);
  return {
    ...unsigned,
    proof: {
      type: "EcdsaSecp256k1Signature2019",
      created: unsigned.issuanceDate,
      proofPurpose: "assertionMethod",
      verificationMethod: `${unsigned.issuer}#controller`,
      signatureValue
    }
  };
}

export function verifyCredentialSignature(vc: VerifiableCredential): {
  valid: boolean;
  issuerAddress: string;
} {
  const { proof, ...rest } = vc;
  const unsigned: Omit<VerifiableCredential, "proof"> = rest;
  const message = canonicalPayload(unsigned);
  const issuerAddress = verifyMessage(message, proof.signatureValue);
  return { valid: true, issuerAddress: issuerAddress.toLowerCase() };
}

export function credentialIsExpired(vc: VerifiableCredential, now = new Date()): boolean {
  return new Date(vc.expirationDate).getTime() <= now.getTime();
}
