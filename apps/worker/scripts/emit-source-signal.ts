import { ethers } from "ethers";
import { required } from "./env.js";

const abi = ["function emitSignal(bytes32 asset, int256 price, uint256 liquidity) returns (uint256)"];

async function main() {
  const provider = new ethers.JsonRpcProvider(required("SOURCE_RPC_URL"));
  const wallet = new ethers.Wallet(required("RELAYER_PRIVATE_KEY"), provider);
  const contract = new ethers.Contract(required("SOURCE_CONTRACT_ADDRESS"), abi, wallet);
  const transaction = await contract.emitSignal(ethers.id("ETH"), 100n, 250000n);
  const receipt = await transaction.wait();
  if (!receipt || receipt.status !== 1) throw new Error("Source transaction failed");
  console.log(`SOURCE_CHAIN_TXN_HASH=${receipt.hash}`);
  console.log(`SOURCE_CHAIN_BLOCK_HEIGHT=${receipt.blockNumber}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Source transaction failed"); process.exitCode = 1; });
