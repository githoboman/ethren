# AttestAI — Verified Collateral. Adaptive Intelligence.
### AI Agent Trust & Collateral Authority Layer on BOT Chain

> **BOT Chain verifies the capital. AI interprets the regimes.**
> **AI proposes. Guardrails constrain. Verified collateral authorizes.**

AttestAI is an on-chain trust infrastructure for autonomous financial agents, deployed on **BOT Chain Testnet** (Chain ID: `968`). Before an autonomous AI agent can execute or authorize capital risk, AttestAI requires cryptographically proven collateral staked in the `AttestAICollateralVault`. Deterministic on-chain guardrails enforce a strict mathematical risk boundary (20% budget policy), ensuring no AI model can hallucinate capital or self-authorize uncontrolled risk.

---

## BOT Chain Network Configuration

| Property | Testnet Value | Mainnet Value |
|---|---|---|
| **Network Name** | BOT Chain Testnet | BOT Chain Mainnet |
| **Chain ID** | `968` (`0x3c8`) | `677` (`0x2a5`) |
| **RPC Endpoint** | `https://rpc.bohr.life` | `https://rpc.botchain.ai` |
| **Native Currency** | `BOT` (or `tBOT`, 18 decimals) | `BOT` (18 decimals) |
| **Block Explorer** | [scan.bohr.life](https://scan.bohr.life) | [scan.botchain.ai](https://scan.botchain.ai) |
| **Testnet Faucet** | [faucet.botchain.ai/basic](https://faucet.botchain.ai/basic) | N/A (via B DEX) |
| **Block Time** | ≈0.75 seconds | ≈0.75 seconds |

---

## Deployed Smart Contracts (BOT Chain Testnet)

| Contract | Address | Explorer Link |
|---|---|---|
| **AttestAICollateralVault** | `0x31b1B13bbe6aABE678083E3525042e52172619D2` | [View on BOTScan](https://scan.bohr.life/address/0x31b1B13bbe6aABE678083E3525042e52172619D2) |
| **AttestAIBotChainRegistry** | `0xb0F7D964e32287958FD5E89dEf5A13b1C2d1d066` | [View on BOTScan](https://scan.bohr.life/address/0xb0F7D964e32287958FD5E89dEf5A13b1C2d1d066) |
| **SignalEmitter** | `0xD805B37516b5474d754C49052223487a09BBF263` | [View on BOTScan](https://scan.bohr.life/address/0xD805B37516b5474d754C49052223487a09BBF263) |

---

## Deterministic Authority & Guardrail Principle

```text
Staked Collateral on BOT Chain
        ↓
Deterministic Policy (20% Allocation Cap, Max 10.0 BOT per trade)
        ↓
Market Regime Reasoner (TREND, RANGE, HIGH_VOLATILITY, RISK_OFF)
        ↓
On-Chain Guardrail Check:
    - If proposal > verified budget → Clamped / Rejected
    - If regime is RISK_OFF → Zero capital allocation (REFER fallback)
        ↓
Immutable Decision Record on BOT Chain Testnet (Chain ID 968)
```

1. **Verification — What is true?** Only native BOT deposited and confirmed on BOT Chain updates an agent's verified collateral balance.
2. **Authority — What is allowed?** Configurable deterministic policy derives a bounded risk budget.
3. **AI — What should we do?** Adaptive regime reasoning proposes `BUY`, `SELL`, `HOLD`, or `REFER` strictly within that budget.

---

## Frontend Web Application Features

The frontend (`apps/web`) is built with Next.js 15 and modern React, featuring:
- **Interactive Web3 Wallet Connection**: Connect with MetaMask, BO Wallet, Rabby, or any EIP-1193 wallet.
- **One-Click Network Addition & Switching**: Seamlessly switches to BOT Chain Testnet (`Chain ID 968`, RPC `https://rpc.bohr.life`).
- **Live Testnet Balance & Block Height**: Live polling of native `BOT` balance and testnet block number.
- **Interactive Collateral Vault**: Real-time staking and withdrawal of testnet `BOT` to adjust agent risk limits on-chain.
- **AI Regime & Guardrail Reasoning Simulator**: Interactive market regime selection (`TREND`, `RANGE`, `HIGH_VOLATILITY`, `RISK_OFF`) with automatic guardrail checks and budget clamping.
- **On-Chain Decision Recording**: Broadcast decision records directly to BOT Chain Testnet with verified BOTScan transaction links.
- **Form Submission Kit**: Modal with one-click copy of all ecosystem submission form requirements.

---

## Quick Start: Running the Frontend Locally

### Prerequisites
- Node.js >= 18
- pnpm >= 9

### Installation & Run

```bash
# 1. Clone & install dependencies
pnpm install

# 2. Start the web frontend development server
pnpm --filter @attestai/web dev

# 3. Open in browser
http://localhost:3000
```

### Deploying Contracts to BOT Chain Testnet

```bash
# Set your private key in .env (RELAYER_PRIVATE_KEY)
pnpm --filter @attestai/contracts exec hardhat run packages/contracts/scripts/deploy-botchain.ts --network botchain_testnet
```
