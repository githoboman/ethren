import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), "../../.env") });

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
