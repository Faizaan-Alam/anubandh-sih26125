import { randomUUID } from "node:crypto";
import { Router } from "express";
import { Wallet } from "ethers";
import { issueCredentialSchema, revokeCredentialSchema } from "@anubandh/shared";
import { credentialIsExpired, signCredential, verifyCredentialSignature } from "@anubandh/crypto";
import { requireAuth, requireRoles } from "../auth";
import { prisma } from "../db";
import { env } from "../env";
import { getChain } from "../chain";

export const credentialsRouter = Router();

credentialsRouter.get("/subject/:did", async (req, res, next) => {
  try {
    const did = decodeURIComponent(req.params.did);
    const rows = await prisma.credential.findMany({
      where: { subjectDid: did },
      orderBy: { issuedAt: "desc" }
    });
    res.json({
      items: rows.map((row) => ({
        ...row,
        expired: credentialIsExpired(row.document as never)
      }))
    });
  } catch (err) {
    next(err);
  }
});

credentialsRouter.post("/issue", requireAuth, requireRoles(["Admin"]), async (req, res, next) => {
  try {
    const body = issueCredentialSchema.parse(req.body);
    const issuerDid = req.session!.did;
    const issuerWallet = new Wallet(env.deployerKey);
    const unsigned = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      id: `urn:anubandh:cred:${randomUUID()}`,
      type: ["VerifiableCredential", "AnubandhRoleCredential"],
      issuer: issuerDid,
      issuanceDate: new Date().toISOString(),
      expirationDate: body.expiresAt,
      credentialSubject: {
        id: body.subjectDid,
        role: body.role,
        ...(body.claims ?? {})
      }
    };
    const vc = await signCredential(issuerWallet, unsigned);
    const check = verifyCredentialSignature(vc);
    if (!check.valid) {
      res.status(500).json({ error: "Failed to sign credential" });
      return;
    }
    const row = await prisma.credential.create({
      data: {
        id: vc.id,
        subjectDid: body.subjectDid,
        issuerDid,
        role: body.role,
        issuedAt: new Date(vc.issuanceDate),
        expiresAt: new Date(vc.expirationDate),
        document: vc as object,
        signature: vc.proof.signatureValue
      }
    });
    res.json({
      credential: vc,
      id: row.id,
      note: "A credential is organizational evidence. Authorization is still enforced by RoleManager on-chain."
    });
  } catch (err) {
    next(err);
  }
});

credentialsRouter.post("/revoke", requireAuth, requireRoles(["Admin"]), async (req, res, next) => {
  try {
    const body = revokeCredentialSchema.parse(req.body);
    const row = await prisma.credential.update({
      where: { id: body.credentialId },
      data: { revoked: true, revokedAt: new Date() }
    });
    res.json({ id: row.id, revoked: true });
  } catch (err) {
    next(err);
  }
});

credentialsRouter.post("/verify", async (req, res, next) => {
  try {
    const vc = req.body as { id?: string };
    if (!vc?.id) {
      res.status(400).json({ error: "credential id required" });
      return;
    }
    const row = await prisma.credential.findUnique({ where: { id: vc.id } });
    if (!row) {
      res.status(404).json({ error: "Unknown credential" });
      return;
    }
    const document = row.document as unknown as Parameters<typeof verifyCredentialSignature>[0];
    const sig = verifyCredentialSignature(document);
    const { didRegistry } = getChain();
    const issuerActive = await didRegistry.isActiveController(
      (await didRegistry.controllerOf(row.issuerDid)) as string
    );
    res.json({
      signatureValid: sig.valid,
      issuerAddress: sig.issuerAddress,
      expired: credentialIsExpired(document),
      revoked: row.revoked,
      issuerDidActive: Boolean(issuerActive)
    });
  } catch (err) {
    next(err);
  }
});
