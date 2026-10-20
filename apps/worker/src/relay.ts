export type ProofStatus = "Waiting" | "Attesting" | "Verified" | "Guardrail Check" | "AI Decision" | "Recorded Onchain";
export type ProofTrace = { status: ProofStatus; sourceTxHash: string; sourceBlock: string; proofDigest?: string; creditcoinTxHash?: string; demo: boolean };

export interface ProofProvider { getProof(sourceTxHash: string): Promise<{ proofDigest: string; encodedTransaction: string }> }

export class DemoProofProvider implements ProofProvider {
  async getProof(sourceTxHash: string) { return { proofDigest: `demo-proof-${sourceTxHash.slice(2, 10)}`, encodedTransaction: "0x" }; }
}

export async function buildDemoTrace(sourceTxHash: string, sourceBlock = "demo-block"): Promise<ProofTrace> {
  const proof = await new DemoProofProvider().getProof(sourceTxHash);
  return { status: "Verified", sourceTxHash, sourceBlock, proofDigest: proof.proofDigest, demo: true };
}
