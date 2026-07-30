import { cashFlow } from "./fees";
import type { Adjustment, Dividend, Trade } from "./types";

const LEDGER_HEADERS = [
  "date",
  "symbol",
  "type",
  "quantity",
  "price",
  "commission",
  "tax",
  "total",
  "realized",
  "notes",
] as const;

const DIVIDEND_HEADERS = ["date", "symbol", "amount", "notes"] as const;

/**
 * Trades and manual gain/loss entries share one CSV — they're the same
 * chronological ledger the app shows in the Trade history table.
 */
export function ledgerToCsv(
  trades: Trade[],
  adjustments: Adjustment[],
  realizedByTradeId: Record<string, number>,
): string {
  const tradeRows = trades.map((trade) => {
    const total = cashFlow(trade.side, trade.quantity, trade.price, trade.commission, trade.tax);
    const realized = realizedByTradeId[trade.id];
    return [
      trade.date,
      trade.symbol,
      trade.side,
      trade.quantity,
      trade.price,
      round2(trade.commission),
      round2(trade.tax),
      round2(total),
      realized === undefined ? "" : round2(realized),
      trade.notes ?? "",
    ];
  });

  const manualRows = adjustments.map((adjustment) => [
    adjustment.date,
    adjustment.symbol,
    "manual",
    "",
    "",
    "",
    "",
    "",
    round2(adjustment.amount),
    adjustment.notes ?? "",
  ]);

  const rows = [...tradeRows, ...manualRows]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map((row) => row.map(escapeCell).join(","));

  return [LEDGER_HEADERS.join(","), ...rows].join("\n");
}

export function dividendsToCsv(dividends: Dividend[]): string {
  const rows = [...dividends]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((dividend) =>
      [dividend.date, dividend.symbol, round2(dividend.amount), dividend.notes ?? ""]
        .map(escapeCell)
        .join(","),
    );
  return [DIVIDEND_HEADERS.join(","), ...rows].join("\n");
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function escapeCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
