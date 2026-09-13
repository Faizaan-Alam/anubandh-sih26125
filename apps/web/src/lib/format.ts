import { DEMO_ACCOUNTS } from "./accounts";

export function shortAddr(value: string, head = 6, tail = 4): string {
  if (!value) return "-";
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export function labelForAddress(address: string): string {
  const hit = DEMO_ACCOUNTS.find((a) => a.address.toLowerCase() === address.toLowerCase());
  return hit ? hit.label : shortAddr(address);
}

export function txShort(hash: string): string {
  if (!hash) return "";
  return hash.startsWith("0x") ? `${hash.slice(0, 10)}...` : hash;
}
