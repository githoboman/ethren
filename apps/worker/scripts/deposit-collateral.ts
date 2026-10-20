import { ethers } from "ethers";
import { required } from "./env.js";
import { createProvider } from "./provider.js";

const abi = ["function deposit() payable returns (uint256)"];

async function main() {
  const provider = createProvider(required("SOURCE_RPC_URL"));
  const wallet = new ethers.Wallet(required("RELAYER_PRIVATE_KEY"), provider);
  const amount = ethers.parseEther(required("COLLATERAL_DEPOSIT_ETH"));
  if (amount <= 0) throw new Error("COLLATERAL_DEPOSIT_ETH must be positive");
  const contract = new ethers.Contract(required("COLLATERAL_VAULT_ADDRESS"), abi, wallet);
  const response = await contract.deposit({ value: amount });
  const receipt = await response.wait();
  if (!receipt || receipt.status !== 1) throw new Error("Sepolia collateral deposit failed");
  console.log(`COLLATERAL_SOURCE_TX_HASH=${receipt.hash}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Collateral deposit failed"); process.exitCode = 1; });
