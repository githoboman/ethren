import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  console.log(`Deploying AttestAI contracts on network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Deployer address: ${await signer.getAddress()}`);

  const balance = await ethers.provider.getBalance(await signer.getAddress());
  console.log(`Deployer balance: ${ethers.formatEther(balance)} BOT`);

  // 1. Deploy Collateral Vault
  console.log("Deploying AttestAICollateralVault...");
  const VaultFactory = await ethers.getContractFactory("AttestAICollateralVault");
  const vault = await VaultFactory.deploy();
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(`✅ AttestAICollateralVault deployed at: ${vaultAddress}`);
  console.log(`   Tx Hash: ${vault.deploymentTransaction()?.hash}`);

  // 2. Deploy AttestAIBotChainRegistry
  console.log("Deploying AttestAIBotChainRegistry...");
  const RegistryFactory = await ethers.getContractFactory("AttestAIBotChainRegistry");
  const registry = await RegistryFactory.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`✅ AttestAIBotChainRegistry deployed at: ${registryAddress}`);
  console.log(`   Tx Hash: ${registry.deploymentTransaction()?.hash}`);

  console.log("\n================ Deployment Summary ================");
  console.log(`Network: BOT Chain Testnet (Chain ID 968)`);
  console.log(`BOTCHAIN_COLLATERAL_VAULT=${vaultAddress}`);
  console.log(`BOTCHAIN_DECISION_REGISTRY=${registryAddress}`);
  console.log(`Explorer Link: https://scan.bohr.life/address/${registryAddress}`);
  console.log("====================================================");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
