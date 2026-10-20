import { lookup } from "node:dns/promises";

const endpoints = [
  { name: "RPC", url: "https://rpc.cc3-testnet.creditcoin.network", protocol: "http" },
  { name: "Proof Builder", url: "https://proof-gen-api.cc3-testnet.creditcoin.network/api/v1/health", protocol: "http" },
  { name: "Explorer", url: "https://creditcoin-testnet.blockscout.com", protocol: "http" }
] as const;

async function checkEndpoint(endpoint: (typeof endpoints)[number]) {
  const parsed = new URL(endpoint.url);
  try {
    const address = await lookup(parsed.hostname);
    const response = await fetch(endpoint.url, { method: "GET", signal: AbortSignal.timeout(8000) });
    return `${endpoint.name}: DNS PASS (${address.address}), HTTP ${response.status}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "endpoint check failed";
    return `${endpoint.name}: FAIL (${message})`;
  }
}

const results = await Promise.all(endpoints.map(checkEndpoint));
console.log(results.join("\n"));
if (results.some((result) => result.includes(": FAIL"))) process.exitCode = 1;
