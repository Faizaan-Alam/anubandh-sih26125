#!/usr/bin/env node
/**
 * Start PostgreSQL for local development.
 * Prefer Docker Compose. If Docker is unavailable, download a user-space
 * PostgreSQL binary via embedded-postgres and run it on POSTGRES_PORT.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.POSTGRES_PORT || "5432";

function dockerUp() {
  const r = spawnSync("docker", ["compose", "up", "-d", "postgres"], { cwd: root, stdio: "inherit" });
  return !r.error && r.status === 0;
}

async function embedded() {
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const dataDir = path.join(root, ".postgres-data");
  fs.mkdirSync(dataDir, { recursive: true });
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: process.env.POSTGRES_USER || "anubandh",
    password: process.env.POSTGRES_PASSWORD || "anubandh",
    port: Number(port),
    persistent: true
  });
  await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase("anubandh");
  } catch {
    // already exists
  }
  console.log(`embedded postgres listening on 127.0.0.1:${port}`);
  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  await new Promise(() => {});
}

if (dockerUp()) {
  console.log("postgres started via docker compose");
  process.exit(0);
}
console.log("Docker Compose unavailable; starting user-space PostgreSQL.");
embedded().catch((err) => {
  console.error(err);
  process.exit(1);
});
