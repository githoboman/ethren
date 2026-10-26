import { ethers } from "hardhat";
import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

async function main() {
  const signers = await ethers.getSigners();
  if (!signers || signers.length === 0) {
    console.error("❌ No deployer signer found. Please check RELAYER_PRIVATE_KEY in your .env file.");
    process.exit(1);
  }
  const signer = signers[0];
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const isMainnet = chainId === 677;
  const isTestnet = chainId === 968;
  const networkName = isMainnet
    ? "BOT Chain Mainnet"
    : isTestnet
    ? "BOT Chain Testnet"
    : network.name || `Chain ID ${chainId}`;
  const explorerUrl = isMainnet ? "https://scan.botchain.ai" : "https://scan.bohr.life";
  const rpcUrl = isMainnet ? "https://rpc.botchain.ai" : "https://rpc.bohr.life";

  console.log("====================================================");
  console.log(`🚀 Deploying AttestAI Contracts to ${networkName}`);
  console.log(`Network: ${networkName} (Chain ID: ${chainId})`);
  console.log(`RPC Endpoint: ${rpcUrl}`);
  console.log(`Deployer: ${await signer.getAddress()}`);

  const balance = await ethers.provider.getBalance(await signer.getAddress());
  console.log(`Available Balance: ${ethers.formatEther(balance)} BOT`);
  console.log("====================================================\n");

  if (balance === 0n) {
    console.error(`❌ Insufficient funds on ${networkName}!`);
    if (isMainnet) {
      console.error("   Acquire BOT tokens via BOT Chain DEX (https://dex.botchain.ai/#/swap) or bridge before deploying to mainnet.");
    } else {
      console.error("   Claim testnet tokens at: https://faucet.botchain.ai/basic");
    }
    process.exit(1);
  }

  // 1. Deploy Collateral Vault
  console.log("1. Deploying AttestAICollateralVault...");
  const VaultFactory = await ethers.getContractFactory("AttestAICollateralVault");
  const vault = await VaultFactory.deploy();
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  const vaultTx = vault.deploymentTransaction()?.hash;
  console.log(`   ✅ AttestAICollateralVault: ${vaultAddress}`);
  console.log(`   Tx Hash: ${vaultTx}`);
  console.log(`   Explorer: ${explorerUrl}/address/${vaultAddress}\n`);

  // 2. Deploy AttestAIBotChainRegistry
  console.log("2. Deploying AttestAIBotChainRegistry...");
  const RegistryFactory = await ethers.getContractFactory("AttestAIBotChainRegistry");
  const registry = await RegistryFactory.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  const registryTx = registry.deploymentTransaction()?.hash;
  console.log(`   ✅ AttestAIBotChainRegistry: ${registryAddress}`);
  console.log(`   Tx Hash: ${registryTx}`);
  console.log(`   Explorer: ${explorerUrl}/address/${registryAddress}\n`);

  // 3. Deploy SignalEmitter
  console.log("3. Deploying SignalEmitter...");
  const EmitterFactory = await ethers.getContractFactory("SignalEmitter");
  const emitter = await EmitterFactory.deploy();
  await emitter.waitForDeployment();
  const emitterAddress = await emitter.getAddress();
  const emitterTx = emitter.deploymentTransaction()?.hash;
  console.log(`   ✅ SignalEmitter: ${emitterAddress}`);
  console.log(`   Tx Hash: ${emitterTx}`);
  console.log(`   Explorer: ${explorerUrl}/address/${emitterAddress}\n`);

  const finalBalance = await ethers.provider.getBalance(await signer.getAddress());

  // Record deployment metadata
  const deploymentInfo = {
    network: networkName,
    chainId,
    collateralVault: vaultAddress,
    decisionRegistry: registryAddress,
    signalEmitter: emitterAddress,
    deployer: await signer.getAddress(),
    vaultTx,
    registryTx,
    emitterTx,
    deployedAt: new Date().toISOString(),
  };

  const filename = isMainnet ? "deployed-botchain-mainnet.json" : "deployed-botchain.json";
  const projectRootFile = resolve(process.cwd(), `../../${filename}`);
  const targetFile = existsSync(resolve(process.cwd(), "../../package.json")) ? projectRootFile : resolve(process.cwd(), filename);
  try {
    writeFileSync(targetFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`💾 Saved deployment artifact to: ${filename}`);
  } catch (err) {
    console.warn(`Could not save file to ${targetFile}:`, err);
  }

  console.log("\n================ Deployment Summary ================");
  console.log(`Network: ${networkName} (Chain ID ${chainId})`);
  console.log(`Remaining Balance: ${ethers.formatEther(finalBalance)} BOT`);
  console.log("----------------------------------------------------");
  if (isMainnet) {
    console.log("Add the following to your .env file for Mainnet:");
    console.log(`BOTCHAIN_MAINNET_COLLATERAL_VAULT=${vaultAddress}`);
    console.log(`BOTCHAIN_MAINNET_DECISION_REGISTRY=${registryAddress}`);
    console.log(`BOTCHAIN_MAINNET_SIGNAL_EMITTER=${emitterAddress}`);
  } else {
    console.log("Add the following to your .env file for Testnet:");
    console.log(`BOTCHAIN_COLLATERAL_VAULT=${vaultAddress}`);
    console.log(`BOTCHAIN_DECISION_REGISTRY=${registryAddress}`);
    console.log(`BOTCHAIN_SIGNAL_EMITTER=${emitterAddress}`);
  }
  console.log("----------------------------------------------------");
  console.log(`Explorer Link: ${explorerUrl}/address/${registryAddress}`);
  console.log("====================================================\n");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
