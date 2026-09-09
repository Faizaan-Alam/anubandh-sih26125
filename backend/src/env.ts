import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env.example") });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  rpcUrl: required("ANVIL_RPC_URL", "http://127.0.0.1:8545"),
  chainId: Number(process.env.CHAIN_ID ?? 31337),
  network: process.env.ANUBANDH_NETWORK ?? "anvil",
  jwtSecret: required("JWT_SECRET", "dev-only-jwt-secret"),
  jwtTtlSeconds: Number(process.env.JWT_TTL_SECONDS ?? 1800),
  loginNonceTtlSeconds: Number(process.env.LOGIN_NONCE_TTL_SECONDS ?? 120),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  verifierOrigin: process.env.VERIFIER_ORIGIN ?? "http://localhost:3001",
  databaseUrl: required("DATABASE_URL", "postgresql://anubandh:anubandh@127.0.0.1:5432/anubandh?schema=public"),
  storageDir: process.env.STORAGE_DIR ?? path.resolve(__dirname, "../../storage-data"),
  deployerKey: required(
    "DEPLOYER_PRIVATE_KEY",
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  ),
  demoKeys: {
    admin: process.env.DEPLOYER_PRIVATE_KEY,
    manager: process.env.DEMO_MANAGER_PRIVATE_KEY,
    auditor: process.env.DEMO_AUDITOR_PRIVATE_KEY,
    user: process.env.DEMO_USER_PRIVATE_KEY,
    user2: process.env.DEMO_USER2_PRIVATE_KEY
  }
};
