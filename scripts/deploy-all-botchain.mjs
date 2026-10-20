import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const solc = require("c:/Users/OWNER/Desktop/welter/node_modules/solc");
const { ethers } = require("c:/Users/OWNER/Desktop/welter/node_modules/ethers");

const RPC_URL = "https://rpc.bohr.life";
const PRIVATE_KEY = "0x3bf57d79cc5a68be1673e8e543d4ea85a14d672eaa399a68a2c948814251069e";
const CHAIN_ID = 968;

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
  console.log("🚀 Deploying AttestAI Contracts to BOT Chain Testnet");
  console.log("====================================================");

  const provider = new ethers.JsonRpcProvider(RPC_URL, {
    name: "botchain_testnet",
    chainId: CHAIN_ID,
  });

  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer: ${wallet.address}`);
  console.log(`Available Balance: ${ethers.formatEther(balance)} BOT\n`);

  // 1. Compile and Deploy AttestAICollateralVault
  console.log("1. Compiling & Deploying AttestAICollateralVault...");
  const vaultPath = path.resolve("packages/contracts/contracts/AttestAICollateralVault.sol");
  const vaultCompiled = compileSolidity(vaultPath, "AttestAICollateralVault");
  const VaultFactory = new ethers.ContractFactory(vaultCompiled.abi, vaultCompiled.bytecode, wallet);
  const vault = await VaultFactory.deploy();
  console.log(`   Broadcasted Tx: ${vault.deploymentTransaction().hash}`);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(`   ✅ AttestAICollateralVault deployed at: ${vaultAddress}`);
  console.log(`   🔗 Explorer: https://scan.bohr.life/address/${vaultAddress}\n`);

  // 2. Compile and Deploy AttestAIBotChainRegistry
  console.log("2. Compiling & Deploying AttestAIBotChainRegistry...");
  const registryPath = path.resolve("packages/contracts/contracts/AttestAIBotChainRegistry.sol");
  const registryCompiled = compileSolidity(registryPath, "AttestAIBotChainRegistry");
  const RegistryFactory = new ethers.ContractFactory(registryCompiled.abi, registryCompiled.bytecode, wallet);
  const registry = await RegistryFactory.deploy();
  console.log(`   Broadcasted Tx: ${registry.deploymentTransaction().hash}`);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`   ✅ AttestAIBotChainRegistry deployed at: ${registryAddress}`);
  console.log(`   🔗 Explorer: https://scan.bohr.life/address/${registryAddress}\n`);

  // 3. Compile and Deploy SignalEmitter
  console.log("3. Compiling & Deploying SignalEmitter...");
  const emitterPath = path.resolve("packages/contracts/contracts/SignalEmitter.sol");
  const emitterCompiled = compileSolidity(emitterPath, "SignalEmitter");
  const EmitterFactory = new ethers.ContractFactory(emitterCompiled.abi, emitterCompiled.bytecode, wallet);
  const emitter = await EmitterFactory.deploy();
  console.log(`   Broadcasted Tx: ${emitter.deploymentTransaction().hash}`);
  await emitter.waitForDeployment();
  const emitterAddress = await emitter.getAddress();
  console.log(`   ✅ SignalEmitter deployed at: ${emitterAddress}`);
  console.log(`   🔗 Explorer: https://scan.bohr.life/address/${emitterAddress}\n`);

  const finalBalance = await provider.getBalance(wallet.address);
  console.log("====================================================");
  console.log("🎉 ALL CONTRACTS DEPLOYED SUCCESSFULLY ON BOT CHAIN!");
  console.log("====================================================");
  console.log(`Collateral Vault: ${vaultAddress}`);
  console.log(`Decision Registry: ${registryAddress}`);
  console.log(`Signal Emitter:    ${emitterAddress}`);
  console.log(`Remaining Balance: ${ethers.formatEther(finalBalance)} BOT`);
  console.log("====================================================");

  // Output deployment results to JSON for easy consumption
  const deployedInfo = {
    network: "BOT Chain Testnet",
    chainId: CHAIN_ID,
    collateralVault: vaultAddress,
    decisionRegistry: registryAddress,
    signalEmitter: emitterAddress,
    deployer: wallet.address,
    vaultTx: vault.deploymentTransaction().hash,
    registryTx: registry.deploymentTransaction().hash,
    emitterTx: emitter.deploymentTransaction().hash,
  };

  fs.writeFileSync("deployed-botchain.json", JSON.stringify(deployedInfo, null, 2));
  console.log("Saved deployed contract addresses to deployed-botchain.json");
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
