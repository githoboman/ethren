export interface NetworkConfig {
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

// Deployed AttestAI Contracts on BOT Chain Testnet
export const CONTRACT_ADDRESSES = {
  testnet: {
    collateralVault: "0x31b1B13bbe6aABE678083E3525042e52172619D2",
    decisionRegistry: "0xb0F7D964e32287958FD5E89dEf5A13b1C2d1d066",
    signalEmitter: "0xD805B37516b5474d754C49052223487a09BBF263",
  },
  mainnet: {
    collateralVault: "0x0000000000000000000000000000000000000000",
    decisionRegistry: "0x0000000000000000000000000000000000000000",
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
 * Fetch live block number directly from BOT Chain Testnet RPC
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
export async function fetchBotBalance(address: string, rpcUrl = BOTCHAIN_TESTNET.rpcUrls[0]): Promise<string> {
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
 * Request Ethereum wallet to add or switch to BOT Chain Testnet
 */
export async function switchOrAddBotChainTestnet(provider: any): Promise<boolean> {
  if (!provider) return false;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BOTCHAIN_TESTNET.chainIdHex }],
    });
    return true;
  } catch (switchError: any) {
    // 4902 indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: BOTCHAIN_TESTNET.chainIdHex,
              chainName: BOTCHAIN_TESTNET.chainName,
              rpcUrls: BOTCHAIN_TESTNET.rpcUrls,
              nativeCurrency: BOTCHAIN_TESTNET.nativeCurrency,
              blockExplorerUrls: BOTCHAIN_TESTNET.blockExplorerUrls,
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Failed to add BOT Chain Testnet:", addError);
        return false;
      }
    }
    console.error("Failed to switch to BOT Chain Testnet:", switchError);
    return false;
  }
}
