import { describe, expect, it } from "vitest";
import { challengeRequestSchema, loginRequestSchema, mintAssetSchema } from "@anubandh/shared";
import { Wallet } from "ethers";
import { buildLoginMessage } from "@anubandh/crypto";

describe("shared request schemas", () => {
  it("rejects a malformed mint payload", () => {
    const result = mintAssetSchema.safeParse({ to: "not-an-address", assetIdentifier: "x" });
    expect(result.success).toBe(false);
  });

  it("accepts a well-formed challenge request", () => {
    const result = challengeRequestSchema.safeParse({
      address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    });
    expect(result.success).toBe(true);
  });

  it("builds a login message that includes nonce and DID", async () => {
    const wallet = Wallet.createRandom();
    const did = `did:ethr:31337:${wallet.address.toLowerCase()}`;
    const msg = buildLoginMessage({
      did,
      address: wallet.address,
      nonce: "0xdeadbeef",
      timestamp: 1
    });
    expect(msg).toContain(did);
    expect(msg).toContain("0xdeadbeef");
    const sig = await wallet.signMessage(msg);
    expect(sig.startsWith("0x")).toBe(true);
    const parsed = loginRequestSchema.safeParse({
      address: wallet.address,
      did,
      nonce: "0xdeadbeef",
      timestamp: 1,
      signature: sig
    });
    expect(parsed.success).toBe(true);
  });
});
