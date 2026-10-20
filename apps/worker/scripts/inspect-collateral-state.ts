import { ethers } from "ethers";
import { required } from "./env.js";
import { createProvider } from "./provider.js";

const vaultAbi = ["function collateral(address owner) view returns (uint256)", "function nextNonce(address owner) view returns (uint256)"];
const authorityAbi = ["function verifiedCollateral(address owner) view returns (uint256)", "function authorityBudget(address owner) view returns (uint256)", "function maxProposalAllocation(address owner) view returns (uint256)"];

async function main() {
  const owner = ethers.getAddress(required("VERIFIED_OWNER"));
  const sourceProvider = createProvider(required("SOURCE_RPC_URL"));
  const creditcoinProvider = createProvider(required("CREDITCOIN_RPC_URL"));
  try {
    const vault = new ethers.Contract(required("COLLATERAL_VAULT_ADDRESS"), vaultAbi, sourceProvider);
    const authority = new ethers.Contract(required("COLLATERAL_AUTHORITY_ADDRESS"), authorityAbi, creditcoinProvider);
    const [vaultCollateral, nextNonce, verifiedCollateral, authorityBudget, maxProposalAllocation] = await Promise.all([
      vault.collateral(owner), vault.nextNonce(owner), authority.verifiedCollateral(owner), authority.authorityBudget(owner), authority.maxProposalAllocation(owner),
    ]);
    console.log(`OWNER=${owner}`);
    console.log(`SEPOLIA_VAULT_COLLATERAL_WEI=${vaultCollateral}`);
    console.log(`SEPOLIA_NEXT_NONCE=${nextNonce}`);
    console.log(`CC3_VERIFIED_COLLATERAL_WEI=${verifiedCollateral}`);
    console.log(`CC3_AUTHORITY_BUDGET_WEI=${authorityBudget}`);
    console.log(`CC3_MAX_PROPOSAL_WEI=${maxProposalAllocation}`);
  } finally {
    if ("destroy" in sourceProvider && typeof sourceProvider.destroy === "function") sourceProvider.destroy();
    if ("destroy" in creditcoinProvider && typeof creditcoinProvider.destroy === "function") creditcoinProvider.destroy();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Collateral state inspection failed"); process.exitCode = 1; });
