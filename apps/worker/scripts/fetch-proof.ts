import { chainInfo, proofProvider } from "@gluwa/usc-sdk";
import { ethers } from "ethers";
import { proofBuilderUrl, required } from "./env.js";
import { createProvider } from "./provider.js";

async function main() {
  const chainKey = Number(required("SOURCE_CHAIN_KEY"));
  const transactionHash = required("SOURCE_CHAIN_TXN_HASH");
  const sourceProvider = createProvider(required("SOURCE_RPC_URL"));
  const transaction = await sourceProvider.getTransaction(transactionHash);
  if (!transaction?.blockNumber) throw new Error("Source transaction is not mined");
  const creditcoinProvider = createProvider(required("CREDITCOIN_RPC_URL"));
  const chainInfoProvider = new chainInfo.PrecompileChainInfoProvider(creditcoinProvider as any);
  await chainInfoProvider.waitUntilHeightAttested(chainKey, transaction.blockNumber);
  const builder = new proofProvider.service.ProofBuilder(chainKey, proofBuilderUrl());
  const result = await builder.getProof(transactionHash);
  if (!result.success || !result.data) throw new Error(`Proof generation failed: ${result.error}`);
  const proof = result.data;
  console.log(JSON.stringify({ chainKey: proof.chainKey, headerNumber: proof.headerNumber, txBytes: proof.txBytes, merkleProof: proof.merkleProof, continuityProof: proof.continuityProof }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Proof retrieval failed"); process.exitCode = 1; });
