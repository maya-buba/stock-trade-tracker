import type { PriceMap, Trade } from "./types";

/**
 * Persistence lives behind these four functions so it can be swapped for a
 * real backend (Supabase, SQLite, an API route) without touching the UI.
 */

const TRADES_KEY = "stt.trades.v1";
const PRICES_KEY = "stt.prices.v1";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or private-mode failures are not worth breaking the UI over.
  }
}

export function loadTrades(): Trade[] {
  return read<Trade[]>(TRADES_KEY, []).filter(isTrade);
}

export function saveTrades(trades: Trade[]): void {
  write(TRADES_KEY, trades);
}

export function loadPrices(): PriceMap {
  return read<PriceMap>(PRICES_KEY, {});
}

export function savePrices(prices: PriceMap): void {
  write(PRICES_KEY, prices);
}

/** Guards against malformed data left behind by an older version. */
function isTrade(value: unknown): value is Trade {
  if (!value || typeof value !== "object") return false;
  const t = value as Partial<Trade>;
  return (
    typeof t.id === "string" &&
    typeof t.symbol === "string" &&
    (t.side === "buy" || t.side === "sell") &&
    typeof t.quantity === "number" &&
    typeof t.price === "number" &&
    typeof t.fees === "number" &&
    typeof t.date === "string"
  );
}
