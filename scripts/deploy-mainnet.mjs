import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const solc = require("c:/Users/OWNER/Desktop/welter/node_modules/solc");
const { ethers } = require("c:/Users/OWNER/Desktop/welter/node_modules/ethers");

// Load .env
const envPath = path.resolve(".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
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

const RPC_URL = process.env.BOTCHAIN_MAINNET_RPC_URL || "https://rpc.botchain.ai";
const EXPLORER_URL = process.env.BOTCHAIN_MAINNET_EXPLORER || "https://scan.botchain.ai";
const CHAIN_ID = Number(process.env.BOTCHAIN_MAINNET_CHAIN_ID || 677);
const PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error("❌ Error: RELAYER_PRIVATE_KEY is not set in .env");
  process.exit(1);
}

function compileSolidity(sourcePath, contractName) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const fileName = path.basename(sourcePath);

  const input = {
    language: "Solidity",
    sources: {
      [fileName]: { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const fatal = output.errors.filter((e) => e.severity === "error");
    if (fatal.length > 0) {
      console.error("Compilation errors:", fatal);
      throw new Error(`Failed to compile ${fileName}`);
    }
  }

  const contract = output.contracts[fileName][contractName];
  return {
    abi: contract.abi,
    bytecode: "0x" + contract.evm.bytecode.object,
  };
}

async function main() {
  console.log("====================================================");
  console.log("🚀 Deploying AttestAI Contracts to BOT Chain Mainnet");
  console.log("====================================================");
  console.log(`Network: BOT Chain Mainnet (Chain ID: ${CHAIN_ID})`);
  console.log(`RPC:     ${RPC_URL}`);

  const network = ethers.Network.from({
    name: "botchain_mainnet",
    chainId: CHAIN_ID,
  });

  const provider = new ethers.JsonRpcProvider(RPC_URL, network, {
    staticNetwork: network,
  });

  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer: ${wallet.address}`);
  console.log(`Available Balance: ${ethers.formatEther(balance)} BOT\n`);

  if (balance === 0n) {
    console.error("❌ Deployer wallet has 0 BOT on Mainnet!");
    console.error("   Please acquire BOT on BOT Chain Mainnet via DEX: https://dex.botchain.ai/#/swap");
    process.exit(1);
  }

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits("20", "gwei");
  console.log(`Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} Gwei\n`);

  // 1. Compile and Deploy AttestAICollateralVault
  console.log("1. Compiling & Deploying AttestAICollateralVault...");
  const vaultPath = path.resolve("packages/contracts/contracts/AttestAICollateralVault.sol");
  const vaultCompiled = compileSolidity(vaultPath, "AttestAICollateralVault");
  const VaultFactory = new ethers.ContractFactory(vaultCompiled.abi, vaultCompiled.bytecode, wallet);
  const vault = await VaultFactory.deploy({ gasPrice });
  console.log(`   Broadcasted Tx: ${vault.deploymentTransaction().hash}`);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(`   ✅ AttestAICollateralVault deployed at: ${vaultAddress}`);
  console.log(`   🔗 Explorer: ${EXPLORER_URL}/address/${vaultAddress}\n`);

  // 2. Compile and Deploy AttestAIBotChainRegistry
  console.log("2. Compiling & Deploying AttestAIBotChainRegistry...");
  const registryPath = path.resolve("packages/contracts/contracts/AttestAIBotChainRegistry.sol");
  const registryCompiled = compileSolidity(registryPath, "AttestAIBotChainRegistry");
  const RegistryFactory = new ethers.ContractFactory(registryCompiled.abi, registryCompiled.bytecode, wallet);
  const registry = await RegistryFactory.deploy({ gasPrice });
  console.log(`   Broadcasted Tx: ${registry.deploymentTransaction().hash}`);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`   ✅ AttestAIBotChainRegistry deployed at: ${registryAddress}`);
  console.log(`   🔗 Explorer: ${EXPLORER_URL}/address/${registryAddress}\n`);

  // 3. Compile and Deploy SignalEmitter
  console.log("3. Compiling & Deploying SignalEmitter...");
  const emitterPath = path.resolve("packages/contracts/contracts/SignalEmitter.sol");
  const emitterCompiled = compileSolidity(emitterPath, "SignalEmitter");
  const EmitterFactory = new ethers.ContractFactory(emitterCompiled.abi, emitterCompiled.bytecode, wallet);
  const emitter = await EmitterFactory.deploy({ gasPrice });
  console.log(`   Broadcasted Tx: ${emitter.deploymentTransaction().hash}`);
  await emitter.waitForDeployment();
  const emitterAddress = await emitter.getAddress();
  console.log(`   ✅ SignalEmitter deployed at: ${emitterAddress}`);
  console.log(`   🔗 Explorer: ${EXPLORER_URL}/address/${emitterAddress}\n`);

  const finalBalance = await provider.getBalance(wallet.address);
  console.log("====================================================");
  console.log("🎉 ALL CONTRACTS DEPLOYED SUCCESSFULLY ON BOT CHAIN MAINNET!");
  console.log("====================================================");
  console.log(`Collateral Vault:  ${vaultAddress}`);
  console.log(`Decision Registry: ${registryAddress}`);
  console.log(`Signal Emitter:    ${emitterAddress}`);
  console.log(`Remaining Balance: ${ethers.formatEther(finalBalance)} BOT`);
  console.log("====================================================");

  // Output deployment results to JSON
  const deployedInfo = {
    network: "BOT Chain Mainnet",
    chainId: CHAIN_ID,
    collateralVault: vaultAddress,
    decisionRegistry: registryAddress,
    signalEmitter: emitterAddress,
    deployer: wallet.address,
    vaultTx: vault.deploymentTransaction().hash,
    registryTx: registry.deploymentTransaction().hash,
    emitterTx: emitter.deploymentTransaction().hash,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync("deployed-botchain-mainnet.json", JSON.stringify(deployedInfo, null, 2));
  console.log("💾 Saved deployed contract addresses to deployed-botchain-mainnet.json");

  console.log("\n================ Env Configuration ================");
  console.log(`BOTCHAIN_MAINNET_COLLATERAL_VAULT=${vaultAddress}`);
  console.log(`BOTCHAIN_MAINNET_DECISION_REGISTRY=${registryAddress}`);
  console.log(`BOTCHAIN_MAINNET_SIGNAL_EMITTER=${emitterAddress}`);
  console.log("====================================================");
}

main().catch((err) => {
  console.error("Mainnet deployment failed:", err);
  process.exit(1);
});
