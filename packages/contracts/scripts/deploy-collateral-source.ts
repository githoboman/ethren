import { ethers } from "hardhat";

async function main() {
  const factory = await ethers.getContractFactory("AttestAICollateralVault");
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  console.log(`COLLATERAL_VAULT_ADDRESS=${await contract.getAddress()}`);
  console.log(`COLLATERAL_VAULT_DEPLOYMENT_TX_HASH=${contract.deploymentTransaction()?.hash ?? "unavailable"}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Collateral vault deployment failed"); process.exitCode = 1; });
