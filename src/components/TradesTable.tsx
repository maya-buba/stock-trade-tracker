"use client";

import { formatDate, formatMoney, formatShares } from "@/lib/format";
import { sortNewestFirst } from "@/lib/portfolio";
import type { Trade } from "@/lib/types";
import { Empty, panelClass, Td, Th } from "./table";

export function TradesTable({
  trades,
  onDelete,
}: {
  trades: Trade[];
  onDelete: (id: string) => void;
}) {
  return (
    <section className={panelClass}>
      <header className="flex items-baseline justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Trade history</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {trades.length} trade{trades.length === 1 ? "" : "s"}
        </p>
      </header>

      {trades.length === 0 ? (
        <Empty>No trades logged yet.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                <Th align="left">Date</Th>
                <Th align="left">Symbol</Th>
                <Th align="left">Side</Th>
                <Th>Quantity</Th>
                <Th>Price</Th>
                <Th>Fees</Th>
                <Th>Total</Th>
                <Th align="left">Notes</Th>
                <Th>{""}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {sortNewestFirst(trades).map((trade) => (
                <tr key={trade.id} className="text-neutral-700 dark:text-neutral-300">
                  <Td align="left">{formatDate(trade.date)}</Td>
                  <Td align="left">
                    <span className="font-medium text-neutral-900 dark:text-neutral-50">
                      {trade.symbol}
                    </span>
                  </Td>
                  <Td align="left">
                    <SideBadge side={trade.side} />
                  </Td>
                  <Td>{formatShares(trade.quantity)}</Td>
                  <Td>{formatMoney(trade.price)}</Td>
                  <Td>{trade.fees === 0 ? "—" : formatMoney(trade.fees)}</Td>
                  <Td>{formatMoney(total(trade))}</Td>
                  <Td align="left" className="max-w-xs truncate text-neutral-500 dark:text-neutral-400">
                    {trade.notes ?? "—"}
                  </Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => onDelete(trade.id)}
                      aria-label={`Delete ${trade.side} of ${trade.symbol} on ${trade.date}`}
                      className="rounded px-2 py-1 text-xs text-neutral-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-neutral-400 dark:hover:bg-rose-950 dark:hover:text-rose-400"
                    >
                      Delete
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Cash out the door on a buy, cash in on a sell. */
function total(trade: Trade): number {
  const gross = trade.quantity * trade.price;
  return trade.side === "buy" ? gross + trade.fees : gross - trade.fees;
}

function SideBadge({ side }: { side: Trade["side"] }) {
  const styles =
    side === "buy"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
      : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400";
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium capitalize ${styles}`}>{side}</span>
  );
}
