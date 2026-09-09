/**
 * Seed script labels demo rows as seed data. The UI shows a "seed data" badge
 * for any record whose assetIdentifier or did is listed here.
 * IS_SEED_DATA is true for this file's outputs only.
 */
export const IS_SEED_DATA = true;

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Database seed is a no-op. Demo identities and assets are created on-chain by scripts/demo-setup.ts.");
  console.log("IS_SEED_DATA =", IS_SEED_DATA);
}

main()
  .finally(() => prisma.$disconnect());
