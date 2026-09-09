import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";
import { Contract, JsonRpcProvider, Interface } from "ethers";
import { PrismaClient } from "@prisma/client";
import { loadDeployment } from "@anubandh/shared/deployments";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env.example") });

const prisma = new PrismaClient();
const network = process.env.ANUBANDH_NETWORK ?? "anvil";
const rpcUrl = process.env.ANVIL_RPC_URL ?? "http://127.0.0.1:8545";
const pollMs = Number(process.env.INDEXER_POLL_MS ?? 2000);
const startBlockEnv = Number(process.env.INDEXER_START_BLOCK ?? 0);

function abiOf(name: string): unknown[] {
  const deployment = loadDeployment(network);
  if (deployment.abis?.[name]) return deployment.abis[name];
  const artifact = path.resolve(__dirname, `../../contracts/out/${name}.sol/${name}.json`);
  const json = JSON.parse(fs.readFileSync(artifact, "utf8")) as { abi: unknown[] };
  return json.abi;
}

function asString(value: unknown): string {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value && typeof value === "object" && "toString" in value) return String(value);
  return JSON.stringify(value);
}

function encodeValue(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(encodeValue);
  return value;
}

function payloadOf(parsed: { fragment: { inputs: { name: string }[] }; args: unknown[] }): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  parsed.fragment.inputs.forEach((input, i) => {
    const name = input.name || String(i);
    out[name] = encodeValue(parsed.args[i]);
  });
  return out;
}

async function applySideEffects(eventName: string, p: Record<string, unknown>, timestamp: Date): Promise<void> {
  if (eventName === "DIDRegistered") {
    if (!p.did || String(p.did) === "undefined") return;
    await prisma.didRecord.upsert({
      where: { did: String(p.did) },
      update: { controller: String(p.controller), status: "Active" },
      create: {
        did: String(p.did),
        controller: String(p.controller),
        status: "Active",
        registeredAt: timestamp
      }
    });
  }
  if (eventName === "KeyRotated") {
    await prisma.didRecord.updateMany({
      where: { did: String(p.did) },
      data: { controller: String(p.newController) }
    });
  }
  if (eventName === "DIDRevoked") {
    await prisma.didRecord.updateMany({
      where: { did: String(p.did) },
      data: { status: "Revoked", revokedAt: timestamp }
    });
  }
  if (eventName === "RoleGranted" || eventName === "RoleExpirySet") {
    const account = String(p.account ?? "");
    const role = String(p.role ?? "");
    if (account && role) {
      await prisma.roleGrant.create({
        data: {
          account,
          role,
          grantedBy: String(p.sender ?? p.actor ?? ""),
          grantedAt: timestamp,
          expiresAt: p.expiry ? new Date(Number(p.expiry) * 1000) : null,
          active: true
        }
      });
    }
  }
  if (eventName === "RoleRevoked") {
    await prisma.roleGrant.updateMany({
      where: { account: String(p.account ?? ""), role: String(p.role ?? ""), active: true },
      data: { active: false, revokedAt: timestamp, revokedBy: String(p.sender ?? "") }
    });
  }
  if (eventName === "AssetMinted") {
    const tokenId = asString(p.tokenId);
    if (!tokenId || tokenId === "undefined") return;
    await prisma.asset.upsert({
      where: { tokenId },
      update: {
        owner: String(p.owner),
        custodian: String(p.custodian),
        metadataHash: String(p.metadataHash)
      },
      create: {
        tokenId: asString(p.tokenId),
        assetIdentifier: String(p.assetIdentifier),
        owner: String(p.owner),
        custodian: String(p.custodian),
        metadataHash: String(p.metadataHash),
        freshnessWindow: 7 * 24 * 3600,
        assetClass: Number(p.assetClass ?? 0),
        highValue: Boolean(p.highValue),
        mintedAt: timestamp,
        freshnessTimestamp: timestamp
      }
    });
  }
  if (eventName === "AssetTransferred") {
    await prisma.asset.updateMany({
      where: { tokenId: asString(p.tokenId) },
      data: { owner: String(p.to) }
    });
  }
  if (eventName === "AssetAllocated") {
    await prisma.asset.updateMany({
      where: { tokenId: asString(p.tokenId) },
      data: { custodian: String(p.newCustodian) }
    });
  }
  if (eventName === "AssetQuarantined") {
    await prisma.asset.updateMany({
      where: { tokenId: asString(p.tokenId) },
      data: { quarantined: true }
    });
  }
  if (eventName === "AssetReconciled") {
    await prisma.asset.updateMany({
      where: { tokenId: asString(p.tokenId) },
      data: { quarantined: false, custodian: String(p.newCustodian ?? p.acceptedCustodian ?? "") }
    });
    await prisma.divergence.updateMany({
      where: { tokenId: asString(p.tokenId), resolved: false },
      data: {
        resolved: true,
        resolvedAt: timestamp,
        confirmer: String(p.confirmer ?? p.actor ?? "")
      }
    });
  }
  if (eventName === "AttestationRecorded") {
    await prisma.attestation.upsert({
      where: { nonce: String(p.nonce) },
      update: {},
      create: {
        id: asString(p.attestationId),
        tokenId: asString(p.tokenId),
        observer: String(p.observer),
        evidenceTier: Number(p.evidenceTier),
        custodian: String(p.custodian),
        locationId: String(p.locationId),
        condition: Number(p.condition),
        nonce: String(p.nonce),
        observationHash: String(p.observationHash),
        timestamp
      }
    });
    await prisma.asset.updateMany({
      where: { tokenId: asString(p.tokenId) },
      data: { freshnessTimestamp: timestamp }
    });
  }
  if (eventName === "DivergenceDetected") {
    await prisma.divergence.upsert({
      where: { id: asString(p.divergenceId) },
      update: {},
      create: {
        id: asString(p.divergenceId),
        tokenId: asString(p.tokenId),
        attestationA: asString(p.attestationA),
        attestationB: asString(p.attestationB),
        detectedAt: timestamp,
        resolved: false
      }
    });
  }
}

async function tick(
  provider: JsonRpcProvider,
  contracts: { name: string; contract: Contract; iface: Interface }[]
): Promise<void> {
  const cursor = await prisma.indexerCursor.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", lastBlock: BigInt(Math.max(startBlockEnv - 1, 0)) }
  });
  const head = await provider.getBlockNumber();
  let from = Number(cursor.lastBlock) + 1;
  if (from > head) return;
  const to = Math.min(head, from + 200);
  for (const entry of contracts) {
    const logs = await provider.getLogs({
      address: await entry.contract.getAddress(),
      fromBlock: from,
      toBlock: to
    });
    for (const log of logs) {
      let parsed;
      try {
        parsed = entry.iface.parseLog({ topics: log.topics as string[], data: log.data });
      } catch {
        continue;
      }
      if (!parsed) continue;
      const block = await provider.getBlock(log.blockNumber);
      const timestamp = new Date((block?.timestamp ?? 0) * 1000);
      const payload = payloadOf(parsed);
      if (payload.tokenId !== undefined) payload.tokenId = asString(payload.tokenId);
      try {
        await prisma.chainEvent.create({
          data: {
            contractName: entry.name,
            eventName: parsed.name,
            blockNumber: BigInt(log.blockNumber),
            blockHash: log.blockHash ?? "",
            txHash: log.transactionHash,
            logIndex: log.index,
            timestamp,
            payload
          }
        });
        await applySideEffects(parsed.name, payload, timestamp);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes("Unique constraint")) throw err;
      }
    }
  }
  await prisma.indexerCursor.update({
    where: { id: "default" },
    data: { lastBlock: BigInt(to) }
  });
  console.log(`indexed blocks ${from}-${to}`);
}

async function main(): Promise<void> {
  const deployment = loadDeployment(network);
  const provider = new JsonRpcProvider(rpcUrl);
  const specs = [
    ["RoleManager", deployment.RoleManager],
    ["DIDRegistry", deployment.DIDRegistry],
    ["AssetNFT", deployment.AssetNFT],
    ["AttestationRegistry", deployment.AttestationRegistry],
    ["DivergenceRegistry", deployment.DivergenceRegistry]
  ] as const;
  const contracts = specs.map(([name, address]) => {
    const abi = abiOf(name);
    return { name, contract: new Contract(address, abi, provider), iface: new Interface(abi as never) };
  });
  console.log("ANUBANDH indexer started", { network, rpcUrl });
  for (;;) {
    try {
      await tick(provider, contracts);
    } catch (err) {
      console.error("indexer tick failed", err);
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
