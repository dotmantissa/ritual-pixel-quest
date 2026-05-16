import { BrowserProvider, toUtf8Bytes, hexlify } from "ethers";

export const RITUAL_CHAIN = {
  chainIdHex: "0x7BB", // 1979
  chainId: 1979,
  chainName: "Ritual",
  nativeCurrency: { name: "Ritual", symbol: "RITUAL", decimals: 18 },
  rpcUrls: ["https://rpc.ritualfoundation.org"],
  blockExplorerUrls: ["https://explorer.ritualfoundation.org"],
};

declare global {
  interface Window {
    ethereum?: any;
  }
}

export async function ensureRitualNetwork() {
  if (!window.ethereum) throw new Error("No wallet found. Install MetaMask.");
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: RITUAL_CHAIN.chainIdHex }],
    });
  } catch (err: any) {
    if (err.code === 4902 || /Unrecognized chain/i.test(err.message ?? "")) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: RITUAL_CHAIN.chainIdHex,
            chainName: RITUAL_CHAIN.chainName,
            nativeCurrency: RITUAL_CHAIN.nativeCurrency,
            rpcUrls: RITUAL_CHAIN.rpcUrls,
            blockExplorerUrls: RITUAL_CHAIN.blockExplorerUrls,
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

export async function connectWallet() {
  if (!window.ethereum) throw new Error("No wallet found. Install MetaMask.");
  await ensureRitualNetwork();
  const provider = new BrowserProvider(window.ethereum);
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const signer = await provider.getSigner();
  return { provider, signer, address: accounts[0] as string };
}

// Store a puzzle result onchain by sending a 0-value self-tx whose calldata
// encodes the score payload. Permanent, verifiable, no contract needed.
export async function storeResultOnChain(payload: {
  character: string;
  moves: number;
  timeMs: number;
  size: number;
}) {
  const { signer, address } = await connectWallet();
  const message = JSON.stringify({ app: "ritual-puzzle", v: 1, ...payload, ts: Date.now() });
  const data = hexlify(toUtf8Bytes(message));
  const tx = await signer.sendTransaction({
    to: address,
    value: 0n,
    data,
  });
  return { hash: tx.hash, message };
}