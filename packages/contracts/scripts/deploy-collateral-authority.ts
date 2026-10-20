import { ethers } from "hardhat";

function positiveInteger(name: string, fallback?: string) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

async function main() {
  const chainKey = positiveInteger("SOURCE_CHAIN_KEY");
  const vault = process.env.COLLATERAL_VAULT_ADDRESS;
  if (!vault || !ethers.isAddress(vault)) throw new Error("COLLATERAL_VAULT_ADDRESS must be a valid address");
  const budgetBps = positiveInteger("COLLATERAL_BUDGET_BPS", "2000");
  if (budgetBps > 10_000) throw new Error("COLLATERAL_BUDGET_BPS cannot exceed 10000");
  const perTradeCap = ethers.parseEther(process.env.PER_TRADE_CAP_ETH ?? "0.01");
  const absoluteCap = ethers.parseEther(process.env.ABSOLUTE_BUDGET_CAP_ETH ?? "0.05");
  if (perTradeCap <= 0 || absoluteCap <= 0) throw new Error("Authority caps must be positive ETH amounts");
  const [signer] = await ethers.getSigners();
  const decoder = await (await ethers.getContractFactory("EvmV1Decoder")).deploy();
  await decoder.waitForDeployment();
  const factory = await ethers.getContractFactory("AttestAICollateralAuthority", { libraries: { EvmV1Decoder: await decoder.getAddress() } });
  const contract = await factory.deploy(chainKey, vault, await signer.getAddress(), budgetBps, perTradeCap, absoluteCap);
  await contract.waitForDeployment();
  console.log(`COLLATERAL_DECODER_ADDRESS=${await decoder.getAddress()}`);
  console.log(`COLLATERAL_DECODER_DEPLOYMENT_TX_HASH=${decoder.deploymentTransaction()?.hash ?? "unavailable"}`);
  console.log(`COLLATERAL_AUTHORITY_ADDRESS=${await contract.getAddress()}`);
  console.log(`COLLATERAL_AUTHORITY_DEPLOYMENT_TX_HASH=${contract.deploymentTransaction()?.hash ?? "unavailable"}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Collateral authority deployment failed"); process.exitCode = 1; });
