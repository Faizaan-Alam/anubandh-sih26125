#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const network = process.argv[2] || process.env.ANUBANDH_NETWORK || "anvil";
const deployPath = path.join(root, "packages/shared/deployments", `${network}.json`);
if (!fs.existsSync(deployPath)) {
  console.error("missing", deployPath);
  process.exit(1);
}
const names = ["RoleManager", "DIDRegistry", "AssetNFT", "AttestationRegistry", "DivergenceRegistry"];
const deployment = JSON.parse(fs.readFileSync(deployPath, "utf8"));
deployment.abis = deployment.abis || {};
for (const name of names) {
  const artifact = path.join(root, "contracts/out", `${name}.sol`, `${name}.json`);
  const json = JSON.parse(fs.readFileSync(artifact, "utf8"));
  deployment.abis[name] = json.abi;
}
fs.writeFileSync(deployPath, JSON.stringify(deployment, null, 2));
console.log("merged ABIs into", deployPath);
