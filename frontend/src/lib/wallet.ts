import { studionet } from 'genlayer-js/chains';

const CHAIN_ID_HEX = "0x" + studionet.id.toString(16);

declare global {
  interface Window {
    ethereum?: any;
  }
}

export async function ensureStudionet(): Promise<void> {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install MetaMask to use PeerCoin.");
  }
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (err: any) {
    if (err.code === 4902 || err.code === -32603) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: CHAIN_ID_HEX,
          chainName: "Genlayer Studio Network",
          nativeCurrency: { name: "GEN Token", symbol: "GEN", decimals: 18 },
          rpcUrls: ["https://studio.genlayer.com/api"],
          blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
        }],
      });
    } else {
      throw err;
    }
  }
}

export async function connectWallet(): Promise<`0x${string}`> {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed.");
  }
  const [addr] = await window.ethereum.request({ method: "eth_requestAccounts" });
  await ensureStudionet();
  return addr as `0x${string}`;
}
