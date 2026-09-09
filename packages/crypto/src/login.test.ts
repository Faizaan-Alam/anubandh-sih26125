import { Wallet } from "ethers";
import { describe, expect, it } from "vitest";
import { buildLoginMessage, recoverLoginSigner } from "./login";
import { signCredential, verifyCredentialSignature, credentialIsExpired } from "./credential";

describe("login challenge", () => {
  it("recovers the signer of a login message", async () => {
    const wallet = Wallet.createRandom();
    const payload = {
      did: `did:ethr:31337:${wallet.address.toLowerCase()}`,
      address: wallet.address.toLowerCase(),
      nonce: "0xabc123",
      timestamp: 1_700_000_000
    };
    const sig = await wallet.signMessage(buildLoginMessage(payload));
    expect(recoverLoginSigner(payload, sig)).toBe(wallet.address.toLowerCase());
  });

  it("rejects a tampered login message", async () => {
    const wallet = Wallet.createRandom();
    const payload = {
      did: `did:ethr:31337:${wallet.address.toLowerCase()}`,
      address: wallet.address.toLowerCase(),
      nonce: "0xabc123",
      timestamp: 1_700_000_000
    };
    const sig = await wallet.signMessage(buildLoginMessage(payload));
    const tampered = { ...payload, nonce: "0xdef456" };
    expect(recoverLoginSigner(tampered, sig)).not.toBe(wallet.address.toLowerCase());
  });
});

describe("verifiable credentials", () => {
  it("signs and verifies a VC-shaped credential", async () => {
    const issuer = Wallet.createRandom();
    const subject = Wallet.createRandom();
    const unsigned = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      id: "urn:anubandh:cred:1",
      type: ["VerifiableCredential", "AnubandhRoleCredential"],
      issuer: `did:ethr:31337:${issuer.address.toLowerCase()}`,
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 86_400_000).toISOString(),
      credentialSubject: {
        id: `did:ethr:31337:${subject.address.toLowerCase()}`,
        role: "Manager"
      }
    };
    const vc = await signCredential(issuer, unsigned);
    const check = verifyCredentialSignature(vc);
    expect(check.valid).toBe(true);
    expect(check.issuerAddress).toBe(issuer.address.toLowerCase());
    expect(credentialIsExpired(vc)).toBe(false);
  });

  it("detects expired credentials", async () => {
    const issuer = Wallet.createRandom();
    const vc = await signCredential(issuer, {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      id: "urn:anubandh:cred:exp",
      type: ["VerifiableCredential"],
      issuer: `did:ethr:31337:${issuer.address.toLowerCase()}`,
      issuanceDate: "2020-01-01T00:00:00.000Z",
      expirationDate: "2020-01-02T00:00:00.000Z",
      credentialSubject: { id: "did:ethr:31337:0x0000000000000000000000000000000000000001", role: "User" }
    });
    expect(credentialIsExpired(vc, new Date("2020-01-03T00:00:00.000Z"))).toBe(true);
  });
});
