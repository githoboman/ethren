import { ethers } from "ethers";
import { chainInfo } from "@gluwa/usc-sdk";
import { required } from "./env.js";
import { createProvider } from "./provider.js";

async function checkRpc(name: string, url: string, expectedChainId: number) {
  const provider = createProvider(url);
  provider.on("error", () => undefined);
  try {
    const network = await provider.getNetwork();
    const balance = await provider.getBalance(new ethers.Wallet(required("RELAYER_PRIVATE_KEY")).address);
    const actual = Number(network.chainId);
    console.log(`${name}: chainId=${actual} expected=${expectedChainId} balanceWei=${balance.toString()} balanceNonZero=${balance > 0n}`);
    if (actual !== expectedChainId) throw new Error(`${name} chain ID mismatch`);
    if (balance === 0n) throw new Error(`${name} deployer balance is zero`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "RPC request failed";
    throw new Error(`${name} RPC connectivity failed: ${message}`);
  } finally {
    if ("destroy" in provider && typeof provider.destroy === "function") provider.destroy();
  }
}

async function main() {
  const key = required("RELAYER_PRIVATE_KEY");
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error("RELAYER_PRIVATE_KEY is not a valid private key");
  const walletAddress = new ethers.Wallet(key).address;
  console.log(`Wallet address: ${walletAddress}`);
  const source = required("SOURCE_RPC_URL");
  const creditcoin = required("CREDITCOIN_RPC_URL");
  required("CREDITCOIN_PROOF_BUILDER_URL");
  const sourceChainKey = Number(required("SOURCE_CHAIN_KEY"));
  if (sourceChainKey !== 1) throw new Error("SOURCE_CHAIN_KEY must be 1 for Ethereum Sepolia on Creditcoin CC3 Testnet");
  console.log("SOURCE_CHAIN_KEY: 1 (Ethereum Sepolia)");
  for (const [name, address] of [["SOURCE_CONTRACT_ADDRESS", process.env.SOURCE_CONTRACT_ADDRESS], ["DECISION_CONTRACT_ADDRESS", process.env.DECISION_CONTRACT_ADDRESS]] as const) if (address && !ethers.isAddress(address)) throw new Error(`${name} is invalid`);
  await checkRpc("Sepolia", source, 11155111);
  await checkRpc("Creditcoin CC3 Testnet", creditcoin, Number(process.env.CREDITCOIN_CHAIN_ID ?? 102031));
  const creditcoinProvider = createProvider(creditcoin);
  try {
    const supportedChains = await new chainInfo.PrecompileChainInfoProvider(creditcoinProvider as any).getSupportedChains();
    if (!supportedChains.some((chain) => chain.chainKey === sourceChainKey)) throw new Error(`SOURCE_CHAIN_KEY=${sourceChainKey} is not supported on Creditcoin CC3 Testnet`);
    console.log(`Supported source chain: key=${sourceChainKey} (Ethereum Sepolia)`);
  } finally {
    if ("destroy" in creditcoinProvider && typeof creditcoinProvider.destroy === "function") creditcoinProvider.destroy();
  }
  console.log("PREFLIGHT_OK");
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Preflight failed"); process.exitCode = 1; });
