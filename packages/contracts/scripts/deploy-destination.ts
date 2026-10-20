import { ethers } from "hardhat";

async function main() {
  const chainKey = Number(process.env.SOURCE_CHAIN_KEY);
  const sourceContract = process.env.SOURCE_CONTRACT_ADDRESS;
  const [signer] = await ethers.getSigners();
  if (!Number.isInteger(chainKey) || chainKey <= 0) throw new Error("SOURCE_CHAIN_KEY must be a positive integer");
  if (!sourceContract || !ethers.isAddress(sourceContract)) throw new Error("SOURCE_CONTRACT_ADDRESS must be a valid address");
  const factory = await ethers.getContractFactory("AttestAIDecision");
  const contract = await factory.deploy(chainKey, sourceContract, await signer.getAddress());
  await contract.waitForDeployment();
  console.log(`DECISION_CONTRACT_ADDRESS=${await contract.getAddress()}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Destination deployment failed"); process.exitCode = 1; });
