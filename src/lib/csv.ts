import type { Trade } from "./types";

const HEADERS = ["date", "symbol", "side", "quantity", "price", "fees", "notes"] as const;

export function tradesToCsv(trades: Trade[]): string {
  const rows = trades.map((trade) =>
    [
      trade.date,
      trade.symbol,
      trade.side,
      trade.quantity,
      trade.price,
      trade.fees,
      trade.notes ?? "",
    ]
      .map(escapeCell)
      .join(","),
  );
  return [HEADERS.join(","), ...rows].join("\n");
}

export function downloadCsv(trades: Trade[], filename = "trades.csv"): void {
  const blob = new Blob([tradesToCsv(trades)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
