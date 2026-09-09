export const ROLE_NAMES = ["Admin", "Manager", "Auditor", "User"] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

export const ROLE_HASHES = {
  Admin: "ADMIN_ROLE",
  Manager: "MANAGER_ROLE",
  Auditor: "AUDITOR_ROLE",
  User: "USER_ROLE"
} as const;

export const EVIDENCE_TIERS = {
  IdentifierScan: 0,
  SignedInspection: 1
} as const;

export type EvidenceTierName = keyof typeof EVIDENCE_TIERS;

export const CONDITION_LABELS = ["Unknown", "Good", "Damaged", "Missing"] as const;
export type ConditionName = (typeof CONDITION_LABELS)[number];

export const DID_STATUS = ["None", "Active", "Revoked"] as const;
export type DidStatus = (typeof DID_STATUS)[number];
