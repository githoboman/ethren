# AttestAI — Verify First. Decide Second.

**Trust Infrastructure for Autonomous AI Agents**  
**Submission edition:** DoraHacks BUIDL CTC 2026 Fall  
**Project:** AttestAI  
**Repository:** https://github.com/noboru59631/attestai

> **Creditcoin verifies the facts. AI interprets the facts.**

## Executive Summary

AttestAI is trust infrastructure for autonomous AI agents. It verifies cross-chain facts through **Creditcoin USC** before those facts reach an AI decision layer. The first demonstration use case is trading intelligence, but the architecture is designed for DeFi, lending, real-world assets, insurance, treasury management, cross-chain risk monitoring, and autonomous financial agents.

AttestAI follows a strict evidence-to-action boundary:

```text
Verify → Guardrail → Reason → Act
```

The completed live flow is:

```text
Ethereum Sepolia
→ Creditcoin USC proof
→ Creditcoin CC3 verification
→ Semantic Validation
→ Deterministic Risk Guardrails
→ AI Decision
→ Onchain Decision Record
```

The live result is **Onchain Verified**. The recorded AI decision is **HOLD**, with confidence **78** and risk score **10**. Real-money execution is disabled in the hackathon demonstration.

## Problem

AI agents can turn plausible but untrusted cross-chain data into confident actions. A source transaction may be included in a chain but still be irrelevant, failed, emitted by the wrong contract, sent by the wrong account, or replayed. Cryptographic proof of inclusion alone does not prove that the payload is the intended fact.

AttestAI makes the trust boundary explicit: Creditcoin USC verifies the cross-chain evidence, semantic validation checks what that evidence means, deterministic guardrails constrain what the AI may do, and the resulting decision is recorded with provenance.

## Design Principles

- Verify before interpretation.
- Treat Creditcoin USC as the core trust layer.
- Separate cryptographic validity from semantic relevance.
- Fail closed when evidence is unsafe or unavailable.
- Keep guardrails deterministic, inspectable, and reproducible.
- Keep simulated, locally validated, and onchain states visibly distinct.
- Never imply an unobserved proof, benchmark, transaction, or integration state.

## Architecture

AttestAI implements the following path:

```text
Source Event
→ USC Proof
→ Creditcoin CC3 Verification
→ Semantic Validation
→ Deterministic Risk Guardrails
→ AI Decision
→ Creditcoin Onchain Record
```

Ethereum Sepolia hosts the source signal contract. The worker transports source transaction data and USC proof material. The Creditcoin destination contract verifies the proof, validates the source payload, applies replay protection, and accepts the signal. Only after those checks do deterministic guardrails and the AI decision adapter run. The dashboard and Proof Inspector expose the provenance state.

## Creditcoin USC Integration

Creditcoin USC is the core trust layer between the source chain and the decision record. The live worker obtains proof material through the USC proof-builder path and submits the encoded source transaction, header number, Merkle proof, and continuity proof to the Creditcoin destination contract. The destination calls the USC verifier synchronously before accepting the signal.

The current CC3 Testnet configuration is:

| Setting | Value |
| --- | --- |
| Creditcoin RPC | [https://rpc.cc3-testnet.creditcoin.network](https://rpc.cc3-testnet.creditcoin.network) |
| Chain ID | `102031` |
| Explorer | [https://creditcoin-testnet.blockscout.com/](https://creditcoin-testnet.blockscout.com/) |
| Proof builder | [https://prover.cc3-testnet.creditcoin.network/](https://prover.cc3-testnet.creditcoin.network/) |
| Sepolia source chain key | `1` |
| USC verifier / precompile | `0x0000000000000000000000000000000000000FD2` |

The USC source chain key `1` is distinct from Ethereum Sepolia's EVM chain ID `11155111`.

## Semantic Validation

Cryptographic verification alone is not enough. AttestAI additionally performs semantic validation to establish that the verified transaction is the intended signal:

- Source chain
- Source contract
- Sender
- Selector and calldata
- Event signature
- Event emitter
- Topics and payload
- Transaction success status
- Replay protection

These checks are intentionally separate from the AI layer. A proof can be valid while its payload is irrelevant, malformed, failed, emitted by the wrong contract, or already processed. Such input is rejected before it can influence the decision adapter.

## Deterministic Risk Guardrails

After verification and semantic validation, deterministic risk guardrails define the AI boundary. The policy checks the accepted signal, liquidity, price, and price movement against explicit constraints and returns an acceptance flag, risk score, and reasons.

If a guardrail fails, the system fails closed to **HOLD**. The AI is not allowed to reinterpret a blocked input. When the signal is accepted, the AI adapter may produce BUY, HOLD, or SELL with confidence, risk score, concise reasoning, and guardrail results. The application records the decision; it does not execute trades or move real money.

## Proof Inspector and Provenance

The Proof Inspector makes the evidence chain visible to reviewers and users. Its provenance model follows the real sequence:

```text
Source event emitted
→ Attestation available
→ USC proof accepted
→ Guardrail check
→ Decision recorded
```

The dashboard clearly distinguishes three states:

- **Simulated:** deterministic fixture data used by Demo Mode; not cryptographically verified and never presented as onchain verification.
- **Locally Validated:** local semantic checks and guardrails passed, but no Creditcoin receipt proves the flow.
- **Onchain Verified:** a real USC proof was accepted by the destination contract and the Creditcoin receipt and events were checked.

This distinction prevents a convenient demo state from being confused with a receipt-backed live result.

## Completed Live Verification

AttestAI completed a real live end-to-end verification on Creditcoin CC3 Testnet:

| Field | Verified result |
| --- | --- |
| Verification | **Onchain Verified** |
| AI Decision | **HOLD** |
| Confidence | **78** |
| Risk Score | **10** |
| Source Chain | Ethereum Sepolia |
| Destination Chain | Creditcoin CC3 Testnet |

The successful Creditcoin transaction emitted:

- `VerifiedSignalAccepted`
- `DecisionRecorded`

### Public evidence

| Evidence | Address or transaction |
| --- | --- |
| Sepolia source contract | `0x8498F0C06F25e1FAF141Cf5CF7fFf4Fc58c0AbA1` |
| Sepolia source transaction | `0xa4c4659d9f42b2fee82ae8e46411806d511d8d931404a93e326482dc5173c7ca` |
| Creditcoin CC3 destination contract | `0x094423E150207C73c502a6eF4EA967eA9e69a2a0` |
| Creditcoin CC3 deployment transaction | `0x086e01da8b79a5577276df28a04a0b456bc44e28c439cea711a2fbdacffbbff0` |
| Verified decision transaction | `0xe8b2a92dc044bdd6d8a05b25ef731ad7f61ac614d0fcf6944b2a1e1fbcfb7d0f` |

The verified decision transaction is the public receipt for the completed USC path and onchain decision record.

## Implementation and Testing

The monorepo contains a Next.js dashboard, a worker for proof relay and decision logic, and Hardhat contracts. The dashboard exposes the verification state, provenance timeline, guardrails, decision, and receipt. The worker contains the proof-provider boundary, relay trace, risk policy, and decision adapter.

Contract tests cover wrong chain, malformed payload, wrong source contract, failed source transaction, invalid proof, and replay rejection. Worker tests cover blocking unverified data and accepting a verified liquid signal.

## Use Cases Beyond Trading

Trading is the first demonstration because it makes evidence, risk, and action easy to understand. The same Verify → Guardrail → Reason → Act architecture can support:

- DeFi automation and protocol operations
- Lending and collateral risk
- Real-world asset attestations
- Insurance claims and underwriting signals
- Treasury management and payment controls
- Cross-chain risk monitoring
- Autonomous financial agents

The general pattern is stable: prove a cross-chain fact, validate its meaning, apply deterministic policy, and let AI interpret or prioritize the result within that boundary.

## Security Boundary

The worker is not trusted to assert correctness. It may transport malformed or adversarial data, but the destination contract constrains chain identity, transaction status, sender, destination, selector, calldata, event signature, emitter, topics, payload, and replay state. The native verifier constrains cryptographic inclusion and continuity. Deterministic guardrails constrain what reaches the decision adapter.

Real-money execution is disabled in the hackathon demonstration. The live evidence uses public test networks, and no live financial trade is placed.

## Links

- GitHub repository: https://github.com/noboru59631/attestai
- Public demo: https://attestai-web.vercel.app
- Demo video: https://youtu.be/qBVhBAq08Fs
- Creditcoin USC documentation: https://docs.creditcoin.org/usc/dapp-builder-infrastructure/universal-smart-contracts
- Creditcoin USC network manifest: https://github.com/gluwa/creditcoin-usc-networks/blob/master/networks.json

## Conclusion

**AttestAI — Verify First. Decide Second.** It is trust infrastructure for autonomous AI agents: **Creditcoin verifies the facts. AI interprets the facts.** By combining Creditcoin USC, semantic validation, deterministic risk guardrails, and an inspectable Proof Inspector, AttestAI turns a cross-chain fact into a bounded, explainable, receipt-backed decision.
