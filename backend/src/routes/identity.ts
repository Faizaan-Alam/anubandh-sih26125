import { Router } from "express";
import { registerDidSchema, rotateKeySchema, revokeDidSchema } from "@anubandh/shared";
import { requireAuth, requireRoles } from "../auth";
import { connected, getChain, signerFor } from "../chain";

export const identityRouter = Router();

identityRouter.get("/:did", async (req, res, next) => {
  try {
    const did = decodeURIComponent(req.params.did);
    const { didRegistry } = getChain();
    const record = await didRegistry.getRecord(did);
    res.json({
      did,
      controller: record.controller,
      status: ["None", "Active", "Revoked"][Number(record.status)] ?? "None",
      registeredAt: Number(record.registeredAt),
      revokedAt: Number(record.revokedAt)
    });
  } catch (err) {
    next(err);
  }
});

identityRouter.post("/register", requireAuth, async (req, res, next) => {
  try {
    const body = registerDidSchema.parse(req.body);
    const wallet = signerFor(req.session!.address);
    const { didRegistry } = getChain();
    const tx = await connected(didRegistry, wallet).register(body.did, body.controller);
    const receipt = await tx.wait();
    res.json({ txHash: receipt.hash, did: body.did, controller: body.controller });
  } catch (err) {
    next(err);
  }
});

identityRouter.post("/rotate", requireAuth, async (req, res, next) => {
  try {
    const body = rotateKeySchema.parse(req.body);
    const wallet = signerFor(req.session!.address);
    const { didRegistry } = getChain();
    const tx = await connected(didRegistry, wallet).rotateKey(body.did, body.newController);
    const receipt = await tx.wait();
    res.json({ txHash: receipt.hash, did: body.did, newController: body.newController });
  } catch (err) {
    next(err);
  }
});

identityRouter.post("/revoke", requireAuth, requireRoles(["Admin"]), async (req, res, next) => {
  try {
    const body = revokeDidSchema.parse(req.body);
    const wallet = signerFor(req.session!.address);
    const { didRegistry } = getChain();
    const tx = await connected(didRegistry, wallet).revoke(body.did);
    const receipt = await tx.wait();
    res.json({ txHash: receipt.hash, did: body.did, status: "Revoked" });
  } catch (err) {
    next(err);
  }
});
