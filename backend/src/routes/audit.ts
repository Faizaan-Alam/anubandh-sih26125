import { Router } from "express";
import { pointInTimeQuerySchema } from "@anubandh/shared";
import { computeConfidence, type EvidenceTierName } from "@anubandh/policy";
import { prisma } from "../db";
import { requireAuth, requireRoles } from "../auth";

export const auditRouter = Router();

auditRouter.get("/events", requireAuth, requireRoles(["Admin", "Auditor", "Manager"]), async (req, res, next) => {
  try {
    const tokenId = typeof req.query.tokenId === "string" ? req.query.tokenId : undefined;
    const eventName = typeof req.query.eventName === "string" ? req.query.eventName : undefined;
    const rows = await prisma.chainEvent.findMany({
      where: eventName ? { eventName } : undefined,
      orderBy: { timestamp: "asc" },
      take: 2000
    });
    const filtered = tokenId
      ? rows.filter((row) => String((row.payload as { tokenId?: string }).tokenId ?? "") === tokenId)
      : rows.slice(0, 500);
    const items = filtered.map((row) => ({
      ...row,
      blockNumber: row.blockNumber.toString()
    }));
    res.json({ items, source: "indexed ChainEvent rows (append-only)" });
  } catch (err) {
    next(err);
  }
});

auditRouter.get("/point-in-time", requireAuth, requireRoles(["Admin", "Auditor"]), async (req, res, next) => {
  try {
    const parsed = pointInTimeQuerySchema.parse({
      tokenId: req.query.tokenId,
      at: req.query.at
    });
    const at = new Date(parsed.at);
    const events = await prisma.chainEvent.findMany({
      where: { timestamp: { lte: at } },
      orderBy: { timestamp: "asc" }
    });

    let owner: string | null = null;
    let custodian: string | null = null;
    let quarantined = false;
    let highValue = false;
    let freshnessWindow = 7 * 24 * 3600;
    let lastAttestation: {
      id: string;
      evidenceTier: EvidenceTierName;
      timestamp: number;
      observer: string;
    } | null = null;
    let openDivergence = false;
    const roleByAccount = new Map<string, string>();

    for (const ev of events) {
      const p = ev.payload as Record<string, unknown>;
      const token = String(p.tokenId ?? p.tokenId_ ?? "");
      if (ev.eventName === "RoleGranted" || ev.eventName === "RoleGrantedWithExpiry" || ev.eventName === "RoleExpirySet") {
        const account = String(p.account ?? "");
        const role = String(p.role ?? "");
        if (account) roleByAccount.set(account.toLowerCase(), role);
      }
      if (ev.eventName === "RoleRevoked") {
        const account = String(p.account ?? "");
        roleByAccount.delete(account.toLowerCase());
      }
      if (token && token !== parsed.tokenId) continue;
      if (ev.eventName === "AssetMinted") {
        owner = String(p.owner ?? p.to ?? owner);
        custodian = String(p.custodian ?? custodian);
        highValue = Boolean(p.highValue ?? highValue);
      }
      if (ev.eventName === "AssetTransferred") {
        owner = String(p.to ?? p.newOwner ?? owner);
      }
      if (ev.eventName === "AssetAllocated") {
        custodian = String(p.newCustodian ?? custodian);
      }
      if (ev.eventName === "AssetQuarantined") {
        quarantined = true;
        openDivergence = true;
      }
      if (ev.eventName === "AssetReconciled") {
        quarantined = false;
        openDivergence = false;
        custodian = String(p.newCustodian ?? p.acceptedCustodian ?? custodian);
      }
      if (ev.eventName === "AttestationRecorded") {
        lastAttestation = {
          id: String(p.attestationId ?? ""),
          evidenceTier: Number(p.evidenceTier) === 1 ? "SignedInspection" : "IdentifierScan",
          timestamp: Math.floor(new Date(ev.timestamp).getTime() / 1000),
          observer: String(p.observer ?? "")
        };
      }
      if (ev.eventName === "DivergenceDetected" && String(p.tokenId) === parsed.tokenId) {
        openDivergence = true;
        quarantined = true;
      }
    }

    const now = Math.floor(at.getTime() / 1000);
    const confidence = lastAttestation
      ? computeConfidence({
          evidenceTier: lastAttestation.evidenceTier,
          attestedAt: lastAttestation.timestamp,
          now,
          freshnessWindowSeconds: freshnessWindow,
          hasOpenDivergence: openDivergence
        })
      : null;

    res.json({
      tokenId: parsed.tokenId,
      at: at.toISOString(),
      reconstructedFrom: "indexed ChainEvent rows with timestamp <= at",
      owner,
      custodian,
      quarantined,
      highValue,
      openDivergence,
      lastAttestation,
      confidence,
      rolesSample: Object.fromEntries(roleByAccount)
    });
  } catch (err) {
    next(err);
  }
});
