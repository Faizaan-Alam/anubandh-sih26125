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
    <button
      type="button"
      onClick={copy}
      title={address}
      className="inline-flex items-center gap-1 font-mono text-xs border border-line bg-paper px-1.5 py-0.5 hover:bg-slate-100"
    >
      {name}
      {name !== shortAddr(address) ? <span className="text-slate-500">({shortAddr(address)})</span> : null}
      <span className="text-slate-400">{copied ? "copied" : "copy"}</span>
    </button>
  );
}
