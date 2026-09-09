const DID_RE = /^did:ethr:(\d+):(0x[a-fA-F0-9]{40})$/;

export function formatDid(chainId: number, address: string): string {
  return `did:ethr:${chainId}:${address.toLowerCase()}`;
}

export function parseDid(did: string): { chainId: number; address: string } | null {
  const match = DID_RE.exec(did);
  if (!match) return null;
  return { chainId: Number(match[1]), address: match[2].toLowerCase() };
}

export function isDid(value: string): boolean {
  return DID_RE.test(value);
}
