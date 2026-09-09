import { z } from "zod";

export const hexAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "must be a 20-byte hex address");

export const hexBytes32 = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "must be a 32-byte hex value");

export const didSchema = z
  .string()
  .regex(/^did:ethr:\d+:0x[a-fA-F0-9]{40}$/, "must be did:ethr:<chainId>:<address>");

export const challengeRequestSchema = z.object({
  address: hexAddress,
  did: didSchema.optional()
});

export const loginRequestSchema = z.object({
  address: hexAddress,
  did: didSchema,
  nonce: z.string().min(8),
  timestamp: z.number().int().positive(),
  signature: z.string().min(10)
});

export const registerDidSchema = z.object({
  did: didSchema,
  controller: hexAddress
});

export const rotateKeySchema = z.object({
  did: didSchema,
  newController: hexAddress
});

export const revokeDidSchema = z.object({
  did: didSchema
});

export const grantRoleSchema = z.object({
  account: hexAddress,
  role: z.enum(["Admin", "Manager", "Auditor", "User"]),
  expiry: z.number().int().nonnegative().optional()
});

export const revokeRoleSchema = z.object({
  account: hexAddress,
  role: z.enum(["Admin", "Manager", "Auditor", "User"])
});

export const mintAssetSchema = z.object({
  to: hexAddress,
  assetIdentifier: z.string().min(1).max(128),
  metadata: z.record(z.unknown()).optional(),
  assetClass: z.number().int().min(0).max(255).default(0),
  freshnessWindowSeconds: z.number().int().positive().default(7 * 24 * 3600),
  highValue: z.boolean().default(false),
  custodian: hexAddress.optional()
});

export const allocateAssetSchema = z.object({
  tokenId: z.string().regex(/^\d+$/),
  newCustodian: hexAddress
});

export const transferAssetSchema = z.object({
  tokenId: z.string().regex(/^\d+$/),
  newOwner: hexAddress
});

export const transferCustodySchema = z.object({
  tokenId: z.string().regex(/^\d+$/),
  newCustodian: hexAddress
});

export const submitAttestationSchema = z.object({
  observer: hexAddress,
  tokenId: z.string().regex(/^\d+$/),
  evidenceTier: z.enum(["IdentifierScan", "SignedInspection"]),
  custodian: hexAddress,
  location: z.string().min(1).max(200),
  condition: z.enum(["Unknown", "Good", "Damaged", "Missing"]),
  nonce: hexBytes32,
  validUntil: z.number().int().positive(),
  observationNotes: z.string().max(2000).optional(),
  signature: z.string().min(10)
});

export const proposeReconciliationSchema = z.object({
  divergenceId: z.string().regex(/^\d+$/),
  evidenceNotes: z.string().min(1).max(2000),
  acceptedCustodian: hexAddress,
  acceptedLocation: z.string().min(1).max(200),
  acceptedCondition: z.enum(["Unknown", "Good", "Damaged", "Missing"])
});

export const confirmReconciliationSchema = z.object({
  divergenceId: z.string().regex(/^\d+$/)
});

export const issueCredentialSchema = z.object({
  subjectDid: didSchema,
  role: z.enum(["Admin", "Manager", "Auditor", "User"]),
  expiresAt: z.string().datetime(),
  claims: z.record(z.unknown()).optional()
});

export const revokeCredentialSchema = z.object({
  credentialId: z.string().min(1)
});

export const pointInTimeQuerySchema = z.object({
  tokenId: z.string().regex(/^\d+$/),
  at: z.string().datetime()
});

export const offlineDecisionSchema = z.object({
  actorDid: didSchema,
  actorAddress: hexAddress,
  operation: z.string().min(1),
  riskTier: z.enum(["low", "high"]),
  snapshotAgeSeconds: z.number().int().nonnegative(),
  allowed: z.boolean(),
  reason: z.string().min(1),
  payload: z.record(z.unknown()),
  signedAt: z.number().int().positive(),
  nonce: hexBytes32,
  signature: z.string().min(10)
});

export const issueCredentialResponseHint = z.object({
  id: z.string()
});
