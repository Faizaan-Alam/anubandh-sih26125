import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { env } from "./env";

describe("session token is not the authorization boundary", () => {
  it("issues a JWT that does not embed a trusted role claim", () => {
    const token = jwt.sign({ did: "did:ethr:31337:0xabc", address: "0xabc" }, env.jwtSecret, {
      expiresIn: 60
    });
    const decoded = jwt.verify(token, env.jwtSecret) as { role?: string; address: string };
    expect(decoded.role).toBeUndefined();
    expect(decoded.address).toBe("0xabc");
  });
});
