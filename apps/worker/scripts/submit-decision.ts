import { ethers } from "ethers";
import { proofBuilderUrl, required } from "./env.js";
import { chainInfo, proofProvider } from "@gluwa/usc-sdk";
import { createProvider } from "./provider.js";

const abi = ["function verifyAndRecord(uint64 chainKey,uint64 blockHeight,bytes encodedTransaction,(bytes32 root,(bytes32 hash,bool isLeft)[] siblings) merkleProof,(bytes32 lowerEndpointDigest,bytes32[] roots) continuityProof,bytes32 sourceTxHash,uint8 action,uint8 confidence,uint8 riskScore)"];

async function main() {
  const chainKey = Number(required("SOURCE_CHAIN_KEY"));
  const sourceHash = required("SOURCE_CHAIN_TXN_HASH");
  const creditcoinProvider = createProvider(required("CREDITCOIN_RPC_URL"));
  const sourceProvider = createProvider(required("SOURCE_RPC_URL"));
  const transaction = await sourceProvider.getTransaction(sourceHash);
  if (!transaction?.blockNumber) throw new Error("Source transaction is not mined");
  await new chainInfo.PrecompileChainInfoProvider(creditcoinProvider as any).waitUntilHeightAttested(chainKey, transaction.blockNumber);
  const result = await new proofProvider.service.ProofBuilder(chainKey, proofBuilderUrl()).getProof(sourceHash);
  if (!result.success || !result.data) throw new Error(`Proof generation failed: ${result.error}`);
  const proof = result.data;
  const wallet = new ethers.Wallet(required("RELAYER_PRIVATE_KEY"), creditcoinProvider);
  const contract = new ethers.Contract(required("DECISION_CONTRACT_ADDRESS"), abi, wallet);
  const transactionIndex = proof.merkleProof.siblings.reduce((value: bigint, sibling: { isLeft: boolean }, index: number) => sibling.isLeft ? value : value | (1n << BigInt(index)), 0n);
  const response = await contract.verifyAndRecord(proof.chainKey, proof.headerNumber, proof.txBytes, proof.merkleProof, proof.continuityProof, sourceHash, 1, 78, 10);
  const receipt = await response.wait();
  if (!receipt || receipt.status !== 1) throw new Error("Creditcoin decision transaction failed");
  console.log(`CREDITCOIN_DECISION_TX_HASH=${receipt.hash}`);
  console.log(`PROOF_TRANSACTION_INDEX=${transactionIndex}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Decision submission failed"); process.exitCode = 1; });
