// Quick script to check deployer balance and deploy to BOT Chain Testnet
const RPC_URL = "https://rpc.bohr.life";
const ADDRESS = "0x90753f69645eC1B6985EEE786721a5D10E0F5aC2";

async function main() {
  console.log("Checking BOT Chain Testnet balance for:", ADDRESS);
  console.log("RPC:", RPC_URL);
  console.log("Explorer:", `https://scan.bohr.life/address/${ADDRESS}`);
  console.log("Claim testnet tokens here:", "https://faucet.botchain.ai/basic\n");

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

  console.log(`Current Balance: ${bot} BOT`);

  if (bot === 0) {
    console.log("\n⚠️  Wallet has 0 BOT. Please claim testnet tokens at: https://faucet.botchain.ai/basic");
    console.log("   Once tokens arrive, run: pnpm deploy:testnet");
  } else {
    console.log("\n✅ Wallet funded! Ready to deploy.");
  }
}

main().catch(console.error);
