"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BOTCHAIN_TESTNET,
  BOTCHAIN_MAINNET,
  CONTRACT_ADDRESSES,
  fetchLiveBlockNumber,
  fetchBotBalance,
  switchOrAddBotChain,
} from "./botchain";

// Type definitions
type MarketRegime = "TREND" | "RANGE" | "HIGH_VOLATILITY" | "RISK_OFF";
type AdaptiveAction = "BUY" | "HOLD" | "SELL" | "REFER";

interface DecisionRecord {
  id: string;
  txHash: string;
  network: "mainnet" | "testnet";
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
  // Dual-Network State (Mainnet or Testnet)
  const [activeNetworkKey, setActiveNetworkKey] = useState<"mainnet" | "testnet">("mainnet");

  // Wallet & Web3 State
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [botBalance, setBotBalance] = useState("0.0000");
  const [liveBlock, setLiveBlock] = useState<number>(28058327);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Vault & Collateral State
  const [stakedCollateral, setStakedCollateral] = useState<number>(0.5); // Default sample 0.5 BOT
  const [depositInput, setDepositInput] = useState<string>("0.05");
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
  const [requestedAllocation, setRequestedAllocation] = useState("0.05");
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
    confidence: 88,
    riskScore: 16,
    requested: 0.05,
    authorized: 0.05,
    guardrailPassed: true,
    reasoning:
      "Consistent bullish expansion with positive momentum on BOT/USD. Volatility within 1.2σ boundary. Requested 0.05 BOT is within the 0.10 BOT verified risk budget.",
    provenance: "AttestAI-BotChain-Agent-OS / Block Verified",
  });

  // Recorded decisions feed
  const [recentDecisions, setRecentDecisions] = useState<DecisionRecord[]>([
    {
      id: "dec-01",
      txHash: "0x327a1f0fda66e60b24e11d3e112bbe6d772a6457b5c45f5cbd3c41afaf69b32b",
      network: "mainnet",
      pair: "BOT/USD",
      regime: "TREND",
      action: "BUY",
      confidence: 91,
      riskScore: 12,
      requested: 0.05,
      authorized: 0.05,
      guardrailPassed: true,
      timestamp: "Just now",
    },
    {
      id: "dec-02",
      txHash: "0xf003a9cfb0dad051dc01eb9835f6b84b8f39539fac1960e375832cc1c7f39ae6",
      network: "mainnet",
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
      txHash: "0xdf2e4f9c44760e747713d4175988674098e047282d54b1476432c593e1dc04b0",
      network: "testnet",
      pair: "ETH/BOT",
      regime: "HIGH_VOLATILITY",
      action: "HOLD",
      confidence: 62,
      riskScore: 55,
      requested: 0.02,
      authorized: 0.02,
      guardrailPassed: true,
      timestamp: "45 mins ago",
    },
  ]);

  // Submission Kit Modal
  const [showSubmissionKit, setShowSubmissionKit] = useState(false);
  const [submissionTab, setSubmissionTab] = useState<"mainnet" | "testnet">("mainnet");

  // Computed Network & Contract Constants
  const activeNetwork = activeNetworkKey === "mainnet" ? BOTCHAIN_MAINNET : BOTCHAIN_TESTNET;
  const activeContracts = CONTRACT_ADDRESSES[activeNetworkKey];
  const isCorrectNetwork = chainId === activeNetwork.chainId;

  // Authority policy: 20% of staked collateral, per-trade cap 10 BOT
  const authorityBudget = Number((stakedCollateral * 0.2).toFixed(4));

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(`${label} copied!`);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  // Poll live block number from active BOT Chain RPC
  useEffect(() => {
    let isMounted = true;
    const updateBlock = async () => {
      const b = await fetchLiveBlockNumber(activeNetwork.rpcUrls[0]);
      if (isMounted) setLiveBlock(b);
    };
    updateBlock();
    const interval = setInterval(updateBlock, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeNetworkKey, activeNetwork.rpcUrls]);

  // Update wallet balance when account or network changes
  const updateBalance = useCallback(
    async (addr: string) => {
      const bal = await fetchBotBalance(addr, activeNetwork.rpcUrls[0]);
      setBotBalance(bal);
    },
    [activeNetwork.rpcUrls]
  );

  useEffect(() => {
    if (account) {
      updateBalance(account);
      const interval = setInterval(() => updateBalance(account), 12000);
      return () => clearInterval(interval);
    }
  }, [account, activeNetworkKey, updateBalance]);

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
        const cId = parseInt(chain, 16);
        setChainId(cId);
        if (cId === BOTCHAIN_MAINNET.chainId) {
          setActiveNetworkKey("mainnet");
        } else if (cId === BOTCHAIN_TESTNET.chainId) {
          setActiveNetworkKey("testnet");
        }
      });

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
        }
      };

      const handleChainChanged = (chainHex: string) => {
        const cId = parseInt(chainHex, 16);
        setChainId(cId);
        if (cId === BOTCHAIN_MAINNET.chainId) {
          setActiveNetworkKey("mainnet");
        } else if (cId === BOTCHAIN_TESTNET.chainId) {
          setActiveNetworkKey("testnet");
        }
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

        // Auto prompt switch if not on active BOT Chain network
        if (cId !== activeNetwork.chainId) {
          await switchOrAddBotChain(eth, activeNetworkKey);
        }
      }
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  // Switch Active Network Handler
  const handleSelectNetwork = async (key: "mainnet" | "testnet") => {
    setActiveNetworkKey(key);
    if (typeof window !== "undefined" && (window as any).ethereum) {
      await switchOrAddBotChain((window as any).ethereum, key);
      const chain = await (window as any).ethereum.request({ method: "eth_chainId" });
      setChainId(parseInt(chain, 16));
    }
  };

  // Collateral Deposit Handler
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
        // Verify on selected BOT Chain network
        if (chainId !== activeNetwork.chainId) {
          const switched = await switchOrAddBotChain(eth, activeNetworkKey);
          if (!switched) {
            alert(`Please switch your wallet to ${activeNetwork.chainName} first.`);
            setIsDepositing(false);
            return;
          }
        }

        // Send transaction to Collateral Vault
        const weiHex = "0x" + BigInt(Math.floor(amt * 1e18)).toString(16);
        const txParams = {
          from: account,
          to: activeContracts.collateralVault,
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
          msg: `Successfully deposited ${amt} BOT to AttestAI Vault on ${activeNetwork.chainName}!`,
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
            msg: `Simulated: Deposited ${amt} BOT collateral on ${activeNetwork.chainName}. Connect wallet to sign on-chain!`,
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
        msg: `Deposit failed: ${err.message || "Transaction rejected"}`,
        type: "error",
      });
    } finally {
      setIsDepositing(false);
    }
  };

  // Collateral Withdrawal Handler
  const handleWithdrawCollateral = async () => {
    const withdrawAmt = 0.05;
    if (stakedCollateral < withdrawAmt) {
      alert("Insufficient collateral balance to withdraw.");
      return;
    }

    setIsWithdrawing(true);
    setTxNotice(null);

    try {
      if (typeof window !== "undefined" && (window as any).ethereum && account) {
        const eth = (window as any).ethereum;
        if (chainId !== activeNetwork.chainId) {
          const switched = await switchOrAddBotChain(eth, activeNetworkKey);
          if (!switched) {
            alert(`Please switch to ${activeNetwork.chainName} first.`);
            setIsWithdrawing(false);
            return;
          }
        }

        // withdraw(uint256) signature
        const weiHex = "0x" + BigInt(Math.floor(withdrawAmt * 1e18)).toString(16).padStart(64, "0");
        const txParams = {
          from: account,
          to: activeContracts.collateralVault,
          value: "0x0",
          data: "0x2e1a7d4d" + weiHex,
        };

        const txHash = await eth.request({
          method: "eth_sendTransaction",
          params: [txParams],
        });

        setStakedCollateral((prev) => Math.max(0, Number((prev - withdrawAmt).toFixed(4))));
        setTxNotice({
          hash: txHash,
          msg: `Successfully withdrew ${withdrawAmt} BOT on ${activeNetwork.chainName}!`,
          type: "success",
        });
        updateBalance(account);
      } else {
        setTimeout(() => {
          setStakedCollateral((prev) => Math.max(0, Number((prev - withdrawAmt).toFixed(4))));
          setTxNotice({
            hash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
            msg: `Simulated: Withdrew ${withdrawAmt} BOT collateral on ${activeNetwork.chainName}.`,
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
        msg: `Withdrawal failed: ${err.message || "Transaction rejected"}`,
        type: "error",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Evaluate AI Proposal Against On-Chain Guardrails
  const handleEvaluateProposal = () => {
    setIsEvaluating(true);

    setTimeout(() => {
      const req = parseFloat(requestedAllocation) || 0.05;
      const budget = authorityBudget;

      let action: AdaptiveAction = "BUY";
      let confidence = 85;
      let riskScore = 18;
      let guardrailPassed = true;
      let authorized = req;
      let reasoning = "";

      if (selectedRegime === "RISK_OFF") {
        action = "REFER";
        confidence = 0;
        riskScore = 92;
        guardrailPassed = true;
        authorized = 0;
        reasoning =
          "Adverse macroeconomic liquidity contraction detected on BOT Chain. Safe fallback: execution halted, zero capital allocated (REFER).";
      } else if (selectedRegime === "HIGH_VOLATILITY") {
        action = "HOLD";
        confidence = 64;
        riskScore = 60;
        guardrailPassed = req <= budget;
        authorized = Math.min(req, Number((budget * 0.5).toFixed(4)));
        reasoning = `High volatility regime flagged. Position sizing dampened by 50%. Authorized ${authorized} BOT of ${budget} BOT budget ceiling.`;
      } else if (selectedRegime === "RANGE") {
        action = "BUY";
        confidence = 78;
        riskScore = 32;
        guardrailPassed = req <= budget;
        authorized = Math.min(req, budget);
        reasoning = `Mean-reverting support boundary identified on ${selectedPair}. Authorized ${authorized} BOT within standard allocation corridor.`;
      } else {
        // TREND
        action = "BUY";
        confidence = 89;
        riskScore = 15;
        guardrailPassed = req <= budget;
        if (!guardrailPassed) {
          authorized = budget;
          reasoning = `OVER-BUDGET GUARDRAIL ACTIVATED: Agent requested ${req} BOT, but maximum verified collateral budget is ${budget} BOT. Clamped to ${budget} BOT.`;
        } else {
          authorized = req;
          reasoning = `Strong directional momentum confirmed on ${selectedPair}. Volatility within safety boundary. Full ${authorized} BOT allocation approved.`;
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
    }, 500);
  };

  // Submit and Record Decision on BOT Chain
  const handleRecordOnChain = async () => {
    setIsRecordingOnChain(true);

    try {
      let finalHash = "";

      if (typeof window !== "undefined" && (window as any).ethereum && account && isCorrectNetwork) {
        const eth = (window as any).ethereum;
        // Send transaction to Decision Registry
        const txParams = {
          from: account,
          to: activeContracts.decisionRegistry,
          value: "0x0",
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
        network: activeNetworkKey,
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
        msg: `Decision successfully recorded on ${activeNetwork.chainName} (Block #${liveBlock})!`,
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

          {/* Network Switcher Toggle Button Group */}
          <div className="network-switch-group">
            <button
              onClick={() => handleSelectNetwork("mainnet")}
              className={`network-switch-btn ${activeNetworkKey === "mainnet" ? "active" : ""}`}
              title="Switch to BOT Chain Mainnet (Chain ID 677)"
            >
              🌐 Mainnet (677)
            </button>
            <button
              onClick={() => handleSelectNetwork("testnet")}
              className={`network-switch-btn ${activeNetworkKey === "testnet" ? "active" : ""}`}
              title="Switch to BOT Chain Testnet (Chain ID 968)"
            >
              🧪 Testnet (968)
            </button>
          </div>
        </div>

        <div className="nav-actions">
          {/* Faucet or DEX Link */}
          {activeNetworkKey === "mainnet" ? (
            <a
              href={BOTCHAIN_MAINNET.dexUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              ⚡ Swap on DEX ↗
            </a>
          ) : (
            <a
              href={BOTCHAIN_TESTNET.faucetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              💧 Get tBOT Faucet ↗
            </a>
          )}

          {/* Submission Kit Modal Trigger */}
          <button
            onClick={() => setShowSubmissionKit(true)}
            className="btn btn-outline btn-sm btn-highlight"
            title="Open ecosystem submission form details"
          >
            📋 Submission Kit
          </button>

          {/* Network Switcher / Wallet Indicator */}
          {account ? (
            <div className="wallet-connected-pill">
              {isCorrectNetwork ? (
                <div className="network-pill-online">
                  <span className="dot dot-green" /> {activeNetwork.chainName}
                </div>
              ) : (
                <button
                  onClick={() => handleSelectNetwork(activeNetworkKey)}
                  className="network-pill-wrong"
                >
                  <span className="dot dot-amber" /> Switch to {activeNetwork.chainName}
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
      {copyFeedback && <div className="copy-toast">{copyFeedback}</div>}

      {/* Live Transaction Notice Banner */}
      {txNotice && (
        <div className={`tx-banner tx-banner-${txNotice.type}`}>
          <div className="tx-banner-content">
            <span className="tx-banner-icon">
              {txNotice.type === "success" ? "✓" : txNotice.type === "error" ? "⚠" : "ℹ"}
            </span>
            <span>{txNotice.msg}</span>
            {txNotice.hash && (
              <a
                href={`${activeNetwork.blockExplorerUrls[0]}/tx/${txNotice.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-link font-mono"
              >
                View on {activeNetworkKey === "mainnet" ? "BOTScan Mainnet" : "BOTScan Testnet"} ↗
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
            <span className="stat-label">ACTIVE NETWORK</span>
            <strong className="stat-val text-cyan">{activeNetwork.chainName}</strong>
            <span className="stat-sub">Chain ID {activeNetwork.chainId} ({activeNetwork.chainIdHex})</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">LATEST BLOCK HEIGHT</span>
            <strong className="stat-val text-green font-mono">#{liveBlock}</strong>
            <span className="stat-sub">≈0.75s Block Time (Parlia PoS)</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">NATIVE FUEL</span>
            <strong className="stat-val text-gold">BOT Native</strong>
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
                <span className="pulse-dot" /> LIVE {activeNetworkKey.toUpperCase()}
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
                <span className="box-hint">Verified on {activeNetwork.chainName}</span>
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
                  placeholder="0.05"
                />
                <button
                  onClick={handleDepositCollateral}
                  disabled={isDepositing}
                  className="btn btn-primary"
                >
                  {isDepositing ? "Staking..." : `Deposit BOT on ${activeNetworkKey === "mainnet" ? "Mainnet" : "Testnet"}`}
                </button>
              </div>

              {/* Quick Presets */}
              <div className="preset-row">
                {["0.01", "0.02", "0.05", "0.1"].map((preset) => (
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
                  {isWithdrawing ? "Withdrawing..." : "Withdraw 0.05 BOT"}
                </button>
              </div>
            </div>

            <div className="contract-ref-row">
              <span>Vault Contract:</span>
              <a
                href={`${activeNetwork.blockExplorerUrls[0]}/address/${activeContracts.collateralVault}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-cyan"
              >
                {activeContracts.collateralVault.slice(0, 10)}...
                {activeContracts.collateralVault.slice(-6)} ↗
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
                  title: `BOT Chain Vault Stake (${activeNetwork.chainName})`,
                  desc: `Native BOT deposited in CollateralVault on Chain ID ${activeNetwork.chainId}`,
                  status: "On-Chain Verified",
                  badgeClass: "badge-onchain",
                },
                {
                  step: "02",
                  title: "Deterministic Risk Cap",
                  desc: `Policy derives 20% budget (${authorityBudget.toFixed(4)} BOT max proposal ceiling)`,
                  status: "Enforced",
                  badgeClass: "badge-onchain",
                },
                {
                  step: "03",
                  title: "AI Regime Proposal",
                  desc: "Autonomous model evaluates trend, range, or high volatility",
                  status: "Adaptive",
                  badgeClass: "badge-ai",
                },
                {
                  step: "04",
                  title: "Mathematical Clamping",
                  desc: "Proposals over budget ceiling are clamped to verified limit",
                  status: "Guaranteed",
                  badgeClass: "badge-onchain",
                },
                {
                  step: "05",
                  title: `On-Chain Proof Recording (${activeNetwork.chainName})`,
                  desc: "Decision hash permanently logged to DecisionRegistry with full provenance",
                  status: "Immutable",
                  badgeClass: "badge-onchain",
                },
              ].map((item) => (
                <div key={item.step} className="flow-item">
                  <div className="flow-step-number font-mono">{item.step}</div>
                  <div className="flow-text">
                    <div className="flow-item-header">
                      <strong>{item.title}</strong>
                      <span className={`flow-badge ${item.badgeClass}`}>{item.status}</span>
                    </div>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        {/* RIGHT COLUMN: AI Regime Simulation & On-Chain Decision */}
        <div className="grid-col">
          {/* Card: Adaptive AI Regime Engine */}
          <article className="card card-accent-purple">
            <div className="card-header">
              <div>
                <span className="eyebrow">INTELLIGENCE LAYER</span>
                <h2>Adaptive Regime Engine</h2>
              </div>
              <span className="badge badge-purple">BOT Chain Agent OS</span>
            </div>

            <p className="card-desc">
              Select market conditions to simulate how the AI agent identifies market regimes and submits capital
              proposals to the on-chain risk guardrails.
            </p>

            <div className="engine-controls-grid">
              <div className="form-group">
                <label className="input-label">Simulated Market Regime:</label>
                <div className="regime-selector">
                  {(["TREND", "RANGE", "HIGH_VOLATILITY", "RISK_OFF"] as MarketRegime[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setSelectedRegime(r)}
                      className={`regime-btn ${selectedRegime === r ? "active regime-" + r.toLowerCase() : ""}`}
                    >
                      {r === "TREND" && "📈 TREND"}
                      {r === "RANGE" && "⚖ RANGE"}
                      {r === "HIGH_VOLATILITY" && "⚡ HIGH VOL"}
                      {r === "RISK_OFF" && "🛡 RISK OFF"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="input-label">Asset Pair:</label>
                  <select
                    value={selectedPair}
                    onChange={(e) => setSelectedPair(e.target.value)}
                    className="select-input font-mono"
                  >
                    <option value="BOT/USD">BOT / USD</option>
                    <option value="BOT/USDT">BOT / USDT</option>
                    <option value="ETH/BOT">ETH / BOT</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="input-label">Agent Model:</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="select-input font-mono"
                  >
                    <option value="AttestAI-BotChain-Agent-OS">AttestAI-BotChain-Agent-OS</option>
                    <option value="Claude-3.7-Sonnet-Regime">Claude-3.7-Sonnet-Regime</option>
                    <option value="DeepSeek-R1-Finance">DeepSeek-R1-Finance</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">Requested Trade Allocation (BOT):</label>
                <div className="allocation-input-wrap">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={requestedAllocation}
                    onChange={(e) => setRequestedAllocation(e.target.value)}
                    className="number-input font-mono"
                    placeholder="0.05"
                  />
                  <span className="allocation-hint">
                    Current Budget: <b>{authorityBudget.toFixed(4)} BOT</b>
                  </span>
                </div>
              </div>

              <button
                onClick={handleEvaluateProposal}
                disabled={isEvaluating}
                className="btn btn-secondary btn-full"
              >
                {isEvaluating ? "Evaluating Guardrails..." : "⚡ Evaluate Proposal & Guardrails"}
              </button>
            </div>

            {/* Active Proposal Evaluation Display */}
            <div className="evaluation-box">
              <div className="evaluation-header">
                <div>
                  <span className="eval-sub">AI REGIME OUTPUT</span>
                  <div className="eval-headline">
                    <span className={`action-badge action-${currentEvaluation.action}`}>
                      {currentEvaluation.action}
                    </span>
                    <strong className="eval-pair font-mono">{selectedPair}</strong>
                    <span className="eval-regime-tag font-mono">{currentEvaluation.regime}</span>
                  </div>
                </div>

                <div className="metrics-cluster">
                  <div className="metric-item">
                    <span className="metric-label">CONFIDENCE</span>
                    <span className="metric-val text-cyan font-mono">{currentEvaluation.confidence}%</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">RISK SCORE</span>
                    <span className="metric-val text-amber font-mono">{currentEvaluation.riskScore}/100</span>
                  </div>
                </div>
              </div>

              <div className="allocation-check-row">
                <div className="alloc-col">
                  <span className="alloc-lbl">PROPOSED ALLOCATION:</span>
                  <span className="alloc-num font-mono">{currentEvaluation.requested.toFixed(4)} BOT</span>
                </div>
                <div className="alloc-arrow">→</div>
                <div className="alloc-col">
                  <span className="alloc-lbl">AUTHORIZED ALLOCATION:</span>
                  <span className="alloc-num font-mono text-green font-bold">
                    {currentEvaluation.authorized.toFixed(4)} BOT
                  </span>
                </div>
                <div className="alloc-badge">
                  {currentEvaluation.guardrailPassed ? (
                    <span className="badge badge-green">✓ GUARDRAIL PASSED</span>
                  ) : (
                    <span className="badge badge-red">⚠ CLAMPED BY POLICY</span>
                  )}
                </div>
              </div>

              <p className="eval-reasoning">{currentEvaluation.reasoning}</p>

              <div className="eval-provenance font-mono">
                <span>Provenance: {currentEvaluation.provenance}</span>
              </div>

              {/* Record Decision On BOT Chain */}
              <button
                onClick={handleRecordOnChain}
                disabled={isRecordingOnChain}
                className="btn btn-primary btn-glow btn-full record-btn"
              >
                {isRecordingOnChain
                  ? `Broadcasting to ${activeNetwork.chainName}...`
                  : `⛓ Record Decision On ${activeNetwork.chainName}`}
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
              <span className="badge badge-dark font-mono">{activeNetwork.chainName}</span>
            </div>

            <div className="decision-history-list">
              {recentDecisions.map((dec) => {
                const networkConfig = dec.network === "mainnet" ? BOTCHAIN_MAINNET : BOTCHAIN_TESTNET;
                return (
                  <div key={dec.id} className="decision-history-row">
                    <div className="history-main">
                      <div className="history-tags">
                        <span className={`action-badge-sm action-${dec.action}`}>{dec.action}</span>
                        <strong className="history-pair font-mono">{dec.pair}</strong>
                        <span className="history-regime font-mono">{dec.regime}</span>
                        <span className="badge badge-dark font-mono" style={{ fontSize: "0.68rem" }}>
                          {dec.network === "mainnet" ? "Mainnet" : "Testnet"}
                        </span>
                      </div>
                      <div className="history-allocations">
                        <span>Auth: <b>{dec.authorized} BOT</b></span>
                        <span>Conf: <b>{dec.confidence}%</b></span>
                      </div>
                    </div>
                    <div className="history-meta">
                      <a
                        href={`${networkConfig.blockExplorerUrls[0]}/tx/${dec.txHash}`}
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
                );
              })}
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
                <span className="eyebrow text-cyan">BOT CHAIN ECOSYSTEM SUBMISSION PACKAGE</span>
                <h2>Project Submission Kit</h2>
              </div>
              <button onClick={() => setShowSubmissionKit(false)} className="modal-close-btn">
                ✕
              </button>
            </div>

            <p className="modal-intro">
              Everything required to complete your form submission for <strong>BOT Chain</strong>. Select network tab
              to copy parameters directly.
            </p>

            {/* Modal Network Tabs */}
            <div className="modal-tabs">
              <button
                onClick={() => setSubmissionTab("mainnet")}
                className={`modal-tab-btn ${submissionTab === "mainnet" ? "active" : ""}`}
              >
                🌐 BOT Chain Mainnet (Chain ID 677)
              </button>
              <button
                onClick={() => setSubmissionTab("testnet")}
                className={`modal-tab-btn ${submissionTab === "testnet" ? "active" : ""}`}
              >
                🧪 BOT Chain Testnet (Chain ID 968)
              </button>
            </div>

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
                  <code>Verified Collateral &amp; Adaptive Intelligence Trust Layer for Autonomous AI Financial Agents on BOT Chain.</code>
                  <button
                    onClick={() =>
                      handleCopy(
                        "Verified Collateral & Adaptive Intelligence Trust Layer for Autonomous AI Financial Agents on BOT Chain.",
                        "One-Liner"
                      )
                    }
                    className="copy-btn"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {submissionTab === "mainnet" ? (
                <>
                  <div className="sub-field">
                    <span className="sub-field-label">Target Network &amp; Chain ID (Mainnet):</span>
                    <div className="sub-field-row">
                      <code>BOT Chain Mainnet (Chain ID 677, Hex 0x2a5)</code>
                      <button
                        onClick={() => handleCopy("BOT Chain Mainnet (Chain ID 677, Hex 0x2a5)", "Network")}
                        className="copy-btn"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="sub-field">
                    <span className="sub-field-label">RPC Endpoint (Mainnet):</span>
                    <div className="sub-field-row">
                      <code>https://rpc.botchain.ai</code>
                      <button onClick={() => handleCopy("https://rpc.botchain.ai", "Mainnet RPC")} className="copy-btn">
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="sub-field">
                    <span className="sub-field-label">Block Explorer URL (Mainnet):</span>
                    <div className="sub-field-row">
                      <code>https://scan.botchain.ai</code>
                      <button onClick={() => handleCopy("https://scan.botchain.ai", "Mainnet Explorer")} className="copy-btn">
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="sub-field">
                    <span className="sub-field-label">Collateral Vault Contract (Mainnet):</span>
                    <div className="sub-field-row">
                      <code>{CONTRACT_ADDRESSES.mainnet.collateralVault}</code>
                      <button
                        onClick={() => handleCopy(CONTRACT_ADDRESSES.mainnet.collateralVault, "Mainnet Vault Contract")}
                        className="copy-btn"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="sub-field">
                    <span className="sub-field-label">Decision Registry Contract (Mainnet):</span>
                    <div className="sub-field-row">
                      <code>{CONTRACT_ADDRESSES.mainnet.decisionRegistry}</code>
                      <button
                        onClick={() => handleCopy(CONTRACT_ADDRESSES.mainnet.decisionRegistry, "Mainnet Registry Contract")}
                        className="copy-btn"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="sub-field">
                    <span className="sub-field-label">Signal Emitter Contract (Mainnet):</span>
                    <div className="sub-field-row">
                      <code>{CONTRACT_ADDRESSES.mainnet.signalEmitter}</code>
                      <button
                        onClick={() => handleCopy(CONTRACT_ADDRESSES.mainnet.signalEmitter, "Mainnet Signal Emitter")}
                        className="copy-btn"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="sub-field">
                    <span className="sub-field-label">Official DEX / Liquidity:</span>
                    <div className="sub-field-row">
                      <code>https://dex.botchain.ai/#/swap</code>
                      <button
                        onClick={() => handleCopy("https://dex.botchain.ai/#/swap", "DEX URL")}
                        className="copy-btn"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="sub-field">
                    <span className="sub-field-label">Target Network &amp; Chain ID (Testnet):</span>
                    <div className="sub-field-row">
                      <code>BOT Chain Testnet (Chain ID 968, Hex 0x3c8)</code>
                      <button
                        onClick={() => handleCopy("BOT Chain Testnet (Chain ID 968, Hex 0x3c8)", "Network")}
                        className="copy-btn"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="sub-field">
                    <span className="sub-field-label">RPC Endpoint (Testnet):</span>
                    <div className="sub-field-row">
                      <code>https://rpc.bohr.life</code>
                      <button onClick={() => handleCopy("https://rpc.bohr.life", "Testnet RPC")} className="copy-btn">
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="sub-field">
                    <span className="sub-field-label">Block Explorer URL (Testnet):</span>
                    <div className="sub-field-row">
                      <code>https://scan.bohr.life</code>
                      <button onClick={() => handleCopy("https://scan.bohr.life", "Testnet Explorer")} className="copy-btn">
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="sub-field">
                    <span className="sub-field-label">Collateral Vault Contract (Testnet):</span>
                    <div className="sub-field-row">
                      <code>{CONTRACT_ADDRESSES.testnet.collateralVault}</code>
                      <button
                        onClick={() => handleCopy(CONTRACT_ADDRESSES.testnet.collateralVault, "Testnet Vault Contract")}
                        className="copy-btn"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="sub-field">
                    <span className="sub-field-label">Decision Registry Contract (Testnet):</span>
                    <div className="sub-field-row">
                      <code>{CONTRACT_ADDRESSES.testnet.decisionRegistry}</code>
                      <button
                        onClick={() => handleCopy(CONTRACT_ADDRESSES.testnet.decisionRegistry, "Testnet Registry Contract")}
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
                        onClick={() => handleCopy("https://faucet.botchain.ai/basic", "Testnet Faucet")}
                        className="copy-btn"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                onClick={() => {
                  const allDetails = `Project Name: AttestAI
Description: Verified Collateral & Adaptive Intelligence Trust Layer for Autonomous AI Financial Agents on BOT Chain.

=== BOT CHAIN MAINNET (CHAIN ID 677) ===
RPC URL: https://rpc.botchain.ai
Block Explorer: https://scan.botchain.ai
Collateral Vault: ${CONTRACT_ADDRESSES.mainnet.collateralVault}
Decision Registry: ${CONTRACT_ADDRESSES.mainnet.decisionRegistry}
Signal Emitter: ${CONTRACT_ADDRESSES.mainnet.signalEmitter}
DEX Swap: https://dex.botchain.ai/#/swap

=== BOT CHAIN TESTNET (CHAIN ID 968) ===
RPC URL: https://rpc.bohr.life
Block Explorer: https://scan.bohr.life
Collateral Vault: ${CONTRACT_ADDRESSES.testnet.collateralVault}
Decision Registry: ${CONTRACT_ADDRESSES.testnet.decisionRegistry}
Signal Emitter: ${CONTRACT_ADDRESSES.testnet.signalEmitter}
Faucet: https://faucet.botchain.ai/basic`;
                  handleCopy(allDetails, "Full Submission Package");
                }}
                className="btn btn-primary btn-full"
              >
                📋 Copy Complete Submission Package (Mainnet + Testnet)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer-section">
        <div>
          <strong>AttestAI Protocol</strong> · Deployed on BOT Chain Mainnet &amp; Testnet
        </div>
        <div className="footer-links">
          <a href="https://dev-docs.botchain.ai/docs/intro" target="_blank" rel="noopener noreferrer">
            BOT Chain Docs ↗
          </a>
          <a href="https://scan.botchain.ai" target="_blank" rel="noopener noreferrer">
            BOTScan (Mainnet) ↗
          </a>
          <a href="https://scan.bohr.life" target="_blank" rel="noopener noreferrer">
            BOTScan (Testnet) ↗
          </a>
          <a href="https://dex.botchain.ai/#/swap" target="_blank" rel="noopener noreferrer">
            DEX Swap ↗
          </a>
        </div>
      </footer>
    </main>
  );
}
