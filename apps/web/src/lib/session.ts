"use client";

import { Wallet } from "ethers";
import { formatDid } from "@anubandh/shared";
import { buildLoginMessage } from "@anubandh/crypto";
import { api } from "./api";
import { CHAIN_ID, DEMO_ACCOUNTS } from "./accounts";

const TOKEN_KEY = "anubandh.token";
const KEY_KEY = "anubandh.key";

export function loadStoredKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY_KEY);
}

export function storeKey(pk: string): void {
  localStorage.setItem(KEY_KEY, pk);
}

export function loadToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function walletFromKey(pk: string): Wallet {
  return new Wallet(pk);
}

export async function loginWithKey(privateKey: string) {
  const wallet = new Wallet(privateKey);
  const did = formatDid(CHAIN_ID, wallet.address);
  const challenge = await api<{ nonce: string }>(`/auth/challenge`, {
    method: "POST",
    body: JSON.stringify({ address: wallet.address, did })
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const message = buildLoginMessage({
    did,
    address: wallet.address,
    nonce: challenge.nonce,
    timestamp
  });
  const signature = await wallet.signMessage(message);
  const session = await api<{
    token: string;
    did: string;
    address: string;
    role: string;
    roleSource: string;
  }>(`/auth/login`, {
    method: "POST",
    body: JSON.stringify({
      address: wallet.address,
      did,
      nonce: challenge.nonce,
      timestamp,
      signature
    })
  });
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(KEY_KEY, privateKey);
  return session;
}

export function demoForAddress(address: string) {
  return DEMO_ACCOUNTS.find((a) => a.address.toLowerCase() === address.toLowerCase());
}
