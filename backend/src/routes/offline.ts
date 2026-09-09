import { Router } from "express";
import { offlineDecisionSchema } from "@anubandh/shared";
import { recoverOfflineDecisionSigner } from "@anubandh/crypto";
import { currentPolicySnapshot, evaluateOfflineOperation } from "@anubandh/policy";
import { requireAuth } from "../auth";
import { prisma } from "../db";
import { assertActiveDid, onChainRole } from "../chain";

export const offlineRouter = Router();

offlineRouter.get("/snapshot", requireAuth, async (req, res, next) => {
  try {
    const did = await assertActiveDid(req.session!.address);
    const role = await onChainRole(req.session!.address);
    const creds = await prisma.credential.findMany({
      where: { subjectDid: did, revoked: false }
    });
    res.json({
      capturedAt: Math.floor(Date.now() / 1000),
      policy: currentPolicySnapshot(),
      identity: { did, address: req.session!.address, role },
      credentials: creds,
      trustAnchors: {
        note: "Trust anchors are the on-chain DID controllers and credential issuer keys cached for offline verification."
      }
    });
  } catch (err) {
    next(err);
  }
});

offlineRouter.post("/reconcile", requireAuth, async (req, res, next) => {
  try {
    const body = offlineDecisionSchema.parse(req.body);
    const recovered = recoverOfflineDecisionSigner(
      {
        actorDid: body.actorDid,
        actorAddress: body.actorAddress,
        operation: body.operation,
        riskTier: body.riskTier,
        allowed: body.allowed,
        reason: body.reason,
        nonce: body.nonce,
        signedAt: body.signedAt
      },
      body.signature
    );
    if (recovered !== body.actorAddress.toLowerCase()) {
      res.status(400).json({ error: "Offline decision signature is invalid" });
      return;
    }
    const existing = await prisma.offlineDecision.findUnique({ where: { nonce: body.nonce } });
    if (existing) {
      res.status(409).json({ error: "Offline decision nonce has already been submitted" });
      return;
    }

    let accepted = true;
    let reconcileReason = "Accepted: current on-chain identity and role still permit this decision.";
    try {
      const did = await assertActiveDid(body.actorAddress);
      if (did.toLowerCase() !== body.actorDid.toLowerCase()) {
        accepted = false;
        reconcileReason = "Rejected: DID mapping changed while the verifier was offline.";
      }
      const role = await onChainRole(body.actorAddress);
      if (role === "None") {
        accepted = false;
        reconcileReason = "Rejected: actor no longer holds an on-chain role.";
      }
    } catch (err) {
      accepted = false;
      reconcileReason = err instanceof Error ? `Rejected: ${err.message}` : "Rejected: identity check failed.";
    }

    if (body.allowed && body.riskTier === "high") {
      const gate = evaluateOfflineOperation({
        operation: body.operation,
        snapshotCapturedAt: body.signedAt - body.snapshotAgeSeconds,
        now: body.signedAt
      });
      if (!gate.allowed) {
        accepted = false;
        reconcileReason = "Rejected: high-risk decision was taken against a stale snapshot.";
      }
    }

    const row = await prisma.offlineDecision.create({
      data: {
        actorDid: body.actorDid,
        actorAddress: body.actorAddress.toLowerCase(),
        operation: body.operation,
        riskTier: body.riskTier,
        snapshotAgeSeconds: body.snapshotAgeSeconds,
        allowed: body.allowed,
        reason: body.reason,
        payload: body.payload as object,
        nonce: body.nonce,
        signature: body.signature,
        signedAt: new Date(body.signedAt * 1000),
        reconciled: true,
        reconcileAccepted: accepted,
        reconcileReason,
        reconciledAt: new Date()
      }
    });
    res.json({
      id: row.id,
      accepted,
      reconcileReason,
      note: "Reconciliation records the outcome. Privileged chain writes still go through their own PEP routes."
    });
  } catch (err) {
    next(err);
  }
});

offlineRouter.get("/decisions", requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.offlineDecision.findMany({
      where: { actorAddress: req.session!.address.toLowerCase() },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
});
