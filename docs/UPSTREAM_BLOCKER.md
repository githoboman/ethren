# CC3 Testnet Migration Validation

## Validation record

- Validation date: 2026-09-12 (Asia/Tokyo)
- Source: [gluwa/creditcoin-usc-networks `networks.json`](https://github.com/gluwa/creditcoin-usc-networks/blob/master/networks.json), default branch
- Network: Creditcoin CC3 Testnet
- Expected EVM chain ID: `102031`
- Sepolia source-chain key: `1` (Sepolia EVM chain ID: `11155111`)

Official values reported by the manifest:

| Service | Official endpoint | Validation result |
| --- | --- | --- |
| RPC | `https://rpc.cc3-testnet.creditcoin.network` | HTTP JSON-RPC reachable; `eth_chainId` = `102031` |
| Proof Builder | `https://proof-gen-api.cc3-testnet.creditcoin.network` | HTTP health `200`; `status=healthy` |
| Explorer | `https://creditcoin-testnet.blockscout.com` | HTTP API reachable |

The legacy USC Testnet 2 RPC remains out of scope; the current CC3 endpoints are reachable. The official CC3 documentation specifies chain ID `102031`, the HTTPS RPC above, and the Blockscout explorer. The official USC SDK documents the CC3 proof service, and the official bridge tutorial confirms Sepolia as the source chain with source-chain key `1`.

## Validation status

- CC3 endpoint validation: PASS.
- USC live proof flow: PASS. The existing proof request for source transaction `0xa4c4659d9f42b2fee82ae8e46411806d511d8d931404a93e326482dc5173c7ca` returned usable proof material.
- Destination verification transaction: PASS. `0xe8b2a92dc044bdd6d8a05b25ef731ad7f61ac614d0fcf6944b2a1e1fbcfb7d0f` finalized with receipt status `1` and emitted both verification and decision events.
- Network configuration: migrated to CC3 values in `.env.example`, Hardhat defaults, worker preflight, endpoint checks, README, checklist, and dashboard explorer link.

Demo Mode is available for deterministic review. Demo fixtures are labeled `Simulated` and are never described as onchain verified.

## Verified result

1. Receipt status is `1` at CC3 block `5472172`.
2. `VerifiedSignalAccepted` contains proof digest `0x496d106cdeacc7cc0bd595195d19dc2ca697d0fb7aef642d8779e589d3d89066`.
3. `DecisionRecorded` contains action `1` (`HOLD`), confidence `78`, and risk score `10`.
4. The dashboard and submission materials now link to the verified receipt.

## Recheck command

Run the non-transactional endpoint check at any time:

```sh
pnpm --filter @attestai/worker health:usc
```

The check performs DNS lookups and safe HTTP requests only. It does not use the relayer key, request a proof, submit a transaction, or change network configuration.
