# AttestAI Architecture

## Preserved market-signal path

```text
Ethereum Sepolia SignalEmitter event
  -> USC proof
  -> Creditcoin CC3 Native Query Verifier (0x0FD2)
  -> semantic validation
  -> deterministic guardrails
  -> AI decision
  -> DecisionRecorded on Creditcoin
```

`AttestAIDecision` retains the submitted behavior and public live evidence. The collateral extension is implemented in separate contracts and worker modules.

## Verified collateral authority path

```text
Ethereum Sepolia AttestAICollateralVault
  -> CollateralDeposited or CollateralWithdrawn event
  -> USC proof of the source transaction and receipt
  -> AttestAICollateralAuthority on Creditcoin CC3
  -> exact chain, vault, sender, calldata, value, event, payload, and receipt checks
  -> reconstructed verified vault collateral
  -> percentage budget bounded by per-trade and absolute caps
  -> adaptive regime proposal
  -> deterministic proposal guardrails
  -> bounded AgentProposalRecorded event
```

The worker is not a trust authority. It transports source transaction and proof material. The destination contract calls the native verifier and independently validates the source semantics before changing collateral.

Replay protection has two layers:

1. A canonical USC query key binds source chain key, block height, and Merkle-derived transaction index.
2. An owner-scoped vault nonce prevents the same lifecycle event from being applied under another query.

Verified collateral is reconstructed from proven lifecycle facts emitted by the configured vault. It is not an arbitrary Ethereum wallet-state proof. Native ETH is represented by the zero address and is accepted only when the transaction call and event agree on owner, asset, amount, and nonce.

Cross-chain attestation is asynchronous. Until a withdrawal fact is proven, CC3 reflects the latest proven state rather than instantaneous Sepolia state. This prototype therefore keeps execution disabled; a production executor would also require proof freshness, permissionless lifecycle monitoring, and withdrawal finalization coordinated with authority reduction.

## Responsibility boundaries

| Layer | Question | Enforcement |
| --- | --- | --- |
| Verification | What is true? | USC proof plus strict source-event semantics |
| Guardrails and authority | What is allowed? | Verified balance percentage, per-trade cap, absolute cap |
| Adaptive AI | What should we do within the limits? | Strict proposal schema with regime, confidence, reasons, and provenance |

AI output is untrusted input. Missing or malformed model output becomes `REFER` with zero allocation. Missing or non-onchain collateral produces zero authority. A confidence score or action label cannot bypass allocation checks.

Real-money execution is disabled. The system records bounded proposals on testnet; it does not place trades or promise returns.
