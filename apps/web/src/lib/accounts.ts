/**
 * Well-known Anvil development keys. These are public test keys from Foundry
 * Anvil account 0-4. They are demo signers, not production secrets.
 * IS_SEED_DATA = true
 */
export const IS_SEED_DATA = true;

export interface DemoAccount {
  label: string;
  roleHint: string;
  address: string;
  privateKey: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: "Admin",
    roleHint: "Anvil account 0",
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  },
  {
    label: "Manager",
    roleHint: "Anvil account 1",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
  },
  {
    label: "Auditor",
    roleHint: "Anvil account 2",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
  },
  {
    label: "User",
    roleHint: "Anvil account 3",
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
  },
  {
    label: "User 2",
    roleHint: "Anvil account 4",
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    privateKey: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a"
  }
];

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 31337);
