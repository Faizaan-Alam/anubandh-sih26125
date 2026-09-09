import fs from "node:fs";
import path from "node:path";

export interface NetworkDeployment {
  chainId: number;
  network: string;
  RoleManager: string;
  DIDRegistry: string;
  AssetNFT: string;
  AttestationRegistry: string;
  DivergenceRegistry: string;
  abis?: Record<string, object[]>;
}

export function deploymentsDir(): string {
  return path.resolve(__dirname, "..", "deployments");
}

export function loadDeployment(network = process.env.ANUBANDH_NETWORK ?? "anvil"): NetworkDeployment {
  const file = path.join(deploymentsDir(), `${network}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Deployment file not found: ${file}. Run scripts/deploy.sh first.`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as NetworkDeployment;
}

export function tryLoadDeployment(network = process.env.ANUBANDH_NETWORK ?? "anvil"): NetworkDeployment | null {
  try {
    return loadDeployment(network);
  } catch {
    return null;
  }
}
