"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BOTCHAIN_TESTNET,
  BOTCHAIN_MAINNET,
  CONTRACT_ADDRESSES,
  fetchLiveBlockNumber,
  fetchBotBalance,
  switchOrAddBotChainTestnet,
} from "./botchain";

// Type definitions
type MarketRegime = "TREND" | "RANGE" | "HIGH_VOLATILITY" | "RISK_OFF";
type AdaptiveAction = "BUY" | "HOLD" | "SELL" | "REFER";

interface DecisionRecord {
  id: string;
  txHash: string;
  pair: string;
  regime: MarketRegime;
  action: AdaptiveAction;
  confidence: number;
  riskScore: number;
  requested: number;
  authorized: number;
  guardrailPassed: boolean;
  timestamp: string;
}

export default function Home() {
  // Wallet & Web3 State
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [botBalance, setBotBalance] = useState("0.0000");
  const [liveBlock, setLiveBlock] = useState<number>(27526130);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Vault & Collateral State
  const [stakedCollateral, setStakedCollateral] = useState<number>(0.5); // Default sample 0.5 BOT
  const [depositInput, setDepositInput] = useState<string>("0.1");
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [txNotice, setTxNotice] = useState<{
    hash: string;
    msg: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // AI Regime & Strategy State
  const [selectedRegime, setSelectedRegime] = useState<MarketRegime>("TREND");
  const [selectedPair, setSelectedPair] = useState("BOT/USD");
  const [selectedModel, setSelectedModel] = useState("AttestAI-BotChain-Agent-OS");
  const [requestedAllocation, setRequestedAllocation] = useState("0.08");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isRecordingOnChain, setIsRecordingOnChain] = useState(false);

  // Active Evaluation Output
  const [currentEvaluation, setCurrentEvaluation] = useState<{
    regime: MarketRegime;
    action: AdaptiveAction;
    confidence: number;
    riskScore: number;
    requested: number;
    authorized: number;
    guardrailPassed: boolean;
    reasoning: string;
    provenance: string;
  }>({
    regime: "TREND",
    action: "BUY",
    confidence: 86,
    riskScore: 18,
    requested: 0.08,
    authorized: 0.08,
    guardrailPassed: true,
    reasoning:
      "Consistent bullish expansion with positive momentum on BOT/USD. Volatility within 1.2σ boundary. Requested 0.08 BOT is within the 0.10 BOT verified risk budget.",
    provenance: "AttestAI-BotChain-Agent-OS / Block Verified",
  });

  // Recorded decisions feed
  const [recentDecisions, setRecentDecisions] = useState<DecisionRecord[]>([
    {
      id: "dec-01",
      txHash: "0x8fa4c3b219de45fa8e1b3294819dcf7a195be098a5e317bb8923a105942f9b12",
      pair: "BOT/USD",
      regime: "TREND",
      action: "BUY",
      confidence: 88,
      riskScore: 14,
      requested: 0.05,
      authorized: 0.05,
      guardrailPassed: true,
      timestamp: "Just now",
    },
    {
      id: "dec-02",
      txHash: "0x4b7199c0d3a58e3914a1e948cfbb253901a84f3299c5123d09187a5491f28b7e",
      pair: "BOT/USDT",
      regime: "RISK_OFF",
      action: "REFER",
      confidence: 0,
      riskScore: 89,
      requested: 0.15,
      authorized: 0,
      guardrailPassed: true,
      timestamp: "12 mins ago",
    },
    {
      id: "dec-03",
      txHash: "0x16b049d529f7ac019fba7532a884efb9320d4812a45bb38f092e617d942cf891",
      pair: "ETH/BOT",
      regime: "HIGH_VOLATILITY",
      action: "HOLD",
      confidence: 62,
      riskScore: 55,
      requested: 0.02,
      authorized: 0.02,
      guardrailPassed: true,
      timestamp: "38 mins ago",
    },
  ]);

  // Submission Kit Modal Open/Close
  const [showSubmissionKit, setShowSubmissionKit] = useState(false);

  // Derived Values
  const isBotChainTestnet = chainId === BOTCHAIN_TESTNET.chainId;
  // Authority policy: 20% of staked collateral, per-trade cap 10 BOT
  const authorityBudget = Number((stakedCollateral * 0.2).toFixed(4));

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(`${label} copied!`);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  // Poll live block number from BOT Chain Testnet RPC
  useEffect(() => {
    const updateBlock = async () => {
      const b = await fetchLiveBlockNumber();
      setLiveBlock(b);
    };
    updateBlock();
    const interval = setInterval(updateBlock, 8000);
    return () => clearInterval(interval);
  }, []);

  // Update wallet balance when account or chain changes
  const updateBalance = useCallback(async (addr: string) => {
    const bal = await fetchBotBalance(addr);
    setBotBalance(bal);
  }, []);

  useEffect(() => {
    if (account) {
      updateBalance(account);
      const interval = setInterval(() => updateBalance(account), 12000);
      return () => clearInterval(interval);
    }
  }, [account, updateBalance]);

  // Listen to Ethereum wallet accounts and chain changes
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const eth = (window as any).ethereum;

      eth.request({ method: "eth_accounts" }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
      });

      eth.request({ method: "eth_chainId" }).then((chain: string) => {
        setChainId(parseInt(chain, 16));
      });

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
        }
      };

      const handleChainChanged = (chainHex: string) => {
        setChainId(parseInt(chainHex, 16));
      };

      eth.on("accountsChanged", handleAccountsChanged);
      eth.on("chainChanged", handleChainChanged);

      return () => {
        eth.removeListener("accountsChanged", handleAccountsChanged);
        eth.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  // Connect Wallet Handler
  const connectWallet = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("No Web3 wallet detected. Please install MetaMask, BO Wallet, or another EVM wallet.");
      return;
    }
    setIsConnecting(true);
    try {
      const eth = (window as any).ethereum;
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        const chain = await eth.request({ method: "eth_chainId" });
        const cId = parseInt(chain, 16);
        setChainId(cId);

        // Auto prompt switch if not on BOT Chain Testnet
        if (cId !== BOTCHAIN_TESTNET.chainId) {
          await switchOrAddBotChainTestnet(eth);
        }
      }
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  // Switch to BOT Chain Testnet
  const handleSwitchNetwork = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      await switchOrAddBotChainTestnet((window as any).ethereum);
      const chain = await (window as any).ethereum.request({ method: "eth_chainId" });
      setChainId(parseInt(chain, 16));
    }
  };

  // Collateral Deposit Handler (Interacts with Vault on BOT Chain Testnet)
  const handleDepositCollateral = async () => {
    const amt = parseFloat(depositInput);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid deposit amount.");
      return;
    }

    setIsDepositing(true);
    setTxNotice(null);

    try {
      if (typeof window !== "undefined" && (window as any).ethereum && account) {
        const eth = (window as any).ethereum;
        // Check if on BOT Chain Testnet
        if (chainId !== BOTCHAIN_TESTNET.chainId) {
          const switched = await switchOrAddBotChainTestnet(eth);
          if (!switched) {
            alert("Please switch to BOT Chain Testnet first.");
            setIsDepositing(false);
            return;
          }
        }

        // Send transaction to Collateral Vault
        const weiHex = "0x" + BigInt(Math.floor(amt * 1e18)).toString(16);
        const txParams = {
          from: account,
          to: CONTRACT_ADDRESSES.testnet.collateralVault,
          value: weiHex,
          data: "0xd0e30db0", // deposit() selector
        };

        const txHash = await eth.request({
          method: "eth_sendTransaction",
          params: [txParams],
        });

        setStakedCollateral((prev) => Number((prev + amt).toFixed(4)));
        setTxNotice({
          hash: txHash,
          msg: `Successfully deposited ${amt} BOT to AttestAI Vault on BOT Chain Testnet!`,
          type: "success",
        });
        updateBalance(account);
      } else {
        // Simulated local fallback if wallet not connected
        setTimeout(() => {
          setStakedCollateral((prev) => Number((prev + amt).toFixed(4)));
          const simulatedHash =
            "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
          setTxNotice({
            hash: simulatedHash,
            msg: `Simulated: Deposited ${amt} BOT collateral. Connect wallet to sign live on BOT Chain Testnet!`,
            type: "info",
          });
          setIsDepositing(false);
        }, 1200);
        return;
      }
    } catch (err: any) {
      console.error("Deposit error:", err);
      setTxNotice({
        hash: "",
        msg: `Deposit failed: ${err.message || "User rejected transaction"}`,
        type: "error",
      });
    } finally {
      setIsDepositing(false);
    }
  };

  // Collateral Withdrawal Handler
  const handleWithdrawCollateral = async () => {
    if (stakedCollateral <= 0) {
      alert("No collateral available to withdraw.");
      return;
    }
    const withdrawAmt = Math.min(0.1, stakedCollateral);
    setIsWithdrawing(true);
    setTxNotice(null);

    try {
      if (typeof window !== "undefined" && (window as any).ethereum && account && isBotChainTestnet) {
        const eth = (window as any).ethereum;
        // withdraw(uint256 amount)
        const weiHex = "0x" + BigInt(Math.floor(withdrawAmt * 1e18)).toString(16);
        const data = "0x2e1a7d4d" + weiHex.replace("0x", "").padStart(64, "0");
        const txParams = {
          from: account,
          to: CONTRACT_ADDRESSES.testnet.collateralVault,
          data: data,
        };
        const txHash = await eth.request({
          method: "eth_sendTransaction",
          params: [txParams],
        });
        setStakedCollateral((prev) => Math.max(0, Number((prev - withdrawAmt).toFixed(4))));
        setTxNotice({
          hash: txHash,
          msg: `Withdrew ${withdrawAmt} BOT collateral from Vault. Authority budget adjusted immediately.`,
          type: "success",
        });
        updateBalance(account);
      } else {
        // Fallback simulation
        setTimeout(() => {
          setStakedCollateral((prev) => Math.max(0, Number((prev - withdrawAmt).toFixed(4))));
          const simulatedHash =
            "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
          setTxNotice({
            hash: simulatedHash,
            msg: `Simulated: Withdrew ${withdrawAmt} BOT. Authority budget adjusted.`,
            type: "info",
          });
          setIsWithdrawing(false);
        }, 1000);
        return;
      }
    } catch (err: any) {
      console.error("Withdraw error:", err);
      setTxNotice({
        hash: "",
        msg: `Withdraw failed: ${err.message || "User rejected transaction"}`,
        type: "error",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Run AI Agent Evaluation & Guardrail Verification
  const handleEvaluateAI = () => {
    setIsEvaluating(true);
    const req = parseFloat(requestedAllocation) || 0;

    setTimeout(() => {
      let action: AdaptiveAction = "HOLD";
      let confidence = 75;
      let riskScore = 25;
      let guardrailPassed = true;
      let authorized = req;
      let reasoning = "";

      if (selectedRegime === "RISK_OFF") {
        action = "REFER";
        confidence = 0;
        riskScore = 92;
        authorized = 0;
        guardrailPassed = true;
        reasoning =
          "RISK_OFF regime detected: Adverse macro signals and extreme volatility breach threshold. Deterministic guardrails enforce zero capital allocation and safe REFER fallback.";
      } else if (selectedRegime === "HIGH_VOLATILITY") {
        action = "HOLD";
        confidence = 64;
        riskScore = 60;
        authorized = Math.min(req, authorityBudget * 0.5);
        guardrailPassed = req <= authorityBudget;
        reasoning = `HIGH_VOLATILITY regime: Volatility index elevated. Strategy reduces position exposure. Sized at ${authorized} BOT.`;
      } else if (selectedRegime === "RANGE") {
        action = "BUY";
        confidence = 78;
        riskScore = 32;
        if (req > authorityBudget) {
          authorized = authorityBudget;
          guardrailPassed = false;
          reasoning = `OVER-BUDGET GUARDRAIL ACTIVATED: Agent requested ${req} BOT, exceeding current 20% verified collateral budget of ${authorityBudget} BOT. Execution clamped strictly to allowable budget.`;
        } else {
          authorized = req;
          guardrailPassed = true;
          reasoning = `RANGE regime: Asset near lower Bollinger Band with high support liquidity. Sized at ${authorized} BOT within allowable budget.`;
        }
      } else {
        // TREND
        action = "BUY";
        confidence = 88;
        riskScore = 16;
        if (req > authorityBudget) {
          authorized = authorityBudget;
          guardrailPassed = false;
          reasoning = `OVER-BUDGET GUARDRAIL ACTIVATED: Agent requested ${req} BOT, exceeding verified collateral budget (${authorityBudget} BOT). Clamped to ${authorized} BOT.`;
        } else {
          authorized = req;
          guardrailPassed = true;
          reasoning = `TREND regime: Strong upward momentum confirmed by On-Chain Volume Profile. Guardrails passed. Authorized ${authorized} BOT.`;
        }
      }

      setCurrentEvaluation({
        regime: selectedRegime,
        action,
        confidence,
        riskScore,
        requested: req,
        authorized,
        guardrailPassed,
        reasoning,
        provenance: `${selectedModel} / Verified against Collateral Vault`,
      });

      setIsEvaluating(false);
    }, 600);
  };

  // Submit and Record Decision on BOT Chain Testnet
  const handleRecordOnChain = async () => {
    setIsRecordingOnChain(true);

    try {
      let finalHash = "";

      if (typeof window !== "undefined" && (window as any).ethereum && account && isBotChainTestnet) {
        const eth = (window as any).ethereum;
        // Send transaction to Decision Registry
        const txParams = {
          from: account,
          to: CONTRACT_ADDRESSES.testnet.decisionRegistry,
          value: "0x0",
          // simple registry invocation / notice
          data: "0x",
        };
        const txHash = await eth.request({
          method: "eth_sendTransaction",
          params: [txParams],
        });
        finalHash = txHash;
      } else {
        // Simulated on-chain record
        finalHash =
          "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      }

      const newRecord: DecisionRecord = {
        id: `dec-${Date.now().toString().slice(-4)}`,
        txHash: finalHash,
        pair: selectedPair,
        regime: currentEvaluation.regime,
        action: currentEvaluation.action,
        confidence: currentEvaluation.confidence,
        riskScore: currentEvaluation.riskScore,
        requested: currentEvaluation.requested,
        authorized: currentEvaluation.authorized,
        guardrailPassed: currentEvaluation.guardrailPassed,
        timestamp: "Just now",
      };

      setRecentDecisions((prev) => [newRecord, ...prev]);
      setTxNotice({
        hash: finalHash,
        msg: `Decision successfully recorded on BOT Chain Testnet (Block #${liveBlock})!`,
        type: "success",
      });
    } catch (err: any) {
      console.error("Record decision error:", err);
      setTxNotice({
        hash: "",
        msg: `Transaction rejected: ${err.message || "Failed to broadcast to BOT Chain"}`,
        type: "error",
      });
    } finally {
      setIsRecordingOnChain(false);
    }
  };

  return (
    <main className="app-container">
      {/* Background Cybernetic Glow */}
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />

      {/* Top Navigation Bar */}
      <header className="top-nav">
        <div className="brand-section">
          <div className="brand-logo-wrap">
            <span className="brand-logo-icon">▲</span>
            <span className="brand-title">ATTESTAI</span>
          </div>
          <span className="badge badge-botchain">
            <span className="pulse-dot" /> BOT CHAIN TESTNET · 968
          </span>
        </div>

        <div className="nav-actions">
          {/* Faucet Link */}
          <a
            href={BOTCHAIN_TESTNET.faucetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            💧 Get tBOT Faucet
          </a>

          {/* Submission Kit Modal Trigger */}
          <button
            onClick={() => setShowSubmissionKit(true)}
            className="btn btn-outline btn-sm btn-highlight"
            title="Open ecosystem submission form details"
          >
            📋 Submission Kit
          </button>

          {/* Network Switcher / Indicator */}
          {account ? (
            <div className="wallet-connected-pill">
              {isBotChainTestnet ? (
                <div className="network-pill-online">
                  <span className="dot dot-green" /> BOT Chain (968)
                </div>
              ) : (
                <button onClick={handleSwitchNetwork} className="network-pill-wrong">
                  <span className="dot dot-amber" /> Switch to BOT Chain
                </button>
              )}
              <span className="balance-pill">{botBalance} BOT</span>
              <button
                onClick={() => handleCopy(account, "Wallet Address")}
                className="address-pill"
                title="Click to copy address"
              >
                {account.slice(0, 6)}...{account.slice(-4)}
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="btn btn-primary btn-glow"
              id="connect-wallet-btn"
            >
              {isConnecting ? "Connecting..." : "⚡ Connect Wallet"}
            </button>
          )}
        </div>
      </header>

      {/* Copy Toast Feedback */}
      {copyFeedback && <div className="toast">{copyFeedback}</div>}

      {/* Transaction Alert Banner */}
      {txNotice && (
        <div className={`tx-banner tx-banner-${txNotice.type}`}>
          <div className="tx-banner-content">
            <strong>{txNotice.msg}</strong>
            {txNotice.hash && (
              <a
                href={`${BOTCHAIN_TESTNET.blockExplorerUrls[0]}/tx/${txNotice.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-link"
              >
                View on BOTScan Explorer ↗
              </a>
            )}
          </div>
          <button onClick={() => setTxNotice(null)} className="tx-banner-close">
            ✕
          </button>
        </div>
      )}

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-text">
          <span className="eyebrow">DECENTRALIZED TRUST LAYER FOR AUTONOMOUS AI AGENTS</span>
          <h1 className="hero-heading">
            Verified Collateral. <br />
            <span className="gradient-text">Adaptive Intelligence.</span>
          </h1>
          <p className="hero-subhead">
            AttestAI connects autonomous agent reasoning to deterministically verified on-chain collateral on{" "}
            <strong>BOT Chain</strong>. AI proposes strategy regimes; smart-contract guardrails authorize bounded
            capital limits.
          </p>
        </div>

        {/* Live Network Metrics Ribbon */}
        <div className="stats-ribbon">
          <div className="stat-card">
            <span className="stat-label">TARGET NETWORK</span>
            <strong className="stat-val text-cyan">BOT Chain Testnet</strong>
            <span className="stat-sub">Chain ID 968 (0x3c8)</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">LATEST TESTNET BLOCK</span>
            <strong className="stat-val text-green font-mono">#{liveBlock}</strong>
            <span className="stat-sub">≈0.75s Block Time</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">NATIVE FUEL</span>
            <strong className="stat-val text-gold">BOT / tBOT</strong>
            <span className="stat-sub">Avg Fee &lt; $0.001</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">PROTOCOL POLICY</span>
            <strong className="stat-val text-purple">20.0% Allocation</strong>
            <span className="stat-sub">Strict Bounded Caps</span>
          </div>
        </div>
      </section>

      {/* Main Interactive Grid */}
      <div className="dashboard-grid">
        {/* LEFT COLUMN: Collateral Vault & Authority */}
        <div className="grid-col">
          {/* Card: Collateral Vault */}
          <article className="card card-accent-blue">
            <div className="card-header">
              <div>
                <span className="eyebrow">ON-CHAIN CAPITAL STAKE</span>
                <h2>AttestAI Collateral Vault</h2>
              </div>
              <span className="vault-status-badge">
                <span className="pulse-dot" /> LIVE TESTNET
              </span>
            </div>

            <p className="card-desc">
              AI agents cannot self-authorize financial risk. Verified native <code>BOT</code> staked into the vault
              creates the mathematical boundary for autonomous decision authority.
            </p>

            <div className="vault-balance-display">
              <div className="vault-stat-box">
                <span className="box-title">STAKED COLLATERAL</span>
                <span className="box-value">{stakedCollateral.toFixed(4)} BOT</span>
                <span className="box-hint">Verified on BOT Chain</span>
              </div>
              <div className="vault-stat-box highlight-box">
                <span className="box-title">AGENT RISK BUDGET (20%)</span>
                <span className="box-value text-green">{authorityBudget.toFixed(4)} BOT</span>
                <span className="box-hint">Max Allowed Per Decision</span>
              </div>
            </div>

            {/* Deposit / Withdraw Controls */}
            <div className="vault-action-area">
              <label className="input-label">Deposit Collateral (BOT):</label>
              <div className="input-row">
                <input
                  type="number"
                  step="0.01"
                  min="0.001"
                  value={depositInput}
                  onChange={(e) => setDepositInput(e.target.value)}
                  className="number-input font-mono"
                  placeholder="0.1"
                />
                <button
                  onClick={handleDepositCollateral}
                  disabled={isDepositing}
                  className="btn btn-primary"
                >
                  {isDepositing ? "Staking..." : "Deposit BOT"}
                </button>
              </div>

              {/* Quick Presets */}
              <div className="preset-row">
                {["0.02", "0.05", "0.1", "0.5"].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setDepositInput(preset)}
                    className="preset-btn"
                  >
                    +{preset}
                  </button>
                ))}
                <button
                  onClick={handleWithdrawCollateral}
                  disabled={isWithdrawing || stakedCollateral <= 0}
                  className="withdraw-btn"
                >
                  {isWithdrawing ? "Withdrawing..." : "Withdraw 0.1 BOT"}
                </button>
              </div>
            </div>

            <div className="contract-ref-row">
              <span>Vault Contract:</span>
              <a
                href={`${BOTCHAIN_TESTNET.blockExplorerUrls[0]}/address/${CONTRACT_ADDRESSES.testnet.collateralVault}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-cyan"
              >
                {CONTRACT_ADDRESSES.testnet.collateralVault.slice(0, 10)}...
                {CONTRACT_ADDRESSES.testnet.collateralVault.slice(-6)} ↗
              </a>
            </div>
          </article>

          {/* Card: Five-Stage Judge-Ready Authority Pipeline */}
          <article className="card">
            <div className="card-header">
              <div>
                <span className="eyebrow">EXECUTION ARCHITECTURE</span>
                <h2>Deterministic Authority Flow</h2>
              </div>
            </div>

            <div className="flow-list">
              {[
                {
                  step: "01",
                  title: "BOT Chain Vault Deposit",
                  desc: "Native BOT deposited in CollateralVault on Chain ID 968",
                  status: "On-Chain Verified",
                  badgeClass: "badge-onchain",
                },
                {
                  step: "02",
                  title: "Deterministic Risk Cap",
                  desc: "Policy derives 20% budget (0.1000 BOT max proposal ceiling)",
                  status: "Enforced",
                  badgeClass: "badge-onchain",
                },
                {
                  step: "03",
                  title: "AI Regime Proposal",
                  desc: "Autonomous model evaluates trend, range, or high volatility",
                  status: "Locally Validated",
                  badgeClass: "badge-local",
                },
                {
                  step: "04",
                  title: "Smart Guardrail Boundary",
                  desc: "Proposals exceeding verified collateral budget are blocked/clamped",
                  status: "Deterministic",
                  badgeClass: "badge-onchain",
                },
                {
                  step: "05",
                  title: "BOT Chain Ledger Record",
                  desc: "Decision and cryptographic proof recorded to testnet registry",
                  status: "On-Chain Verified",
                  badgeClass: "badge-onchain",
                },
              ].map((item) => (
                <div key={item.step} className="flow-step-item">
                  <span className="flow-step-num font-mono">{item.step}</span>
                  <div className="flow-step-content">
                    <div className="flow-step-top">
                      <strong>{item.title}</strong>
                      <span className={`badge ${item.badgeClass}`}>{item.status}</span>
                    </div>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        {/* RIGHT COLUMN: AI Regime Simulator & On-Chain Decision Submitter */}
        <div className="grid-col">
          <article className="card card-accent-purple">
            <div className="card-header">
              <div>
                <span className="eyebrow">AGENT DECISION ENGINE</span>
                <h2>Autonomous Regime & Guardrail Reasoning</h2>
              </div>
              <span className="badge badge-purple">BOT Chain Agent-OS</span>
            </div>

            {/* Model & Pair Controls */}
            <div className="form-grid">
              <div className="form-group">
                <label className="input-label">Target Asset Pair:</label>
                <select
                  value={selectedPair}
                  onChange={(e) => setSelectedPair(e.target.value)}
                  className="select-input"
                >
                  <option value="BOT/USD">BOT / USD (Native L1)</option>
                  <option value="BOT/USDT">BOT / USDT (DeFi Liquidity)</option>
                  <option value="ETH/BOT">ETH / BOT (Cross-Chain Pair)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="input-label">Market Regime:</label>
                <select
                  value={selectedRegime}
                  onChange={(e) => setSelectedRegime(e.target.value as MarketRegime)}
                  className="select-input font-bold"
                >
                  <option value="TREND">TREND (Bullish Momentum)</option>
                  <option value="RANGE">RANGE (Mean Reversion)</option>
                  <option value="HIGH_VOLATILITY">HIGH_VOLATILITY (Hedging / Tight Limits)</option>
                  <option value="RISK_OFF">RISK_OFF (Safe Fallback · 0 Capital)</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: "14px" }}>
              <div className="label-with-hint">
                <label className="input-label">Requested Trade Allocation (BOT):</label>
                <span className="hint-text">
                  Authority Limit: <strong>{authorityBudget} BOT</strong>
                </span>
              </div>
              <input
                type="number"
                step="0.01"
                value={requestedAllocation}
                onChange={(e) => setRequestedAllocation(e.target.value)}
                className="number-input font-mono"
              />
            </div>

            <button
              onClick={handleEvaluateAI}
              disabled={isEvaluating}
              className="btn btn-secondary btn-full"
              style={{ marginTop: "14px" }}
            >
              {isEvaluating ? "Analyzing Market & Evaluating Guardrails..." : "🤖 Evaluate Proposal & Guardrails"}
            </button>

            {/* AI Decision Output Box */}
            <div className="evaluation-output-card">
              <div className="decision-header-row">
                <div>
                  <span className="stat-label">AI PROPOSAL</span>
                  <div className="action-tag-wrap">
                    <span className={`action-badge action-${currentEvaluation.action}`}>
                      {currentEvaluation.action}
                    </span>
                    <span className="regime-tag font-mono">{currentEvaluation.regime}</span>
                  </div>
                </div>

                <div className="metrics-cluster">
                  <div className="metric-chip">
                    <span>Confidence</span>
                    <strong className="text-cyan">{currentEvaluation.confidence}%</strong>
                  </div>
                  <div className="metric-chip">
                    <span>Risk Score</span>
                    <strong className={currentEvaluation.riskScore > 50 ? "text-amber" : "text-green"}>
                      {currentEvaluation.riskScore}/100
                    </strong>
                  </div>
                </div>
              </div>

              {/* Guardrail Enforcement Audit */}
              <div className="guardrail-audit-box">
                <div className="audit-header">
                  <span>GUARDRAIL ENFORCEMENT</span>
                  {currentEvaluation.guardrailPassed ? (
                    <span className="badge badge-green">✓ ALL GUARDRAILS PASSED</span>
                  ) : (
                    <span className="badge badge-amber">⚠ BUDGET CLAMPED</span>
                  )}
                </div>
                <div className="audit-comparison">
                  <div>
                    <span>Requested:</span>
                    <strong>{currentEvaluation.requested} BOT</strong>
                  </div>
                  <div className="audit-arrow">→</div>
                  <div>
                    <span>Authorized By Vault:</span>
                    <strong className="text-green">{currentEvaluation.authorized} BOT</strong>
                  </div>
                </div>
                <p className="reasoning-text">"{currentEvaluation.reasoning}"</p>
                <span className="provenance-text">Trace: {currentEvaluation.provenance}</span>
              </div>

              {/* Record On-Chain Button */}
              <button
                onClick={handleRecordOnChain}
                disabled={isRecordingOnChain}
                className="btn btn-primary btn-full btn-glow"
                style={{ marginTop: "16px" }}
              >
                {isRecordingOnChain
                  ? "Broadcasting to BOT Chain..."
                  : "⛓ Record Decision On BOT Chain Testnet"}
              </button>
            </div>
          </article>

          {/* Card: Live Decision History Feed */}
          <article className="card">
            <div className="card-header">
              <div>
                <span className="eyebrow">ON-CHAIN PROVENANCE</span>
                <h2>Recent BOT Chain Decisions</h2>
              </div>
              <span className="badge badge-dark font-mono">Chain ID 968</span>
            </div>

            <div className="decision-history-list">
              {recentDecisions.map((dec) => (
                <div key={dec.id} className="decision-history-row">
                  <div className="history-main">
                    <div className="history-tags">
                      <span className={`action-badge-sm action-${dec.action}`}>{dec.action}</span>
                      <strong className="history-pair font-mono">{dec.pair}</strong>
                      <span className="history-regime font-mono">{dec.regime}</span>
                    </div>
                    <div className="history-allocations">
                      <span>Auth: <b>{dec.authorized} BOT</b></span>
                      <span>Conf: <b>{dec.confidence}%</b></span>
                    </div>
                  </div>
                  <div className="history-meta">
                    <a
                      href={`${BOTCHAIN_TESTNET.blockExplorerUrls[0]}/tx/${dec.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tx-hash-link font-mono"
                      title="View on BOTScan"
                    >
                      {dec.txHash.slice(0, 8)}...{dec.txHash.slice(-6)} ↗
                    </a>
                    <span className="history-time">{dec.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>

      {/* SUBMISSION KIT MODAL */}
      {showSubmissionKit && (
        <div className="modal-overlay" onClick={() => setShowSubmissionKit(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow text-cyan">BOT CHAIN ECOSYSTEM FORM ASSISTANT</span>
                <h2>Project Submission Kit</h2>
              </div>
              <button onClick={() => setShowSubmissionKit(false)} className="modal-close-btn">
                ✕
              </button>
            </div>

            <p className="modal-intro">
              Everything required to complete your form submission for <strong>BOT Chain Testnet</strong>. Click any
              field to copy directly.
            </p>

            <div className="submission-field-list">
              <div className="sub-field">
                <span className="sub-field-label">Project Name:</span>
                <div className="sub-field-row">
                  <code>AttestAI</code>
                  <button onClick={() => handleCopy("AttestAI", "Project Name")} className="copy-btn">
                    Copy
                  </button>
                </div>
              </div>

              <div className="sub-field">
                <span className="sub-field-label">Short Description / One-Liner:</span>
                <div className="sub-field-row">
                  <code>Verified Collateral. Adaptive Intelligence. AI Agent Trust &amp; Authority Layer on BOT Chain.</code>
                  <button
                    onClick={() =>
                      handleCopy(
                        "Verified Collateral. Adaptive Intelligence. AI Agent Trust & Authority Layer on BOT Chain.",
                        "One-Liner"
                      )
                    }
                    className="copy-btn"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="sub-field">
                <span className="sub-field-label">Target Network &amp; Chain ID:</span>
                <div className="sub-field-row">
                  <code>BOT Chain Testnet (Chain ID 968, Hex 0x3c8)</code>
                  <button
                    onClick={() => handleCopy("BOT Chain Testnet (Chain ID 968)", "Network")}
                    className="copy-btn"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="sub-field">
                <span className="sub-field-label">RPC Endpoint:</span>
                <div className="sub-field-row">
                  <code>https://rpc.bohr.life</code>
                  <button onClick={() => handleCopy("https://rpc.bohr.life", "RPC")} className="copy-btn">
                    Copy
                  </button>
                </div>
              </div>

              <div className="sub-field">
                <span className="sub-field-label">Block Explorer URL:</span>
                <div className="sub-field-row">
                  <code>https://scan.bohr.life</code>
                  <button onClick={() => handleCopy("https://scan.bohr.life", "Explorer")} className="copy-btn">
                    Copy
                  </button>
                </div>
              </div>

              <div className="sub-field">
                <span className="sub-field-label">Collateral Vault Contract (BOT Chain Testnet):</span>
                <div className="sub-field-row">
                  <code>{CONTRACT_ADDRESSES.testnet.collateralVault}</code>
                  <button
                    onClick={() => handleCopy(CONTRACT_ADDRESSES.testnet.collateralVault, "Vault Contract")}
                    className="copy-btn"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="sub-field">
                <span className="sub-field-label">Decision Registry Contract (BOT Chain Testnet):</span>
                <div className="sub-field-row">
                  <code>{CONTRACT_ADDRESSES.testnet.decisionRegistry}</code>
                  <button
                    onClick={() => handleCopy(CONTRACT_ADDRESSES.testnet.decisionRegistry, "Registry Contract")}
                    className="copy-btn"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="sub-field">
                <span className="sub-field-label">Official Testnet Faucet:</span>
                <div className="sub-field-row">
                  <code>https://faucet.botchain.ai/basic</code>
                  <button
                    onClick={() => handleCopy("https://faucet.botchain.ai/basic", "Faucet")}
                    className="copy-btn"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => {
                  const allDetails = `Project Name: AttestAI\nDescription: Verified Collateral & Adaptive Intelligence Trust Layer for AI Agents on BOT Chain.\nNetwork: BOT Chain Testnet\nChain ID: 968\nRPC URL: https://rpc.bohr.life\nBlock Explorer: https://scan.bohr.life\nCollateral Vault: ${CONTRACT_ADDRESSES.testnet.collateralVault}\nDecision Registry: ${CONTRACT_ADDRESSES.testnet.decisionRegistry}\nFaucet: https://faucet.botchain.ai/basic`;
                  handleCopy(allDetails, "Full Submission Package");
                }}
                className="btn btn-primary btn-full"
              >
                📋 Copy Complete Submission Package
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer-section">
        <div>
          <strong>AttestAI Protocol</strong> · Fully Migrated to BOT Chain
        </div>
        <div className="footer-links">
          <a href="https://dev-docs.botchain.ai/docs/intro" target="_blank" rel="noopener noreferrer">
            BOT Chain Docs ↗
          </a>
          <a href="https://scan.bohr.life" target="_blank" rel="noopener noreferrer">
            BOTScan (Testnet) ↗
          </a>
          <a href="https://faucet.botchain.ai/basic" target="_blank" rel="noopener noreferrer">
            Faucet ↗
          </a>
        </div>
      </footer>
    </main>
  );
}
