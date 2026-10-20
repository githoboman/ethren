import { ethers } from "hardhat";

async function main() {
  const factory = await ethers.getContractFactory("SignalEmitter");
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  console.log(`SOURCE_CONTRACT_ADDRESS=${await contract.getAddress()}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Source deployment failed"); process.exitCode = 1; });
