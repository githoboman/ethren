import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  if (!signers || signers.length === 0) {
    console.error("❌ No signer found. Please set RELAYER_PRIVATE_KEY in your .env file.");
    process.exit(1);
  }
  const signer = signers[0];
  const network = await ethers.provider.getNetwork();
  const address = await signer.getAddress();
  const balance = await ethers.provider.getBalance(address);
  const isMainnet = Number(network.chainId) === 677;
  const explorer = isMainnet ? "https://scan.botchain.ai" : "https://scan.bohr.life";

  console.log("====================================================");
  console.log(`🔍 BOT Chain Wallet Status`);
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Wallet Address: ${address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} BOT`);
  console.log(`Explorer: ${explorer}/address/${address}`);
  if (isMainnet) {
    console.log(`DEX / Swap: https://dex.botchain.ai/#/swap`);
  } else {
    console.log(`Faucet: https://faucet.botchain.ai/basic`);
  }
  console.log("====================================================");

  if (balance === 0n) {
    console.log("\n⚠️  Wallet has 0 BOT.");
    if (isMainnet) {
      console.log("   Please acquire BOT on BOT Chain Mainnet before deploying.");
      console.log("   DEX: https://dex.botchain.ai/#/swap");
    } else {
      console.log("   Claim testnet tokens at: https://faucet.botchain.ai/basic");
    }
  } else {
    console.log("\n✅ Wallet is funded! Ready for deployment.");
  }
}

main().catch((err) => {
  console.error("Check failed:", err);
  process.exit(1);
});
