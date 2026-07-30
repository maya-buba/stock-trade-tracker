"use client";

import { useState } from "react";
import { formatMoney, formatPercent, formatShares, formatSignedMoney, pnlColor } from "@/lib/format";
import { returnPercent } from "@/lib/portfolio";
import type { Position } from "@/lib/types";
import { Empty, panelClass, Td, Th } from "./table";

export function PositionsTable({
  positions,
  onPriceChange,
}: {
  positions: Position[];
  onPriceChange: (symbol: string, price: number | undefined) => void;
}) {
  return (
    <section className={panelClass}>
      <header className="flex items-baseline justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Positions</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Enter a last price to see unrealised P&amp;L
        </p>
      </header>

      {positions.length === 0 ? (
        <Empty>Log a trade and your positions will show up here.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                <Th align="left">Symbol</Th>
                <Th>Shares</Th>
                <Th>Avg cost</Th>
                <Th>Cost basis</Th>
                <Th>Last price</Th>
                <Th>Market value</Th>
                <Th>Unrealised</Th>
                <Th>Realised</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {positions.map((position) => (
                <Row key={position.symbol} position={position} onPriceChange={onPriceChange} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Row({
  position,
  onPriceChange,
}: {
  position: Position;
  onPriceChange: (symbol: string, price: number | undefined) => void;
}) {
  const isClosed = position.quantity === 0;
  const unrealized = isClosed ? undefined : position.unrealizedPnl;
  const percent =
    unrealized === undefined ? undefined : returnPercent(unrealized, position.costBasis);

  return (
    <tr className="text-neutral-700 dark:text-neutral-300">
      <Td align="left">
        <span className="font-medium text-neutral-900 dark:text-neutral-50">{position.symbol}</span>
        {isClosed && (
          <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            closed
          </span>
        )}
        {position.quantity < 0 && (
          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            short
          </span>
        )}
      </Td>
      <Td>{isClosed ? "—" : formatShares(position.quantity)}</Td>
      <Td>{isClosed ? "—" : formatMoney(position.avgCost)}</Td>
      <Td>{isClosed ? "—" : formatMoney(position.costBasis)}</Td>
      <Td>
        {isClosed ? (
          "—"
        ) : (
          <PriceInput symbol={position.symbol} value={position.lastPrice} onChange={onPriceChange} />
        )}
      </Td>
      <Td>{position.marketValue === undefined || isClosed ? "—" : formatMoney(position.marketValue)}</Td>
      <Td className={unrealized === undefined ? "" : pnlColor(unrealized)}>
        {unrealized === undefined ? (
          "—"
        ) : (
          <>
            {formatSignedMoney(unrealized)}
            {percent !== undefined && (
              <span className="ml-1 text-xs opacity-75">{formatPercent(percent)}</span>
            )}
          </>
        )}
      </Td>
      <Td className={pnlColor(position.realizedPnl)}>
        {position.realizedPnl === 0 ? "—" : formatSignedMoney(position.realizedPnl)}
      </Td>
    </tr>
  );
}

/**
 * Keeps its own text state so partial input like "18." stays editable. This
 * input is the only writer of the price, so the prop never needs syncing back
 * in — a reset unmounts the row along with the position.
 */
function PriceInput({
  symbol,
  value,
  onChange,
}: {
  symbol: string;
  value: number | undefined;
  onChange: (symbol: string, price: number | undefined) => void;
}) {
  const [text, setText] = useState(value === undefined ? "" : String(value));

  return (
    <input
      type="number"
      inputMode="decimal"
      step="any"
      min="0"
      value={text}
      aria-label={`Last price for ${symbol}`}
      placeholder="—"
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        const parsed = Number(next);
        onChange(symbol, next === "" || !Number.isFinite(parsed) ? undefined : parsed);
      }}
      className="h-8 w-24 rounded-lg border border-neutral-300 bg-white px-2 text-right text-sm tabular-nums text-neutral-900 outline-none transition-colors focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-neutral-400"
    />
  );
}
