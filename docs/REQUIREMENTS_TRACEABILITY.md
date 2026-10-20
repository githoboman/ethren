# Requirements Traceability

| Requirement | Evidence | Status |
| --- | --- | --- |
| Source event on Sepolia | `packages/contracts/contracts/SignalEmitter.sol` | Foundation |
| USC proof verification | `packages/contracts/contracts/AttestAIDecision.sol`, verifier `0x0FD2` | Foundation; live proof wiring pending deployment |
| Relay worker | `apps/worker/src/relay.ts` | Foundation |
| Deterministic guardrails before AI | `apps/worker/src/risk.ts` | Implemented |
| BUY, HOLD, SELL decision | `apps/worker/src/decision.ts` | Implemented |
| Creditcoin decision record | `packages/contracts/contracts/AttestAIDecision.sol` | Implemented |
| Proof Inspector | `apps/web/app/page.tsx` | Implemented as dashboard foundation |
| Explorer links | `apps/web/app/page.tsx` | Implemented |
| No real-money trading | README and worker configuration | Implemented |
| English-only repository | `CONTRIBUTING.md` and CI scan target | Implemented |

## Official references checked

- Creditcoin USC overview: `https://docs.creditcoin.org/usc`
- USC builder infrastructure: `https://docs.creditcoin.org/usc/dapp-builder-infrastructure/universal-smart-contracts`
- USC quickstart: `https://docs.creditcoin.org/usc/dapp-builder-infrastructure/quickstart`
- Creditcoin endpoints: `https://docs.creditcoin.org/smart-contract-guides/creditcoin-endpoints`
- Official examples: `https://github.com/gluwa/usc-testnet-bridge-examples` and `https://github.com/gluwa/USC-Builder-Examples`

The current Creditcoin documentation identifies CC3 Testnet as chain ID `102031`, RPC `https://rpc.cc3-testnet.creditcoin.network`, and explorer `https://creditcoin-testnet.blockscout.com`. The official USC SDK documents `https://prover.cc3-testnet.creditcoin.network/` as the CC3 proof service example; its health endpoint and the equivalent `https://proof-gen-api.cc3-testnet.creditcoin.network` endpoint both respond successfully. The official CC3 bridge tutorial confirms Sepolia source-chain key `1`. The native query verifier is `0x0FD2`; the source-chain key is distinct from Sepolia EVM chain ID `11155111`.
