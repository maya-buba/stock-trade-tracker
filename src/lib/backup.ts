import { migrateTrade, parseDatedAmount, parseSettings } from "./storage";
import type { TradeState } from "./store";
import type { Adjustment, Dividend, PriceMap, Trade } from "./types";

const BACKUP_VERSION = 1;

interface BackupFile {
  app: "bonaparte-wealth";
  version: number;
  exportedAt: string;
  data: TradeState;
}

/** Everything the app stores, as one downloadable file — the way to move data to another device. */
export function backupToJson(state: TradeState): string {
  const file: BackupFile = {
    app: "bonaparte-wealth",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: state,
  };
  return JSON.stringify(file, null, 2);
}

export function downloadBackup(state: TradeState): void {
  const blob = new Blob([backupToJson(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bonaparte-wealth-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export class BackupParseError extends Error {}

/**
 * Parses and validates a backup file the same way localStorage reads are
 * validated — the file is untrusted input, whether it came from this app on
 * another device or was hand-edited.
 */
export function parseBackup(raw: string): TradeState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BackupParseError("That file isn't valid JSON.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new BackupParseError("That file doesn't look like a Bonaparte Wealth backup.");
  }

  // Accept either the wrapped {app, version, data} shape, or a bare state
  // object, so a hand-trimmed file still loads.
  const body = "data" in (parsed as Record<string, unknown>)
    ? (parsed as Record<string, unknown>).data
    : parsed;

  if (!body || typeof body !== "object") {
    throw new BackupParseError("That file doesn't look like a Bonaparte Wealth backup.");
  }

  const row = body as Record<string, unknown>;

  const trades = toArray(row.trades)
    .map(migrateTrade)
    .filter((trade): trade is Trade => trade !== null);

  const dividends = toArray(row.dividends)
    .map((entry) => parseDatedAmount<Dividend>(entry))
    .filter((entry): entry is Dividend => entry !== null);

  const adjustments = toArray(row.adjustments)
    .map((entry) => parseDatedAmount<Adjustment>(entry))
    .filter((entry): entry is Adjustment => entry !== null);

  const prices = parsePrices(row.prices);
  const settings = parseSettings(row.settings as never);

  return { trades, dividends, adjustments, prices, settings };
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function parsePrices(value: unknown): PriceMap {
  if (!value || typeof value !== "object") return {};
  const result: PriceMap = {};
  for (const [symbol, price] of Object.entries(value as Record<string, unknown>)) {
    if (typeof price === "number" && Number.isFinite(price)) result[symbol] = price;
  }
  return result;
}
