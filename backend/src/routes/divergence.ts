import { Router } from "express";
import { id as keccakId } from "ethers";
import { confirmReconciliationSchema, proposeReconciliationSchema } from "@anubandh/shared";
import { requireAuth, requireRoles } from "../auth";
import { connected, getChain, signerFor } from "../chain";

export const divergenceRouter = Router();

const CONDITION_INDEX: Record<string, number> = {
  Unknown: 0,
  Good: 1,
  Damaged: 2,
  Missing: 3
};

divergenceRouter.get("/asset/:tokenId", async (req, res, next) => {
  try {
    const { divergenceRegistry } = getChain();
    const ids: bigint[] = await divergenceRegistry.divergencesOf(req.params.tokenId);
    const items = [];
    for (const id of ids) {
      const rec = await divergenceRegistry.getDivergence(id);
      items.push({
        id: id.toString(),
        tokenId: rec.tokenId.toString(),
        attestationA: rec.attestationA.toString(),
        attestationB: rec.attestationB.toString(),
        detectedAt: Number(rec.detectedAt),
        resolved: Boolean(rec.resolved),
        resolvedAt: Number(rec.resolvedAt),
        proposer: rec.proposer,
        confirmer: rec.confirmer,
        acceptedCustodian: rec.acceptedCustodian,
        pending: Boolean(rec.pending)
      });
    }
    const openId = Number(await divergenceRegistry.openDivergenceOf(req.params.tokenId));
    res.json({ items, openDivergenceId: openId === 0 ? null : String(openId) });
  } catch (err) {
    next(err);
  }
});

divergenceRouter.post(
  "/propose",
  requireAuth,
  requireRoles(["Admin", "Manager"]),
  async (req, res, next) => {
    try {
      const body = proposeReconciliationSchema.parse(req.body);
      const wallet = signerFor(req.session!.address);
      const { divergenceRegistry } = getChain();
      const tx = await connected(divergenceRegistry, wallet).proposeReconciliation(
        body.divergenceId,
        keccakId(body.evidenceNotes),
        body.acceptedCustodian,
        keccakId(body.acceptedLocation),
        CONDITION_INDEX[body.acceptedCondition]
      );
      const receipt = await tx.wait();
      res.json({ txHash: receipt.hash, divergenceId: body.divergenceId });
    } catch (err) {
      next(err);
    }
  }
);

divergenceRouter.post("/confirm", requireAuth, requireRoles(["Admin"]), async (req, res, next) => {
  try {
    const body = confirmReconciliationSchema.parse(req.body);
    const wallet = signerFor(req.session!.address);
    const { divergenceRegistry } = getChain();
    const tx = await connected(divergenceRegistry, wallet).confirmReconciliation(body.divergenceId);
    const receipt = await tx.wait();
    res.json({
      txHash: receipt.hash,
      divergenceId: body.divergenceId,
      note: "High-value quarantine release requires a Manager proposal and a distinct Admin confirmation."
    });
  } catch (err) {
    next(err);
  }
});
