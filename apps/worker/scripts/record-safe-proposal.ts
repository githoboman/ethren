import { ethers } from "ethers";
import { evaluateProposal, parseAdaptiveProposal } from "../src/authority.js";
import { required } from "./env.js";
import { createProvider } from "./provider.js";

const abi = [
  "function verifiedCollateral(address owner) view returns (uint256)",
  "function recordAgentProposal(address owner,uint8 regime,uint8 action,uint8 confidence,uint256 requestedAllocation,bytes32 reasonsHash,bytes32 provenanceHash)",
];

async function main() {
  const provider = createProvider(required("CREDITCOIN_RPC_URL"));
  const wallet = new ethers.Wallet(required("RELAYER_PRIVATE_KEY"), provider);
  try {
    const owner = wallet.address;
    const contract = new ethers.Contract(required("COLLATERAL_AUTHORITY_ADDRESS"), abi, wallet);
    const verifiedCollateral = await contract.verifiedCollateral(owner) as bigint;
    const proposal = parseAdaptiveProposal(undefined);
    const policy = {
      collateralAllocationBps: Number(process.env.COLLATERAL_BUDGET_BPS ?? 2000),
      perTradeCap: Number(ethers.parseEther(process.env.PER_TRADE_CAP_ETH ?? "0.01")),
      absoluteBudgetCap: Number(ethers.parseEther(process.env.ABSOLUTE_BUDGET_CAP_ETH ?? "0.05")),
    };
    const result = evaluateProposal(proposal, { amount: Number(verifiedCollateral), verificationState: "ONCHAIN_VERIFIED" }, policy);
    if (!result.accepted || proposal.action !== "REFER" || proposal.requestedAllocation !== 0) throw new Error("Safe fallback proposal did not pass deterministic guardrails");
    const reasonsHash = ethers.id(JSON.stringify(proposal.reasons));
    const provenanceHash = ethers.id(JSON.stringify(proposal.provenance));
    const response = await contract.recordAgentProposal(owner, 3, 3, proposal.confidence, 0, reasonsHash, provenanceHash);
    const receipt = await response.wait();
    if (!receipt || receipt.status !== 1) throw new Error("CC3 safe proposal record failed");
    console.log(`AGENT_PROPOSAL_TX_HASH=${receipt.hash}`);
    console.log("REGIME=RISK_OFF_SAFE_FALLBACK");
    console.log("ACTION=REFER");
    console.log("CONFIDENCE=0");
    console.log("REQUESTED_ALLOCATION_WEI=0");
    console.log("MARKET_DATA_STATE=UNAVAILABLE");
    console.log("REAL_MONEY_EXECUTION=DISABLED");
  } finally {
    if ("destroy" in provider && typeof provider.destroy === "function") provider.destroy();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Safe proposal recording failed"); process.exitCode = 1; });
