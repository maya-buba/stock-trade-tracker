import { DEFAULT_SETTINGS } from "./fees";
import type { Adjustment, Dividend, PriceMap, Settings, Trade } from "./types";

/**
 * Persistence lives behind these functions so it can be swapped for a real
 * backend (Supabase, SQLite, an API route) without touching the UI.
 */

const TRADES_KEY = "stt.trades.v1";
const PRICES_KEY = "stt.prices.v1";
const SETTINGS_KEY = "stt.settings.v1";
const DIVIDENDS_KEY = "stt.dividends.v1";
const ADJUSTMENTS_KEY = "stt.adjustments.v1";

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
  return read<unknown[]>(TRADES_KEY, [])
    .map(migrateTrade)
    .filter((trade): trade is Trade => trade !== null);
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

export function loadDividends(): Dividend[] {
  return read<unknown[]>(DIVIDENDS_KEY, [])
    .map(parseDatedAmount)
    .filter((dividend): dividend is Dividend => dividend !== null);
}

export function saveDividends(dividends: Dividend[]): void {
  write(DIVIDENDS_KEY, dividends);
}

export function loadAdjustments(): Adjustment[] {
  return read<unknown[]>(ADJUSTMENTS_KEY, [])
    .map(parseDatedAmount)
    .filter((entry): entry is Adjustment => entry !== null);
}

export function saveAdjustments(adjustments: Adjustment[]): void {
  write(ADJUSTMENTS_KEY, adjustments);
}

export function loadSettings(): Settings {
  const stored = read<Partial<Settings>>(SETTINGS_KEY, {});
  return {
    commissionRate: numberOr(stored.commissionRate, DEFAULT_SETTINGS.commissionRate),
    taxRate: numberOr(stored.taxRate, DEFAULT_SETTINGS.taxRate),
    carriedForwardPnl: numberOr(stored.carriedForwardPnl, DEFAULT_SETTINGS.carriedForwardPnl),
  };
}

export function saveSettings(settings: Settings): void {
  write(SETTINGS_KEY, settings);
}

/**
 * Validates a stored trade, and upgrades rows from the first version, which
 * had a single `fees` field instead of separate commission and tax.
 */
function migrateTrade(value: unknown): Trade | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;

  if (
    typeof row.id !== "string" ||
    typeof row.symbol !== "string" ||
    (row.side !== "buy" && row.side !== "sell") ||
    typeof row.quantity !== "number" ||
    typeof row.price !== "number" ||
    typeof row.date !== "string"
  ) {
    return null;
  }

  const legacyFees = typeof row.fees === "number" ? row.fees : 0;

  return {
    id: row.id,
    symbol: row.symbol,
    side: row.side,
    quantity: row.quantity,
    price: row.price,
    commission: numberOr(row.commission, legacyFees),
    tax: numberOr(row.tax, 0),
    date: row.date,
    notes: typeof row.notes === "string" ? row.notes : undefined,
  };
}

/** Shared shape of dividends and manual adjustments: a dated amount per symbol. */
function parseDatedAmount<T extends Dividend | Adjustment>(value: unknown): T | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;

  if (
    typeof row.id !== "string" ||
    typeof row.symbol !== "string" ||
    typeof row.date !== "string" ||
    typeof row.amount !== "number" ||
    !Number.isFinite(row.amount)
  ) {
    return null;
  }

  return {
    id: row.id,
    symbol: row.symbol,
    date: row.date,
    amount: row.amount,
    notes: typeof row.notes === "string" ? row.notes : undefined,
  } as T;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
