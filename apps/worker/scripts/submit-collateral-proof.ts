import { chainInfo, proofProvider } from "@gluwa/usc-sdk";
import { ethers } from "ethers";
import { proofBuilderUrl, required } from "./env.js";
import { createProvider } from "./provider.js";

const authorityAbi = ["function verifyCollateralFact(uint64 chainKey,uint64 blockHeight,bytes encodedTransaction,(bytes32 root,(bytes32 hash,bool isLeft)[] siblings) merkleProof,(bytes32 lowerEndpointDigest,bytes32[] roots) continuityProof,uint8 factType,address owner,address asset,uint256 amount,uint256 nonce)"];
const vaultInterface = new ethers.Interface([
  "event CollateralDeposited(address indexed owner,address indexed asset,uint256 indexed nonce,uint256 amount)",
  "event CollateralWithdrawn(address indexed owner,address indexed asset,uint256 indexed nonce,uint256 amount)",
]);

async function main() {
  const chainKey = Number(required("SOURCE_CHAIN_KEY"));
  const sourceHash = required("COLLATERAL_SOURCE_TX_HASH");
  const vaultAddress = ethers.getAddress(required("COLLATERAL_VAULT_ADDRESS"));
  const sourceProvider = createProvider(required("SOURCE_RPC_URL"));
  const sourceTransaction = await sourceProvider.getTransaction(sourceHash);
  const sourceReceipt = await sourceProvider.getTransactionReceipt(sourceHash);
  if (!sourceTransaction?.blockNumber || !sourceReceipt || sourceReceipt.status !== 1) throw new Error("Source collateral transaction is not successfully mined");
  if (!sourceTransaction.to || ethers.getAddress(sourceTransaction.to) !== vaultAddress) throw new Error("Source transaction does not target the configured collateral vault");
  const parsedLogs = sourceReceipt.logs
    .filter((log) => ethers.getAddress(log.address) === vaultAddress)
    .map((log) => { try { return vaultInterface.parseLog(log); } catch { return null; } })
    .filter((log) => log !== null);
  if (parsedLogs.length !== 1) throw new Error("Expected exactly one collateral lifecycle event");
  const sourceEvent = parsedLogs[0];
  const factType = sourceEvent.name === "CollateralDeposited" ? 0 : 1;
  const owner = ethers.getAddress(sourceEvent.args.owner);
  const asset = ethers.getAddress(sourceEvent.args.asset);
  const amount = sourceEvent.args.amount as bigint;
  const nonce = sourceEvent.args.nonce as bigint;

  const creditcoinProvider = createProvider(required("CREDITCOIN_RPC_URL"));
  await new chainInfo.PrecompileChainInfoProvider(creditcoinProvider as any).waitUntilHeightAttested(chainKey, sourceTransaction.blockNumber);
  const result = await new proofProvider.service.ProofBuilder(chainKey, proofBuilderUrl()).getProof(sourceHash);
  if (!result.success || !result.data) throw new Error(`Proof generation failed: ${result.error}`);
  const proof = result.data;
  const wallet = new ethers.Wallet(required("RELAYER_PRIVATE_KEY"), creditcoinProvider);
  const authority = new ethers.Contract(required("COLLATERAL_AUTHORITY_ADDRESS"), authorityAbi, wallet);
  const response = await authority.verifyCollateralFact(proof.chainKey, proof.headerNumber, proof.txBytes, proof.merkleProof, proof.continuityProof, factType, owner, asset, amount, nonce);
  const receipt = await response.wait();
  if (!receipt || receipt.status !== 1) throw new Error("Creditcoin collateral verification failed");
  console.log(`COLLATERAL_VERIFICATION_TX_HASH=${receipt.hash}`);
  console.log(`COLLATERAL_FACT_TYPE=${sourceEvent.name}`);
  console.log(`VERIFIED_OWNER=${owner}`);
  console.log(`VERIFIED_ASSET=${asset}`);
  console.log(`VERIFIED_AMOUNT_WEI=${amount}`);
  console.log(`VERIFIED_NONCE=${nonce}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Collateral proof submission failed"); process.exitCode = 1; });
