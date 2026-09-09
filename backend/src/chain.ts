import { Contract, JsonRpcProvider, Wallet, id as keccakId, type InterfaceAbi } from "ethers";
import { loadDeployment, type NetworkDeployment } from "@anubandh/shared/deployments";
import { env } from "./env";
import fs from "node:fs";
import path from "node:path";

export const ROLE_IDS = {
  Admin: keccakId("ADMIN_ROLE"),
  Manager: keccakId("MANAGER_ROLE"),
  Auditor: keccakId("AUDITOR_ROLE"),
  User: keccakId("USER_ROLE")
} as const;

export type RoleName = keyof typeof ROLE_IDS;

function readAbi(name: string): InterfaceAbi {
  const deployment = loadDeployment(env.network);
  if (deployment.abis?.[name]) return deployment.abis[name];
  const artifact = path.resolve(__dirname, `../../contracts/out/${name}.sol/${name}.json`);
  if (!fs.existsSync(artifact)) {
    throw new Error(`Missing ABI for ${name} at ${artifact}. Build contracts first.`);
  }
  const json = JSON.parse(fs.readFileSync(artifact, "utf8")) as { abi: InterfaceAbi };
  return json.abi;
}

let cached: {
  provider: JsonRpcProvider;
  deployment: NetworkDeployment;
  roleManager: Contract;
  didRegistry: Contract;
  assetNFT: Contract;
  attestationRegistry: Contract;
  divergenceRegistry: Contract;
  wallets: Map<string, Wallet>;
} | null = null;

export function getChain() {
  if (cached) return cached;
  const deployment = loadDeployment(env.network);
  const provider = new JsonRpcProvider(env.rpcUrl, env.chainId, { staticNetwork: true });
  const roleManager = new Contract(deployment.RoleManager, readAbi("RoleManager"), provider);
  const didRegistry = new Contract(deployment.DIDRegistry, readAbi("DIDRegistry"), provider);
  const assetNFT = new Contract(deployment.AssetNFT, readAbi("AssetNFT"), provider);
  const attestationRegistry = new Contract(
    deployment.AttestationRegistry,
    readAbi("AttestationRegistry"),
    provider
  );
  const divergenceRegistry = new Contract(
    deployment.DivergenceRegistry,
    readAbi("DivergenceRegistry"),
    provider
  );

  const wallets = new Map<string, Wallet>();
  const keys = [
    env.demoKeys.admin,
    env.demoKeys.manager,
    env.demoKeys.auditor,
    env.demoKeys.user,
    env.demoKeys.user2
  ].filter((k): k is string => Boolean(k));
  for (const key of keys) {
    const w = new Wallet(key, provider);
    wallets.set(w.address.toLowerCase(), w);
  }

  cached = {
    provider,
    deployment,
    roleManager,
    didRegistry,
    assetNFT,
    attestationRegistry,
    divergenceRegistry,
    wallets
  };
  return cached;
}

export function resetChainCache(): void {
  cached = null;
}

// Writable contract: ABI methods are resolved at runtime from deployments JSON.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function connected(contract: Contract, wallet: Wallet): any {
  return contract.connect(wallet);
}

export function signerFor(address: string): Wallet {
  const wallet = getChain().wallets.get(address.toLowerCase());
  if (!wallet) {
    throw Object.assign(new Error("No local signer is configured for this address"), { status: 400 });
  }
  return wallet;
}

export async function onChainRole(address: string): Promise<RoleName | "None"> {
  const { roleManager } = getChain();
  const order: RoleName[] = ["Admin", "Manager", "Auditor", "User"];
  for (const name of order) {
    const has = (await roleManager.hasActiveRole(address, ROLE_IDS[name])) as boolean;
    if (has) return name;
  }
  return "None";
}

export async function assertActiveDid(address: string): Promise<string> {
  const { didRegistry } = getChain();
  const did = (await didRegistry.didOfController(address)) as string;
  if (!did) {
    throw Object.assign(new Error("Address is not a registered DID controller"), { status: 403 });
  }
  const active = (await didRegistry.isActiveController(address)) as boolean;
  if (!active) {
    throw Object.assign(new Error("DID is revoked or inactive"), { status: 403 });
  }
  return did;
}
