import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envCandidates = [
  resolve(__dirname, "../../.env"),
  resolve(__dirname, "../.env"),
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
];
const envPath = envCandidates.find((p) => existsSync(p));
if (envPath) {
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const config: HardhatUserConfig = {
  solidity: { version: "0.8.28", settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true } },
  paths: { sources: "./contracts", tests: "./test" },
  networks: {
    hardhat: { chainId: 31337 },
    sepolia: { url: process.env.SOURCE_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com", chainId: 11155111, accounts: process.env.RELAYER_PRIVATE_KEY ? [process.env.RELAYER_PRIVATE_KEY] : [] },
    creditcoin_usc_testnet: { url: process.env.CREDITCOIN_RPC_URL ?? "https://rpc.cc3-testnet.creditcoin.network", chainId: 102031, accounts: process.env.RELAYER_PRIVATE_KEY ? [process.env.RELAYER_PRIVATE_KEY] : [] },
    botchain_testnet: { url: process.env.BOTCHAIN_TESTNET_RPC_URL ?? "https://rpc.bohr.life", chainId: 968, accounts: process.env.RELAYER_PRIVATE_KEY ? [process.env.RELAYER_PRIVATE_KEY] : [] },
    botchain_mainnet: { url: process.env.BOTCHAIN_MAINNET_RPC_URL ?? "https://rpc.botchain.ai", chainId: 677, accounts: process.env.RELAYER_PRIVATE_KEY ? [process.env.RELAYER_PRIVATE_KEY] : [] }
  },
};

export default config;
