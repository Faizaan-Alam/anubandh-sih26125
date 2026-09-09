import { Router } from "express";
import { id as keccakId } from "ethers";
import {
  allocateAssetSchema,
  mintAssetSchema,
  transferAssetSchema,
  transferCustodySchema
} from "@anubandh/shared";
import { computeConfidence, type EvidenceTierName } from "@anubandh/policy";
import { FileSystemObjectStore } from "@anubandh/storage";
import { requireAuth, requireRoles } from "../auth";
import { connected, getChain, signerFor } from "../chain";
import { prisma } from "../db";
import { env } from "../env";

export const assetsRouter = Router();
const store = new FileSystemObjectStore(env.storageDir);

const TIER_NAME: Record<number, EvidenceTierName> = {
  0: "IdentifierScan",
  1: "SignedInspection"
};

export async function confidenceForToken(tokenId: string) {
  const { assetNFT, attestationRegistry, divergenceRegistry } = getChain();
  const asset = await assetNFT.getAsset(tokenId);
  const ids: bigint[] = await attestationRegistry.attestationsOf(tokenId);
  const latestId = ids.length ? ids[ids.length - 1] : 0n;
  const latest = latestId === 0n ? null : await attestationRegistry.getAttestation(latestId);
  const openId = Number(await divergenceRegistry.openDivergenceOf(tokenId));
  const now = Math.floor(Date.now() / 1000);
  const attestedAt = latest ? Number(latest.timestamp) : Number(asset.freshnessTimestamp);
  const tier = latest ? (TIER_NAME[Number(latest.evidenceTier)] ?? "IdentifierScan") : "IdentifierScan";
  const breakdown = computeConfidence({
    evidenceTier: latest ? tier : "IdentifierScan",
    attestedAt,
    now,
    freshnessWindowSeconds: Number(asset.freshnessWindow),
    hasOpenDivergence: openId !== 0
  });
  return {
    tokenId,
    latestAttestationId: latestId.toString(),
    latestObserver: latest?.observer ?? null,
    breakdown
  };
}

assetsRouter.get("/", async (_req, res, next) => {
  try {
    const { assetNFT } = getChain();
    const minted = Number(await assetNFT.totalMinted());
    const items = [];
    for (let i = 1; i <= minted; i++) {
      const a = await assetNFT.getAsset(i);
      const conf = await confidenceForToken(String(i));
      items.push({
        tokenId: String(i),
        assetIdentifier: a.assetIdentifier,
        owner: a.owner,
        custodian: a.custodian,
        metadataHash: a.metadataHash,
        freshnessTimestamp: Number(a.freshnessTimestamp),
        freshnessWindow: Number(a.freshnessWindow),
        assetClass: Number(a.assetClass),
        quarantined: Boolean(a.quarantined),
        highValue: Boolean(a.highValue),
        confidence: conf.breakdown
      });
    }
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

assetsRouter.get("/:tokenId", async (req, res, next) => {
  try {
    const { assetNFT } = getChain();
    const a = await assetNFT.getAsset(req.params.tokenId);
    const conf = await confidenceForToken(req.params.tokenId);
    res.json({
      tokenId: req.params.tokenId,
      assetIdentifier: a.assetIdentifier,
      owner: a.owner,
      custodian: a.custodian,
      metadataHash: a.metadataHash,
      freshnessTimestamp: Number(a.freshnessTimestamp),
      freshnessWindow: Number(a.freshnessWindow),
      assetClass: Number(a.assetClass),
      quarantined: Boolean(a.quarantined),
      highValue: Boolean(a.highValue),
      confidence: conf
    });
  } catch (err) {
    next(err);
  }
});

assetsRouter.post("/mint", requireAuth, requireRoles(["Admin"]), async (req, res, next) => {
  try {
    const body = mintAssetSchema.parse(req.body);
    const metadata = {
      assetIdentifier: body.assetIdentifier,
      notes: body.metadata ?? {},
      storedAt: new Date().toISOString()
    };
    const stored = await store.put(Buffer.from(JSON.stringify(metadata, null, 2)), "application/json");
    await prisma.storedDocument.create({
      data: { id: stored.id, hash: stored.hash, contentType: stored.contentType }
    });
    const ident = keccakId(body.assetIdentifier);
    const wallet = signerFor(req.session!.address);
    const { assetNFT } = getChain();
    const tx = await connected(assetNFT, wallet).mint(
      body.to,
      ident,
      stored.hash.padEnd(66, "0").slice(0, 66),
      body.assetClass,
      body.freshnessWindowSeconds,
      body.highValue,
      body.custodian ?? body.to
    );
    const receipt = await tx.wait();
    res.json({
      txHash: receipt.hash,
      metadataHash: stored.hash,
      documentId: stored.id,
      note: "Only the document hash is stored on-chain. The raw document is in local object storage."
    });
  } catch (err) {
    next(err);
  }
});

assetsRouter.post("/allocate", requireAuth, requireRoles(["Admin", "Manager"]), async (req, res, next) => {
  try {
    const body = allocateAssetSchema.parse(req.body);
    const wallet = signerFor(req.session!.address);
    const { assetNFT } = getChain();
    const tx = await connected(assetNFT, wallet).allocate(body.tokenId, body.newCustodian);
    const receipt = await tx.wait();
    res.json({ txHash: receipt.hash, tokenId: body.tokenId, newCustodian: body.newCustodian });
  } catch (err) {
    next(err);
  }
});

assetsRouter.post("/transfer", requireAuth, requireRoles(["Admin", "Manager"]), async (req, res, next) => {
  try {
    const body = transferAssetSchema.parse(req.body);
    const wallet = signerFor(req.session!.address);
    const { assetNFT } = getChain();
    const tx = await connected(assetNFT, wallet).transferOwnershipTo(body.tokenId, body.newOwner);
    const receipt = await tx.wait();
    res.json({ txHash: receipt.hash, tokenId: body.tokenId, newOwner: body.newOwner });
  } catch (err) {
    next(err);
  }
});

assetsRouter.post("/custody", requireAuth, requireRoles(["Admin", "Manager"]), async (req, res, next) => {
  try {
    const body = transferCustodySchema.parse(req.body);
    const wallet = signerFor(req.session!.address);
    const { assetNFT } = getChain();
    const tx = await connected(assetNFT, wallet).transferCustody(body.tokenId, body.newCustodian);
    const receipt = await tx.wait();
    res.json({ txHash: receipt.hash, tokenId: body.tokenId, newCustodian: body.newCustodian });
  } catch (err) {
    next(err);
  }
});
