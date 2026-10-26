export interface NetworkConfig {
  key: "testnet" | "mainnet";
  chainId: number;
  chainIdHex: string;
  chainName: string;
  rpcUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrls: string[];
  faucetUrl?: string;
  dexUrl?: string;
}

export const BOTCHAIN_TESTNET: NetworkConfig = {
  key: "testnet",
  chainId: 968,
  chainIdHex: "0x3c8",
  chainName: "BOT Chain Testnet",
  rpcUrls: ["https://rpc.bohr.life"],
  nativeCurrency: {
    name: "BOT",
    symbol: "BOT",
    decimals: 18,
  },
  blockExplorerUrls: ["https://scan.bohr.life"],
  faucetUrl: "https://faucet.botchain.ai/basic",
};

export const BOTCHAIN_MAINNET: NetworkConfig = {
  key: "mainnet",
  chainId: 677,
  chainIdHex: "0x2a5",
  chainName: "BOT Chain Mainnet",
  rpcUrls: ["https://rpc.botchain.ai"],
  nativeCurrency: {
    name: "BOT",
    symbol: "BOT",
    decimals: 18,
  },
  blockExplorerUrls: ["https://scan.botchain.ai"],
  dexUrl: "https://dex.botchain.ai/#/swap",
};

export const SUPPORTED_NETWORKS: Record<"testnet" | "mainnet", NetworkConfig> = {
  testnet: BOTCHAIN_TESTNET,
  mainnet: BOTCHAIN_MAINNET,
};

// Deployed AttestAI Contracts on BOT Chain (Testnet & Mainnet)
export const CONTRACT_ADDRESSES = {
  testnet: {
    collateralVault:
      process.env.NEXT_PUBLIC_BOTCHAIN_TESTNET_COLLATERAL_VAULT ||
      "0x31b1B13bbe6aABE678083E3525042e52172619D2",
    decisionRegistry:
      process.env.NEXT_PUBLIC_BOTCHAIN_TESTNET_DECISION_REGISTRY ||
      "0xb0F7D964e32287958FD5E89dEf5A13b1C2d1d066",
    signalEmitter:
      process.env.NEXT_PUBLIC_BOTCHAIN_TESTNET_SIGNAL_EMITTER ||
      "0xD805B37516b5474d754C49052223487a09BBF263",
  },
  mainnet: {
    collateralVault:
      process.env.NEXT_PUBLIC_BOTCHAIN_MAINNET_COLLATERAL_VAULT ||
      "0x55A19A2b3d8B45BB068A57b9197A7eFdf833e978",
    decisionRegistry:
      process.env.NEXT_PUBLIC_BOTCHAIN_MAINNET_DECISION_REGISTRY ||
      "0x31b1B13bbe6aABE678083E3525042e52172619D2",
    signalEmitter:
      process.env.NEXT_PUBLIC_BOTCHAIN_MAINNET_SIGNAL_EMITTER ||
      "0xb0F7D964e32287958FD5E89dEf5A13b1C2d1d066",
  },
};

// Vault ABI interface functions
export const VAULT_ABI = [
  "function deposit() external payable returns (uint256 nonce)",
  "function withdraw(uint256 amount) external returns (uint256 nonce)",
  "function collateral(address) external view returns (uint256)",
  "function nextNonce(address) external view returns (uint256)",
  "event CollateralDeposited(address indexed owner, address indexed asset, uint256 indexed nonce, uint256 amount)",
  "event CollateralWithdrawn(address indexed owner, address indexed asset, uint256 indexed nonce, uint256 amount)",
];

// Decision Registry ABI interface
export const REGISTRY_ABI = [
  "function depositCollateral() external payable returns (uint256)",
  "function withdrawCollateral(uint256 amount) external returns (uint256)",
  "function recordDecision(string assetPair, uint8 regime, uint8 action, uint8 confidence, uint8 riskScore, uint256 requestedAllocation, string reasoning) external returns (bytes32, bool, uint256)",
  "function getAuthorityBudget(address operator) external view returns (uint256)",
  "function verifiedCollateral(address operator) external view returns (uint256)",
  "function getOperatorProfile(address operator) external view returns (uint256 collateral, uint256 authorityBudget, uint256 maxPerTradeCap)",
  "event DecisionRecorded(bytes32 indexed decisionId, address indexed operator, string assetPair, uint8 regime, uint8 action, uint8 confidence, uint256 authorizedAllocation, bool guardrailPassed, uint256 timestamp)",
];

/**
 * Identify network config based on chainId or fallback to testnet
 */
export function getNetworkConfig(chainIdOrKey?: number | string | null): NetworkConfig {
  if (chainIdOrKey === 677 || chainIdOrKey === "0x2a5" || chainIdOrKey === "mainnet") {
    return BOTCHAIN_MAINNET;
  }
  return BOTCHAIN_TESTNET;
}

/**
 * Fetch live block number directly from BOT Chain RPC
 */
export async function fetchLiveBlockNumber(rpcUrl = BOTCHAIN_TESTNET.rpcUrls[0]): Promise<number> {
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_blockNumber",
        params: [],
        id: 1,
      }),
    });
    const data = await res.json();
    if (data.result) {
      return parseInt(data.result, 16);
    }
  } catch (err) {
    console.warn("Could not fetch block number from RPC:", err);
  }
  return 27526130; // fallback recent block
}

/**
 * Fetch native BOT balance for an address
 */
export async function fetchBotBalance(
  address: string,
  rpcUrl = BOTCHAIN_TESTNET.rpcUrls[0]
): Promise<string> {
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [address, "latest"],
        id: 2,
      }),
    });
    const data = await res.json();
    if (data.result) {
      const wei = BigInt(data.result);
      const ethVal = Number(wei) / 1e18;
      return ethVal.toFixed(4);
    }
  } catch (err) {
    console.warn("Could not fetch balance:", err);
  }
  return "0.0000";
}

/**
 * Request Ethereum wallet to add or switch to a BOT Chain network
 */
export async function switchOrAddBotChain(
  provider: any,
  networkKey: "testnet" | "mainnet" = "testnet"
): Promise<boolean> {
  if (!provider) return false;
  const config = networkKey === "mainnet" ? BOTCHAIN_MAINNET : BOTCHAIN_TESTNET;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: config.chainIdHex }],
    });
    return true;
  } catch (switchError: any) {
    // 4902 indicates that the chain has not been added to the wallet
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: config.chainIdHex,
              chainName: config.chainName,
              rpcUrls: config.rpcUrls,
              nativeCurrency: config.nativeCurrency,
              blockExplorerUrls: config.blockExplorerUrls,
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error(`Failed to add ${config.chainName}:`, addError);
        return false;
      }
    }
    console.error(`Failed to switch to ${config.chainName}:`, switchError);
    return false;
  }
}

/**
 * Convenience helper to switch/add BOT Chain Testnet
 */
export async function switchOrAddBotChainTestnet(provider: any): Promise<boolean> {
  return switchOrAddBotChain(provider, "testnet");
}

/**
 * Convenience helper to switch/add BOT Chain Mainnet
 */
export async function switchOrAddBotChainMainnet(provider: any): Promise<boolean> {
  return switchOrAddBotChain(provider, "mainnet");
}
