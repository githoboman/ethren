# Live E2E Checklist

Run only after funding a fresh test wallet on both networks and configuring `.env`. Do not use a production key.

## 0. Preflight

```sh
pnpm --filter @attestai/worker preflight
```

This must report `PREFLIGHT_OK` before any deployment command is run.

## 1. Install and compile

```sh
pnpm install
pnpm --filter @attestai/contracts build
```

## 2. Deploy the Sepolia source contract

```sh
pnpm --filter @attestai/contracts exec hardhat run packages/contracts/scripts/deploy-source.ts --network sepolia
```

Record the deployed `SignalEmitter` address as `SOURCE_CONTRACT_ADDRESS` and verify it on the Sepolia explorer.

## 3. Deploy the Creditcoin USC destination contract

Use source chain key `1` (Ethereum Sepolia) and the funded relayer address as the expected source sender:

```sh
pnpm --filter @attestai/contracts exec hardhat run packages/contracts/scripts/deploy-destination.ts --network creditcoin_usc_testnet
```

Record the deployed `AttestAIDecision` address as `DECISION_CONTRACT_ADDRESS` and verify it on the Creditcoin explorer.

## 4. Emit one source signal

```sh
pnpm --filter @attestai/worker emit-source
```

Record the Sepolia transaction hash, block number, and transaction index. Confirm the receipt status is `1` and the `MarketSignal` event matches the expected payload.

## 5. Retrieve USC v2 proof

```sh
pnpm --filter @attestai/worker fetch-proof
```

Wait until the source block is attested. Save `chainKey`, `headerNumber`, `txBytes`, `merkleProof.root`, `merkleProof.siblings`, `continuityProof.lowerEndpointDigest`, and `continuityProof.roots`.

## 6. Verify and record the decision

```sh
pnpm --filter @attestai/worker submit-decision
```

The transaction must call `verifyAndRecord`, which invokes the native verifier at `0x0000000000000000000000000000000000000FD2`, validates receipt success and source payload, and emits `VerifiedSignalAccepted` and `DecisionRecorded`.

## 7. Verify explorer evidence

- Open the Sepolia transaction hash on the Sepolia explorer.
- Open the Creditcoin destination transaction hash on `https://creditcoin-testnet.blockscout.com`.
- Confirm the destination receipt status is successful.
- Confirm both destination events contain the expected source transaction hash and proof digest.
- Re-submit the same proof and confirm replay protection rejects it.
