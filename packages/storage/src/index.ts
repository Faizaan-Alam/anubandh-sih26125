import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export interface StoredObject {
  id: string;
  hash: string;
  contentType: string;
  byteLength: number;
}

export interface ObjectStore {
  put(bytes: Buffer, contentType: string): Promise<StoredObject>;
  get(id: string): Promise<{ meta: StoredObject; bytes: Buffer }>;
}

/**
 * Filesystem-backed object store. Only the content hash is intended to be
 * committed on-chain. The raw document never leaves this store.
 */
export class FileSystemObjectStore implements ObjectStore {
  constructor(private readonly root: string) {}

  async put(bytes: Buffer, contentType: string): Promise<StoredObject> {
    await fs.mkdir(this.root, { recursive: true });
    const hash = "0x" + createHash("sha256").update(bytes).digest("hex");
    const id = randomUUID();
    const meta: StoredObject = { id, hash, contentType, byteLength: bytes.length };
    await fs.writeFile(path.join(this.root, `${id}.bin`), bytes);
    await fs.writeFile(path.join(this.root, `${id}.json`), JSON.stringify(meta, null, 2));
    return meta;
  }

  async get(id: string): Promise<{ meta: StoredObject; bytes: Buffer }> {
    const meta = JSON.parse(await fs.readFile(path.join(this.root, `${id}.json`), "utf8")) as StoredObject;
    const bytes = await fs.readFile(path.join(this.root, `${id}.bin`));
    return { meta, bytes };
  }
}

export function keccakLikeSha256(bytes: Buffer): string {
  return "0x" + createHash("sha256").update(bytes).digest("hex");
}
