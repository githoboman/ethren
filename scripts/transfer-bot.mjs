import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { ethers } = require("c:/Users/OWNER/Desktop/welter/node_modules/ethers");

const RPC_URL = "https://rpc.bohr.life";
const PRIVATE_KEY = "0x3bf57d79cc5a68be1673e8e543d4ea85a14d672eaa399a68a2c948814251069e";
const RECIPIENT = "0x29108bAb564B53B19C5dde4D00048DB6C41e057C";
const AMOUNT = "2.0";

async function main() {
  console.log("Connecting to BOT Chain Testnet...");
  const provider = new ethers.JsonRpcProvider(RPC_URL, {
    name: "botchain_testnet",
    chainId: 968,
  });

  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const balanceBefore = await provider.getBalance(wallet.address);
  console.log(`Sender: ${wallet.address}`);
  console.log(`Balance before: ${ethers.formatEther(balanceBefore)} BOT`);
  console.log(`Sending ${AMOUNT} BOT to ${RECIPIENT}...`);

  const tx = await wallet.sendTransaction({
    to: RECIPIENT,
    value: ethers.parseEther(AMOUNT),
  });

  console.log(`Transaction broadcasted! Tx Hash: ${tx.hash}`);
  console.log(`Explorer Link: https://scan.bohr.life/tx/${tx.hash}`);
  console.log("Waiting for confirmation...");

  const receipt = await tx.wait();
  console.log(`✅ Transaction confirmed in block #${receipt.blockNumber}!`);

  const balanceAfter = await provider.getBalance(wallet.address);
  console.log(`Remaining Balance: ${ethers.formatEther(balanceAfter)} BOT`);
}

main().catch((err) => {
  console.error("Transfer failed:", err);
  process.exit(1);
});
