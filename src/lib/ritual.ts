import { BrowserProvider, Contract } from "ethers";

export const RITUAL_CHAIN = {
  chainIdHex: "0x7BB", // 1979
  chainId: 1979,
  chainName: "Ritual",
  nativeCurrency: { name: "Ritual", symbol: "RITUAL", decimals: 18 },
  rpcUrls: ["https://rpc.ritualfoundation.org"],
  blockExplorerUrls: ["https://explorer.ritualfoundation.org"],
};

export const PUZZLE_SCORES_ADDRESS =
  "0xd577697B8c8924fc2249eA6197575Db635655006";

export const PUZZLE_SCORES_ABI = [
  "function submitScore(string character, uint32 moves, uint32 timeMs) external",
  "function scoreCount() view returns (uint256)",
  "function getScores(uint256 offset, uint256 limit) view returns (tuple(address player, string character, uint32 moves, uint32 timeMs, uint64 timestamp)[])",
  "event ScoreSubmitted(address indexed player, string character, uint32 moves, uint32 timeMs, uint64 timestamp, uint256 index)",
] as const;

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
  const { signer } = await connectWallet();
  const contract = new Contract(PUZZLE_SCORES_ADDRESS, PUZZLE_SCORES_ABI, signer);
  // Clamp to uint32
  const moves = Math.min(payload.moves, 0xffffffff);
  const timeMs = Math.min(Math.floor(payload.timeMs), 0xffffffff);
  const tx = await contract.submitScore(payload.character, moves, timeMs);
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}