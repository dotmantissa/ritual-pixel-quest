import { useEffect, useMemo, useRef, useState } from "react";
import { connectWallet, storeResultOnChain, RITUAL_CHAIN } from "@/lib/ritual";
import charMage from "@/assets/char-mage.jpeg";
import charShadow from "@/assets/char-shadow.jpeg";
import charSummoner from "@/assets/char-summoner.jpeg";
import charOracle from "@/assets/char-oracle.jpeg";

const CHARACTERS = [
  { id: "mage", name: "The Mage", img: charMage },
  { id: "shadow", name: "The Shadow", img: charShadow },
  { id: "summoner", name: "The Summoner", img: charSummoner },
  { id: "oracle", name: "The Oracle", img: charOracle },
];

const SIZE = 3; // 3x3 sliding puzzle

function makeSolved() {
  return Array.from({ length: SIZE * SIZE }, (_, i) => i);
}
function isSolved(tiles: number[]) {
  return tiles.every((v, i) => v === i);
}
function neighbors(i: number) {
  const r = Math.floor(i / SIZE), c = i % SIZE;
  const out: number[] = [];
  if (r > 0) out.push(i - SIZE);
  if (r < SIZE - 1) out.push(i + SIZE);
  if (c > 0) out.push(i - 1);
  if (c < SIZE - 1) out.push(i + 1);
  return out;
}
function shuffle(): number[] {
  let tiles = makeSolved();
  let empty = tiles.length - 1;
  for (let i = 0; i < 200; i++) {
    const opts = neighbors(empty);
    const pick = opts[Math.floor(Math.random() * opts.length)];
    [tiles[empty], tiles[pick]] = [tiles[pick], tiles[empty]];
    empty = pick;
  }
  if (isSolved(tiles)) return shuffle();
  return tiles;
}

export function PuzzleGame() {
  const [character, setCharacter] = useState(CHARACTERS[0]);
  const [tiles, setTiles] = useState<number[]>(() => shuffle());
  const [moves, setMoves] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [address, setAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submittedRef = useRef(false);

  const won = isSolved(tiles);
  const emptyIndex = tiles.indexOf(tiles.length - 1);

  useEffect(() => {
    if (!startedAt || won) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [startedAt, won]);

  const elapsed = useMemo(() => {
    if (!startedAt) return 0;
    return (won ? now : Date.now()) - startedAt;
  }, [startedAt, now, won]);

  function move(i: number) {
    if (won) return;
    if (!neighbors(emptyIndex).includes(i)) return;
    const next = tiles.slice();
    [next[emptyIndex], next[i]] = [next[i], next[emptyIndex]];
    setTiles(next);
    setMoves((m) => m + 1);
    if (!startedAt) setStartedAt(Date.now());
  }

  function reset(newChar = character) {
    setCharacter(newChar);
    setTiles(shuffle());
    setMoves(0);
    setStartedAt(null);
    setNow(Date.now());
    setTxHash(null);
    setStatus("");
    submittedRef.current = false;
  }

  async function handleConnect() {
    try {
      setBusy(true);
      setStatus("Connecting to Ritual…");
      const { address } = await connectWallet();
      setAddress(address);
      setStatus("Connected.");
    } catch (e: any) {
      setStatus(e.message ?? "Failed to connect");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    try {
      setBusy(true);
      if (window.ethereum?.request) {
        try {
          await window.ethereum.request({
            method: "wallet_revokePermissions",
            params: [{ eth_accounts: {} }],
          });
        } catch {
          // Ignore providers that do not support permission revocation.
        }
      }
      setAddress(null);
      setStatus("Disconnected.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    if (submittedRef.current) return;
    try {
      setBusy(true);
      setStatus("Inscribing your victory onto Ritual…");
      const { hash } = await storeResultOnChain({
        character: character.id,
        moves,
        timeMs: elapsed,
        size: SIZE,
      });
      setTxHash(hash);
      submittedRef.current = true;
      setStatus("Stored onchain. The ritual is sealed.");
    } catch (e: any) {
      setStatus(e.message ?? "Transaction failed");
    } finally {
      setBusy(false);
    }
  }

  const seconds = (elapsed / 1000).toFixed(1);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-10 text-center">
        <p className="mb-3 inline-block rounded-full border border-border bg-card/60 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Ritual · Chain {RITUAL_CHAIN.chainId}
        </p>
        <h1 className="text-5xl font-bold tracking-tight text-glow md:text-6xl">
          The Endless Knot
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
          Restore the sigil. Inscribe your completion permanently onto the Ritual chain.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card/50 p-4 backdrop-blur">
        <div className="flex gap-2">
          {CHARACTERS.map((c) => (
            <button
              key={c.id}
              onClick={() => reset(c)}
              className={`h-12 w-12 overflow-hidden rounded-xl border transition ${
                character.id === c.id
                  ? "border-primary ring-glow"
                  : "border-border opacity-60 hover:opacity-100"
              }`}
              title={c.name}
            >
              <img src={c.img} alt={c.name} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div><span className="text-muted-foreground">Moves </span><span className="font-mono text-primary">{moves}</span></div>
          <div><span className="text-muted-foreground">Time </span><span className="font-mono text-primary">{seconds}s</span></div>
        </div>
        <div className="flex items-center gap-2">
          {address ? (
            <>
              <span className="rounded-lg border border-border bg-background/40 px-3 py-1.5 font-mono text-xs text-primary">
                {address.slice(0, 6)}…{address.slice(-4)}
              </span>
              <button
                onClick={handleDisconnect}
                disabled={busy}
                className="rounded-lg border border-border bg-background/40 px-4 py-1.5 text-sm text-foreground hover:bg-background/80 disabled:opacity-50"
              >
                Disconnect Wallet
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={busy}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              Connect Wallet
            </button>
          )}
          <button
            onClick={() => reset()}
            className="rounded-lg border border-border bg-background/40 px-4 py-1.5 text-sm text-foreground hover:bg-background/80"
          >
            Shuffle
          </button>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_320px]">
        <div className="relative">
          <div
            className={`grid aspect-square w-full overflow-hidden rounded-3xl border border-border bg-card p-2 tile-glow ${won ? "anim-pulse-glow" : ""}`}
            style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gap: "0.5rem" }}
          >
            {tiles.map((tile, idx) => {
              const isEmpty = tile === tiles.length - 1 && !won;
              const row = Math.floor(tile / SIZE);
              const col = tile % SIZE;
              return (
                <button
                  key={idx}
                  onClick={() => move(idx)}
                  className={`relative overflow-hidden rounded-xl transition-transform ${
                    isEmpty ? "bg-background/30" : "ring-1 ring-border hover:scale-[1.02]"
                  }`}
                  style={{
                    backgroundImage: isEmpty ? undefined : `url(${character.img})`,
                    backgroundSize: `${SIZE * 100}% ${SIZE * 100}%`,
                    backgroundPosition: `${(col / (SIZE - 1)) * 100}% ${(row / (SIZE - 1)) * 100}%`,
                  }}
                  aria-label={isEmpty ? "Empty" : `Tile ${tile + 1}`}
                />
              );
            })}
          </div>
          {won && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-2xl border border-primary/60 bg-background/80 px-6 py-3 text-glow backdrop-blur">
                <span className="text-xl font-semibold text-primary">Sigil restored</span>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4 rounded-3xl border border-border bg-card/60 p-6">
          <div>
            <h2 className="text-xl font-semibold">{character.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Slide tiles by clicking any neighbor of the empty space. Restore the
              portrait to complete the ritual.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-background/40 p-4 text-sm">
            <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Network</div>
            <div className="font-mono text-primary">{RITUAL_CHAIN.chainName} · {RITUAL_CHAIN.chainId}</div>
            <div className="mt-1 truncate text-xs text-muted-foreground">{RITUAL_CHAIN.rpcUrls[0]}</div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!won || busy || !!txHash}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {txHash ? "Sealed onchain" : busy ? "Casting…" : won ? "Inscribe onchain" : "Solve to inscribe"}
          </button>

          {status && <p className="text-xs text-muted-foreground">{status}</p>}

          {txHash && (
            <a
              href={`${RITUAL_CHAIN.blockExplorerUrls[0]}/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="block truncate rounded-xl border border-primary/60 bg-background/40 px-4 py-2 text-center font-mono text-xs text-primary hover:bg-background/70"
            >
              View tx · {txHash.slice(0, 10)}…{txHash.slice(-8)}
            </a>
          )}
        </aside>
      </div>

      <footer className="mt-10 text-center text-xs text-muted-foreground">
        Each completion is written as calldata in a self-transaction on Ritual —
        permanent, public, verifiable.
      </footer>
    </div>
  );
}
