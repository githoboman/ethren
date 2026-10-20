# AttestAI — BOT Chain Ecosystem Submission Package

## Project Name
**AttestAI — Verified Collateral & Adaptive Intelligence for Autonomous Financial Agents**

---

## One-Line Pitch
**AttestAI establishes on-chain trust infrastructure on BOT Chain, ensuring autonomous AI financial agents cannot self-authorize capital or execute risk exceeding deterministically verified collateral.**

---

## Short Description
AttestAI solves the fundamental safety dilemma of Web3 AI agents: *How do you give an autonomous agent the freedom to reason adaptively about market regimes without risking uncontrolled financial disaster?*

By anchoring agent authority directly to verified native `BOT` staked into the `AttestAICollateralVault`, AttestAI enforces deterministic smart contract risk guardrails (20% max budget, strict per-trade caps). The AI model analyzes market regimes (`TREND`, `RANGE`, `HIGH_VOLATILITY`, `RISK_OFF`) and generates proposals (`BUY`, `HOLD`, `SELL`, `REFER`), which are verified against on-chain collateral before any transaction can be recorded on BOT Chain Testnet. If an agent attempts to hallucinate excess risk or if adverse conditions trigger `RISK_OFF`, execution immediately halts or clamps to zero, protecting user capital.

---

## Network & Technical Information

- **Target Network**: BOT Chain Testnet
- **Chain ID**: `968` (Hex: `0x3c8`)
- **JSON-RPC Endpoint**: `https://rpc.bohr.life`
- **Native Currency**: `BOT` (or `tBOT`, 18 decimals)
- **Block Explorer**: [https://scan.bohr.life](https://scan.bohr.life)
- **Testnet Faucet**: [https://faucet.botchain.ai/basic](https://faucet.botchain.ai/basic)
- **Average Block Time**: ≈0.75 seconds (Parlia PoS consensus)
- **Average Gas Fee**: < $0.001

---

## Smart Contract Addresses (BOT Chain Testnet)

- **AttestAICollateralVault**: [`0x31b1B13bbe6aABE678083E3525042e52172619D2`](https://scan.bohr.life/address/0x31b1B13bbe6aABE678083E3525042e52172619D2)
- **AttestAIBotChainRegistry**: [`0xb0F7D964e32287958FD5E89dEf5A13b1C2d1d066`](https://scan.bohr.life/address/0xb0F7D964e32287958FD5E89dEf5A13b1C2d1d066)
- **SignalEmitter**: [`0xD805B37516b5474d754C49052223487a09BBF263`](https://scan.bohr.life/address/0xD805B37516b5474d754C49052223487a09BBF263)

---

## Key Features & Live Capabilities

1. **Web3 Wallet Connection**: Connect with MetaMask, BO Wallet, Rabby, or any standard EVM wallet with one-click automatic network addition and switching to BOT Chain Testnet (Chain ID 968).
2. **Interactive Collateral Vault**: Live on-chain deposit and withdrawal of native `BOT` testnet tokens, adjusting autonomous agent risk budgets dynamically.
3. **Adaptive AI Regime Engine**: Market regime detection across `BOT/USD`, `BOT/USDT`, and `ETH/BOT` with confidence and risk scoring.
4. **Deterministic Guardrail Enforcement**: Strict algorithmic clamping of proposals exceeding verified collateral limits. Zero-allocation safe fallback for `RISK_OFF`.
5. **BOT Chain Testnet Recording**: Broadcast and verify decisions with immutable hashes viewable on BOTScan Explorer.
6. **Form Submission Kit**: Built-in modal assistant enabling judges and reviewers to copy project technical parameters with a single click.

---

## Two-Minute Judge Demo Script

1. **Connect Wallet**: Click "Connect Wallet". If on Ethereum or another chain, approve the one-click network switch to BOT Chain Testnet (Chain ID 968).
2. **Observe Real-Time Metrics**: Point out the live BOT Chain block height (updating every ~8 seconds directly from `https://rpc.bohr.life`) and your live `BOT` wallet balance.
3. **Deposit Staked Collateral**: Enter `0.1` BOT and click "Deposit BOT". Notice the dynamic update of the 20% Agent Risk Budget (`0.0200 BOT`).
4. **Simulate a Normal Trade**: Select `TREND`, enter `0.02` BOT allocation, and click "Evaluate Proposal & Guardrails". Notice that all guardrails pass with high confidence.
5. **Test the Guardrail Safety Breach**: Enter `0.15` BOT allocation (exceeding the 0.02 BOT budget). Click evaluate. Observe the guardrail automatically intervene: `OVER-BUDGET GUARDRAIL ACTIVATED: CLAMPED TO 0.0200 BOT`.
6. **Test Safe Fallback**: Select `RISK_OFF`. Observe the safe `REFER` action with 0 capital allocation.
7. **Record On-Chain**: Click "Record Decision On BOT Chain Testnet" to write the immutable decision proof to Chain ID 968 and view the transaction on BOTScan!
