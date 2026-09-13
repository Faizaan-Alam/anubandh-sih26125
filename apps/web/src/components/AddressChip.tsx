"use client";

import { useState } from "react";
import { labelForAddress, shortAddr } from "@/lib/format";

export function AddressChip({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const name = labelForAddress(address);
  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard may be blocked */
    }
  }
  return (
    <button type="button" onClick={copy} title={address} className="btn btn-ghost btn-xs font-mono">
      {name}
      {name !== shortAddr(address) ? <span className="opacity-60">({shortAddr(address)})</span> : null}
      <span className="opacity-50">{copied ? "copied" : "copy"}</span>
    </button>
  );
}
