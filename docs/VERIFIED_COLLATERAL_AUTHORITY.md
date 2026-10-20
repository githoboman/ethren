# Verified Collateral and Adaptive AI Authority

## Product thesis

AttestAI is trust infrastructure for autonomous financial agents:

```text
Ethereum collateral fact
  -> Attestcoin / USC verification
  -> semantic validation
  -> deterministic permission and risk budget
  -> adaptive market-regime reasoning
  -> bounded action proposal
  -> Creditcoin audit record
```

Rules protect capital. AI adapts strategy inside verified authority. The design does not claim that AI beats deterministic rules or guarantees returns.

## Source facts

`AttestAICollateralVault` accepts native Sepolia ETH for test collateral. Every deposit or withdrawal increments an owner-specific nonce and emits an event binding:

- owner;
- native asset identifier;
- amount;
- nonce;
- emitting vault address through the receipt log.

The destination accepts a fact only if the USC-verifiable transaction and receipt agree with the expected chain key, configured vault, transaction sender, function selector, transaction value or withdrawal calldata, event signature, emitter, indexed owner, indexed asset, indexed nonce, amount, and successful receipt status.

## Accounting and replay safety

`AttestAICollateralAuthority` reconstructs collateral from accepted deposit and withdrawal facts. It rejects withdrawals above the current verified balance. It rejects duplicate canonical queries and duplicate owner nonces. State changes occur only after the native USC verifier returns success.

This accounting describes collateral held by the configured test vault. It does not establish the current generic ETH balance of a wallet.

The current prototype reflects the latest lifecycle facts proven to CC3, not instantaneous Sepolia state. A withdrawal can temporarily leave destination authority stale until its event is attested and relayed. Real capital execution must remain disabled until a production design adds enforced proof freshness, permissionless monitoring, and withdrawal finalization that cannot outrun destination authority reduction.

## Authority policy

The policy is fixed at deployment and auditable:

```text
authority budget = min(verified collateral × collateral budget percentage, absolute budget cap)
maximum proposal allocation = min(authority budget, per-trade cap)
```

When a proven withdrawal reduces collateral, both values are recomputed from the lower balance. The prototype does not reserve or execute funds; it validates and records bounded proposals only.

## Adaptive proposal schema

Every proposal contains:

- regime: `TREND`, `RANGE`, `HIGH_VOLATILITY`, or `RISK_OFF`;
- action: `BUY`, `SELL`, `HOLD`, or `REFER`;
- confidence from 0 to 100;
- requested allocation;
- one to three concise reasons;
- model and market-data provenance.

Local deterministic market fixtures are labeled `LOCAL_FIXTURE` and are never described as onchain verified. Missing, malformed, or unreliable AI output becomes `REFER` with zero allocation.

## Live testnet runbook

The runbook uses the existing project configuration and never prints secret material.

1. Deploy `AttestAICollateralVault` to Ethereum Sepolia.
2. Deploy `AttestAICollateralAuthority` to Creditcoin CC3 with chain key `1` and explicit policy caps.
3. Submit a small testnet-only vault deposit.
4. Set the public source transaction hash and run `submit-collateral-proof`.
5. Confirm `CollateralFactVerified` on the CC3 receipt and read the resulting budget.
6. Optionally submit a smaller withdrawal, prove it, and confirm the budget decreases.

Public addresses and transaction hashes must be documented only after receipts are confirmed. If any step fails, the strongest truthful state is local validation with no onchain collateral claim.

## Current safe status

- Existing market-signal USC path: onchain verified on CC3 with public evidence in the README.
- Collateral vault and authority contracts: implemented, locally tested, and deployed to Sepolia and CC3.
- Real source collateral event: 0.001 Sepolia ETH deposit confirmed at `0x38eef42991aaf1adcdf3054572d0fbee4413c3c80e7a32a9810f3dc6afdb23cc`.
- Deposit USC proof: accepted on CC3 at `0xe32aec9434215fe0130effaa622d9cf0c9470ea0a4f2021a46adb7193f00308a`.
- Verified authority after deposit: 0.001 ETH collateral and 0.0002 ETH maximum proposal allocation.
- Safe fallback record: `RISK_OFF` posture, `REFER`, confidence 0, allocation 0, market data unavailable, recorded at `0xb6d9dfe4b14694afdb33b2e461ce8f42d6623224c4d9aacef72668644fd82915`.
- Withdrawal event: 0.0005 Sepolia ETH confirmed at `0x7ffaee6bcb1513b9a8e7118992b780b2238705578e203ce1d35d796ad55fb4c7`.
- Withdrawal USC proof: accepted on CC3 at `0x1a5b9f78c1b407a796e0d8e8d76f33629f4d965716ebe396c85adca17e28fc84`.
- Verified authority after withdrawal: 0.0005 ETH collateral and 0.0001 ETH maximum proposal allocation.
- Adaptive proposal schema and deterministic authority evaluation: implemented and locally tested.
- Collateral USC live E2E: deposit proof, bounded proposal record, withdrawal proof, and authority reduction succeeded.
- Real-money execution: disabled.
