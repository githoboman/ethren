# AttestAI — BOT Chain Ecosystem Submission Package

## Project Name
**AttestAI — Verified Collateral & Adaptive Intelligence for Autonomous Financial Agents**

---

## One-Line Pitch
**AttestAI establishes on-chain trust infrastructure on BOT Chain, ensuring autonomous AI financial agents cannot self-authorize capital or execute risk exceeding deterministically verified collateral.**

---

## Short Description
AttestAI solves the fundamental safety dilemma of Web3 AI agents: *How do you give an autonomous agent the freedom to reason adaptively about market regimes without risking uncontrolled financial disaster?*

By anchoring agent authority directly to verified native `BOT` staked into the `AttestAICollateralVault`, AttestAI enforces deterministic smart contract risk guardrails (20% max budget, strict per-trade caps). The AI model analyzes market regimes (`TREND`, `RANGE`, `HIGH_VOLATILITY`, `RISK_OFF`) and generates proposals (`BUY`, `HOLD`, `SELL`, `REFER`), which are verified against on-chain collateral before any transaction can be recorded on BOT Chain. If an agent attempts to hallucinate excess risk or if adverse conditions trigger `RISK_OFF`, execution immediately halts or clamps to zero, protecting user capital.

---

## Network & Technical Information

### 🌐 BOT Chain Mainnet (Primary Production Network)
- **Target Network**: BOT Chain Mainnet
- **Chain ID**: `677` (Hex: `0x2a5`)
- **JSON-RPC Endpoint**: `https://rpc.botchain.ai`
- **Native Currency**: `BOT` (18 decimals)
- **Block Explorer**: [https://scan.botchain.ai](https://scan.botchain.ai)
- **Official DEX Swap**: [https://dex.botchain.ai/#/swap](https://dex.botchain.ai/#/swap)
- **Average Block Time**: ≈0.75 seconds (Parlia PoS consensus)
- **Average Gas Fee**: < $0.001

### 🧪 BOT Chain Testnet
- **Target Network**: BOT Chain Testnet
- **Chain ID**: `968` (Hex: `0x3c8`)
- **JSON-RPC Endpoint**: `https://rpc.bohr.life`
- **Native Currency**: `BOT` (or `tBOT`, 18 decimals)
- **Block Explorer**: [https://scan.bohr.life](https://scan.bohr.life)
- **Testnet Faucet**: [https://faucet.botchain.ai/basic](https://faucet.botchain.ai/basic)

---

## Smart Contract Addresses

### 🌐 BOT Chain Mainnet (Chain ID 677) — LIVE & VERIFIED
| Contract Name | Address | Explorer Link |
| :--- | :--- | :--- |
| **`AttestAICollateralVault`** | `0x55A19A2b3d8B45BB068A57b9197A7eFdf833e978` | [BOTScan Mainnet](https://scan.botchain.ai/address/0x55A19A2b3d8B45BB068A57b9197A7eFdf833e978) |
| **`AttestAIBotChainRegistry`** | `0x31b1B13bbe6aABE678083E3525042e52172619D2` | [BOTScan Mainnet](https://scan.botchain.ai/address/0x31b1B13bbe6aABE678083E3525042e52172619D2) |
| **`SignalEmitter`** | `0xb0F7D964e32287958FD5E89dEf5A13b1C2d1d066` | [BOTScan Mainnet](https://scan.botchain.ai/address/0xb0F7D964e32287958FD5E89dEf5A13b1C2d1d066) |

*Deployer Address*: [`0x90753f69645eC1B6985EEE786721a5D10E0F5aC2`](https://scan.botchain.ai/address/0x90753f69645eC1B6985EEE786721a5D10E0F5aC2)  
*Vault Deployment Tx*: `0xf003a9cfb0dad051dc01eb9835f6b84b8f39539fac1960e375832cc1c7f39ae6`  
*Registry Deployment Tx*: `0x327a1f0fda66e60b24e11d3e112bbe6d772a6457b5c45f5cbd3c41afaf69b32b`  
*SignalEmitter Deployment Tx*: `0x03b56fac2adcd4fffb0f24f3c08d277ea5a61e917bbf2104219ad8e66449f024`

### 🧪 BOT Chain Testnet (Chain ID 968) — LIVE & VERIFIED
| Contract Name | Address | Explorer Link |
| :--- | :--- | :--- |
| **`AttestAICollateralVault`** | `0x31b1B13bbe6aABE678083E3525042e52172619D2` | [BOTScan Testnet](https://scan.bohr.life/address/0x31b1B13bbe6aABE678083E3525042e52172619D2) |
| **`AttestAIBotChainRegistry`** | `0xb0F7D964e32287958FD5E89dEf5A13b1C2d1d066` | [BOTScan Testnet](https://scan.bohr.life/address/0xb0F7D964e32287958FD5E89dEf5A13b1C2d1d066) |
| **`SignalEmitter`** | `0xD805B37516b5474d754C49052223487a09BBF263` | [BOTScan Testnet](https://scan.bohr.life/address/0xD805B37516b5474d754C49052223487a09BBF263) |

---

## Key Features & Live Capabilities

1. **Dual-Network Web3 Wallet Integration**: Connect with MetaMask, BO Wallet, Rabby, or any standard EVM wallet with seamless 1-click automatic network addition and switching between **BOT Chain Mainnet (Chain ID 677)** and **BOT Chain Testnet (Chain ID 968)**.
2. **Interactive Collateral Vault**: Live on-chain deposit and withdrawal of native `BOT` tokens, dynamically sizing autonomous agent risk budgets.
3. **Adaptive AI Regime Engine**: Real-time market regime classification across `BOT/USD`, `BOT/USDT`, and `ETH/BOT` with confidence and risk scoring.
4. **Deterministic Guardrail Enforcement**: Mathematical clamping of proposals exceeding verified collateral limits. Zero-allocation safe fallback for `RISK_OFF`.
5. **Dual-Network On-Chain Decision Recording**: Broadcast and verify decisions with immutable hashes viewable on BOTScan Explorer (Mainnet & Testnet).
6. **Form Submission Kit**: Built-in modal assistant enabling judges and ecosystem reviewers to copy all technical parameters for Mainnet or Testnet with a single click.

---

## Two-Minute Judge Demo Script

1. **Connect Wallet & Choose Network**: Click "Connect Wallet". Toggle between **Mainnet (677)** and **Testnet (968)** in the top navigation.
2. **Observe Real-Time Metrics**: Point out the live BOT Chain block height (updating every ~8 seconds directly from the live RPC) and your live `BOT` wallet balance.
3. **Deposit Staked Collateral**: Enter `0.05` BOT and click "Deposit BOT". Notice the dynamic update of the 20% Agent Risk Budget (`0.0100 BOT`).
4. **Simulate a Normal Trade**: Select `TREND`, enter `0.01` BOT allocation, and click "Evaluate Proposal & Guardrails". Notice that all guardrails pass with high confidence.
5. **Test the Guardrail Safety Breach**: Enter `0.10` BOT allocation (exceeding the 0.01 BOT budget). Click evaluate. Observe the guardrail automatically intervene: `OVER-BUDGET GUARDRAIL ACTIVATED: CLAMPED TO 0.0100 BOT`.
6. **Test Safe Fallback**: Select `RISK_OFF`. Observe the safe `REFER` action with 0 capital allocation.
7. **Record On-Chain**: Click "Record Decision On BOT Chain" to write the immutable decision proof to Chain ID 677 / 968 and view the transaction on BOTScan!
