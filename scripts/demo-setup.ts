/**
 * Creates demo identities, roles and one seed asset on a fresh deployment.
 * IS_SEED_DATA = true. Seed asset identifier is SEED-RADIO-001.
 */
export const IS_SEED_DATA = true;

import path from "node:path";
import dotenv from "dotenv";
import { Contract, JsonRpcProvider, Wallet, id as keccakId } from "ethers";
import fs from "node:fs";
import { formatDid } from "@anubandh/shared";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env.example") });

const network = process.env.ANUBANDH_NETWORK ?? "anvil";
const rpc = process.env.ANVIL_RPC_URL ?? "http://127.0.0.1:8545";
const chainId = Number(process.env.CHAIN_ID ?? 31337);
const deployPath = path.resolve(__dirname, `../packages/shared/deployments/${network}.json`);

const ACCOUNTS = [
  {
    name: "admin",
    pk: process.env.DEPLOYER_PRIVATE_KEY as string
  },
  {
    name: "manager",
    pk: process.env.DEMO_MANAGER_PRIVATE_KEY as string
  },
  {
    name: "auditor",
    pk: process.env.DEMO_AUDITOR_PRIVATE_KEY as string
  },
  {
    name: "user",
    pk: process.env.DEMO_USER_PRIVATE_KEY as string
  },
  {
    name: "user2",
    pk: process.env.DEMO_USER2_PRIVATE_KEY as string
  }
];

async function main() {
  const deployment = JSON.parse(fs.readFileSync(deployPath, "utf8"));
  const provider = new JsonRpcProvider(rpc);
  const admin = new Wallet(ACCOUNTS[0].pk, provider);
  const abi = (name: string) => deployment.abis[name];
  const roleManager = new Contract(deployment.RoleManager, abi("RoleManager"), admin);
  const didRegistry = new Contract(deployment.DIDRegistry, abi("DIDRegistry"), admin);
  const assetNFT = new Contract(deployment.AssetNFT, abi("AssetNFT"), admin);

  const ROLE = {
    Manager: keccakId("MANAGER_ROLE"),
    Auditor: keccakId("AUDITOR_ROLE"),
    User: keccakId("USER_ROLE")
  };

  for (const acc of ACCOUNTS) {
    const w = new Wallet(acc.pk, provider);
    const did = formatDid(chainId, w.address);
    const existing = await didRegistry.statusOf(did);
    if (Number(existing) === 0) {
      const tx = await didRegistry.register(did, w.address);
      await tx.wait();
      console.log("registered", did);
    } else {
      console.log("already registered", did);
    }
  }

  const grants: [string, string][] = [
    [ACCOUNTS[1].pk, ROLE.Manager],
    [ACCOUNTS[2].pk, ROLE.Auditor],
    [ACCOUNTS[3].pk, ROLE.User],
    [ACCOUNTS[4].pk, ROLE.User]
  ];
  for (const [pk, role] of grants) {
    const addr = new Wallet(pk).address;
    const has = await roleManager.hasActiveRole(addr, role);
    if (!has) {
      const tx = await roleManager.grantRole(role, addr);
      await tx.wait();
      console.log("granted role to", addr);
    }
  }

  const ident = keccakId("SEED-RADIO-001");
  const existingToken = await assetNFT.tokenByIdentifier(ident);
  if (Number(existingToken) === 0) {
    const user = new Wallet(ACCOUNTS[3].pk).address;
    const tx = await assetNFT.mint(user, ident, keccakId("seed-meta"), 0, 7 * 24 * 3600, false, user);
    await tx.wait();
    console.log("minted SEED-RADIO-001");
  } else {
    console.log("seed asset already exists", existingToken.toString());
  }
  console.log("demo setup complete. IS_SEED_DATA =", IS_SEED_DATA);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
