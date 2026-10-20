import { ethers } from "ethers";

export function createProvider(url: string): ethers.Provider {
  return url.startsWith("ws://") || url.startsWith("wss://")
    ? new ethers.WebSocketProvider(url)
    : new ethers.JsonRpcProvider(url);
}
