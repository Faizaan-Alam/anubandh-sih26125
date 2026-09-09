import { randomBytes } from "node:crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { challengeRequestSchema, loginRequestSchema } from "@anubandh/shared";
import { recoverLoginSigner } from "@anubandh/crypto";
import { prisma } from "../db";
import { env } from "../env";
import { assertActiveDid, onChainRole } from "../chain";
import { signSession } from "../auth";

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

authRouter.post("/challenge", authLimiter, async (req, res, next) => {
  try {
    const body = challengeRequestSchema.parse(req.body);
    const nonce = "0x" + randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + env.loginNonceTtlSeconds * 1000);
    await prisma.loginNonce.create({
      data: { nonce, address: body.address.toLowerCase(), expiresAt }
    });
    res.json({
      nonce,
      expiresAt: expiresAt.toISOString(),
      messageHint: "Sign the ANUBANDH login message containing DID, address, nonce and timestamp"
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", authLimiter, async (req, res, next) => {
  try {
    const body = loginRequestSchema.parse(req.body);
    const record = await prisma.loginNonce.findUnique({ where: { nonce: body.nonce } });
    if (!record || record.used) {
      res.status(401).json({ error: "Unknown or reused login nonce" });
      return;
    }
    if (record.expiresAt.getTime() < Date.now()) {
      res.status(401).json({ error: "Login nonce has expired" });
      return;
    }
    if (record.address !== body.address.toLowerCase()) {
      res.status(401).json({ error: "Nonce was issued for a different address" });
      return;
    }

    let recovered: string;
    try {
      recovered = recoverLoginSigner(
        { did: body.did, address: body.address, nonce: body.nonce, timestamp: body.timestamp },
        body.signature
      );
    } catch {
      res.status(401).json({ error: "Invalid login signature" });
      return;
    }
    if (recovered !== body.address.toLowerCase()) {
      res.status(401).json({ error: "Signature does not match the claimed address" });
      return;
    }

    const onChainDid = await assertActiveDid(body.address);
    if (onChainDid.toLowerCase() !== body.did.toLowerCase()) {
      res.status(401).json({ error: "DID does not match the on-chain controller mapping" });
      return;
    }

    await prisma.loginNonce.update({ where: { nonce: body.nonce }, data: { used: true } });
    const role = await onChainRole(body.address);
    const token = signSession(onChainDid, body.address.toLowerCase());
    res.json({
      token,
      did: onChainDid,
      address: body.address.toLowerCase(),
      role,
      roleSource: "RoleManager.hasActiveRole (fresh on-chain check)",
      expiresInSeconds: env.jwtTtlSeconds
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing session token" });
      return;
    }
    const jwt = await import("jsonwebtoken");
    const claims = jwt.verify(header.slice(7), env.jwtSecret) as { did: string; address: string };
    const role = await onChainRole(claims.address);
    const did = await assertActiveDid(claims.address);
    res.json({
      did,
      address: claims.address,
      role,
      roleSource: "RoleManager.hasActiveRole (fresh on-chain check)"
    });
  } catch (err) {
    next(err);
  }
});
