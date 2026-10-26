// Quick script to check deployer balance on BOT Chain Mainnet
const RPC_URL = "https://rpc.botchain.ai";
const EXPLORER_URL = "https://scan.botchain.ai";
const DEX_URL = "https://dex.botchain.ai/#/swap";

// Default deployer address from .env or fallback
const ADDRESS = process.argv[2] || "0x90753f69645eC1B6985EEE786721a5D10E0F5aC2";

async function main() {
  console.log("====================================================");
  console.log("🔍 Checking BOT Chain Mainnet Status");
  console.log("====================================================");
  console.log("Network:  BOT Chain Mainnet (Chain ID 677)");
  console.log("RPC:      ", RPC_URL);
  console.log("Explorer: ", `${EXPLORER_URL}/address/${ADDRESS}`);
  console.log("DEX Swap: ", DEX_URL);
  console.log("Address:  ", ADDRESS);
  console.log("----------------------------------------------------");

  try {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [ADDRESS, "latest"],
        id: 1,
      }),
    });

    const data = await res.json();
    const wei = BigInt(data.result || "0x0");
    const bot = Number(wei) / 1e18;

    console.log(`Current Balance: ${bot.toFixed(4)} BOT`);

    if (bot === 0) {
      console.log("\n⚠️  Wallet has 0 BOT on Mainnet.");
      console.log(`   Acquire BOT tokens via: ${DEX_URL}`);
      console.log("   Once funded, run: pnpm deploy:mainnet");
    } else {
      console.log("\n✅ Wallet funded! Ready to deploy to BOT Chain Mainnet.");
      console.log("   Run: pnpm deploy:mainnet");
    }
  } catch (err) {
    console.error("Failed to query BOT Chain Mainnet RPC:", err);
  }
  console.log("====================================================");
}

main().catch(console.error);
