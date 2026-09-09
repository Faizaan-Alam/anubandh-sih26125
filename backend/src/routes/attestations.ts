import { Router } from "express";
import rateLimit from "express-rate-limit";
import { id as keccakId } from "ethers";
import { submitAttestationSchema, EVIDENCE_TIERS, CONDITION_LABELS } from "@anubandh/shared";
import { recoverAttestationSigner } from "@anubandh/crypto";
import { requireAuth, requireRoles } from "../auth";
import { env } from "../env";
import { connected, getChain, signerFor } from "../chain";

export const attestationsRouter = Router();

const attestLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false
});

const CONDITION_INDEX: Record<string, number> = {
  Unknown: 0,
  Good: 1,
  Damaged: 2,
  Missing: 3
};

attestationsRouter.get("/asset/:tokenId", async (req, res, next) => {
  try {
    const { attestationRegistry } = getChain();
    const ids: bigint[] = await attestationRegistry.attestationsOf(req.params.tokenId);
    const items = [];
    for (const id of ids) {
      const o = await attestationRegistry.getAttestation(id);
      items.push({
        id: id.toString(),
        tokenId: o.tokenId.toString(),
        observer: o.observer,
        evidenceTier: Number(o.evidenceTier) === 1 ? "SignedInspection" : "IdentifierScan",
        custodian: o.custodian,
        locationId: o.locationId,
        condition: CONDITION_LABELS[Number(o.condition)] ?? "Unknown",
        nonce: o.nonce,
        observationHash: o.observationHash,
        timestamp: Number(o.timestamp)
      });
    }
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

attestationsRouter.post("/", attestLimiter, requireAuth, requireRoles(["Admin", "Manager", "User"]), async (req, res, next) => {
  try {
    const body = submitAttestationSchema.parse(req.body);
    if (body.observer.toLowerCase() !== req.session!.address.toLowerCase()) {
      res.status(403).json({ error: "Observer must match the authenticated session address" });
      return;
    }
    const { deployment } = getChain();
    const payload = {
      tokenId: body.tokenId,
      evidenceTier: EVIDENCE_TIERS[body.evidenceTier],
      custodian: body.custodian,
      locationId: keccakId(body.location),
      condition: CONDITION_INDEX[body.condition],
      nonce: body.nonce,
      validUntil: body.validUntil
    };
    const recovered = recoverAttestationSigner(
      env.chainId,
      deployment.AttestationRegistry,
      payload,
      body.signature
    );
    if (recovered !== body.observer.toLowerCase()) {
      res.status(400).json({ error: "Attestation signature does not match the observer" });
      return;
    }
    const wallet = signerFor(req.session!.address);
    const { attestationRegistry } = getChain();
    const notesHash = keccakId(body.observationNotes ?? "");
    const tx = await connected(attestationRegistry, wallet).submitAttestation(
      body.observer,
      body.tokenId,
      payload.evidenceTier,
      payload.custodian,
      payload.locationId,
      payload.condition,
      payload.nonce,
      payload.validUntil,
      notesHash,
      body.signature
    );
    const receipt = await tx.wait();
    res.json({
      txHash: receipt.hash,
      evidenceTier: body.evidenceTier,
      note:
        body.evidenceTier === "IdentifierScan"
          ? "IdentifierScan is weaker evidence. A QR or NFC identifier is not unclonable or tamper-proof."
          : "SignedInspection is a role-bound signed observation. It is an organizational attestation, not physical-world truth."
    });
  } catch (err) {
    next(err);
  }
});
