"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatMoney, formatPercent, formatShares, formatSignedMoney, pnlColor } from "@/lib/format";
import { LiveQuoteError, fetchLivePrices } from "@/lib/liveQuotes";
import { returnPercent, simulateExit } from "@/lib/portfolio";
import type { Position, Settings } from "@/lib/types";
import { byNumber, byText, matchesSymbol, useSort, useSymbols } from "@/lib/useSort";
import type { Column } from "@/lib/useSort";
import {
  Empty,
  FilterBar,
  FilterCount,
  panelClass,
  RowLimitSelect,
  SegmentedFilter,
  SortableTh,
  SymbolFilter,
  Td,
} from "./table";
import type { RowLimit } from "./table";

type Status = "all" | "open" | "closed";

/** A position plus the exit simulation, so both can be sorted on. */
interface Row {
  position: Position;
  exitPnl?: number;
  exitPercent?: number;
}

const COLUMNS: Column<Row, string>[] = [
  { key: "symbol", label: "Symbol", align: "left", defaultDirection: "asc", compare: (a, b) => byText(a.position.symbol, b.position.symbol) },
  { key: "shares", label: "Shares", defaultDirection: "desc", compare: (a, b) => a.position.quantity - b.position.quantity },
  { key: "avgCost", label: "Avg cost", defaultDirection: "desc", compare: (a, b) => a.position.avgCost - b.position.avgCost },
  { key: "costBasis", label: "Cost basis", defaultDirection: "desc", compare: (a, b) => a.position.costBasis - b.position.costBasis },
  { key: "lastPrice", label: "Last price", defaultDirection: "desc", compare: (a, b) => byNumber(a.position.lastPrice, b.position.lastPrice) },
  { key: "marketValue", label: "Market value", defaultDirection: "desc", compare: (a, b) => byNumber(a.position.marketValue, b.position.marketValue) },
  { key: "unrealised", label: "Unrealised", defaultDirection: "desc", compare: (a, b) => byNumber(a.position.unrealizedPnl, b.position.unrealizedPnl) },
  { key: "ifSoldNow", label: "If sold now", defaultDirection: "desc", compare: (a, b) => byNumber(a.exitPnl, b.exitPnl) },
  { key: "realised", label: "Realised", defaultDirection: "desc", compare: (a, b) => a.position.realizedPnl - b.position.realizedPnl },
  { key: "dividends", label: "Dividends", defaultDirection: "desc", compare: (a, b) => a.position.dividends - b.position.dividends },
];

export function PositionsTable({
  positions,
  settings,
  onPriceChange,
}: {
  positions: Position[];
  settings: Settings;
  onPriceChange: (symbol: string, price: number | undefined) => void;
}) {
  const [symbolFilter, setSymbolFilter] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [rowLimit, setRowLimit] = useState<RowLimit>(25);
  const { sort, toggle, sortRows } = useSort(COLUMNS, "symbol");
  const symbols = useSymbols(positions);

  const rows = useMemo<Row[]>(
    () =>
      positions.map((position) => {
        const exit =
          position.quantity === 0 || position.lastPrice === undefined
            ? undefined
            : simulateExit(position, position.lastPrice, settings);
        return { position, exitPnl: exit?.realized, exitPercent: exit?.returnPercent };
      }),
    [positions, settings],
  );

  const visible = useMemo(() => {
    const filtered = rows.filter((row) => {
      if (!matchesSymbol(row.position.symbol, symbolFilter)) return false;
      if (status === "open") return row.position.quantity !== 0;
      if (status === "closed") return row.position.quantity === 0;
      return true;
    });
    return sortRows(filtered);
  }, [rows, symbolFilter, status, sortRows]);

  const shown = rowLimit === undefined ? visible : visible.slice(0, rowLimit);
  const openSymbols = useMemo(
    () => positions.filter((position) => position.quantity !== 0).map((position) => position.symbol),
    [positions],
  );

  return (
    <section className={panelClass}>
      <header className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Positions</h2>
        <div className="flex flex-wrap items-center gap-3">
          {settings.priceRelayUrl && (
            <RefreshPricesButton
              symbols={openSymbols}
              relayUrl={settings.priceRelayUrl}
              onPriceChange={onPriceChange}
            />
          )}
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            FIFO cost basis · enter a last price to simulate closing the position
          </p>
        </div>
      </header>

      {positions.length > 0 && (
        <FilterBar>
          <SymbolFilter
            id="positions-symbol"
            value={symbolFilter}
            symbols={symbols}
            onChange={setSymbolFilter}
          />
          <SegmentedFilter
            label="Status"
            value={status}
            options={[
              { value: "all", label: "All" },
              { value: "open", label: "Open" },
              { value: "closed", label: "Closed" },
            ]}
            onChange={setStatus}
          />
          <RowLimitSelect id="positions-limit" value={rowLimit} onChange={setRowLimit} />
          <FilterCount
            shown={shown.length}
            total={rows.length}
            noun="positions"
            onClear={() => {
              setSymbolFilter("");
              setStatus("all");
            }}
          />
        </FilterBar>
      )}

      {positions.length === 0 ? (
        <Empty>Log a trade and your positions will show up here.</Empty>
      ) : visible.length === 0 ? (
        <Empty>No positions match these filters.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {COLUMNS.map((column) => (
                  <SortableTh key={column.key} column={column} sort={sort} onSort={toggle} />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {shown.map((row) => (
                <PositionRow key={row.position.symbol} row={row} onPriceChange={onPriceChange} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PositionRow({
  row,
  onPriceChange,
}: {
  row: Row;
  onPriceChange: (symbol: string, price: number | undefined) => void;
}) {
  const { position, exitPnl, exitPercent } = row;
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
      <Td className={exitPnl === undefined ? "" : pnlColor(exitPnl)}>
        {exitPnl === undefined ? (
          "—"
        ) : (
          <>
            {formatSignedMoney(exitPnl)}
            {exitPercent !== undefined && (
              <span className="ml-1 text-xs opacity-75">{formatPercent(exitPercent)}</span>
            )}
          </>
        )}
      </Td>
      <Td className={pnlColor(position.realizedPnl)}>
        {position.realizedPnl === 0 ? "—" : formatSignedMoney(position.realizedPnl)}
      </Td>
      <Td>{position.dividends === 0 ? "—" : formatMoney(position.dividends)}</Td>
    </tr>
  );
}

/**
 * Keeps its own text state so partial input like "18." stays editable.
 * Typing is the common writer, but "Refresh prices" can also set `value`
 * from outside — the ref tracks what *this* input last emitted, so an
 * external change re-syncs the text while the input's own edits don't
 * fight themselves (which would reset the cursor on every keystroke).
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
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      setText(value === undefined ? "" : String(value));
      lastEmitted.current = value;
    }
  }, [value]);

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
        const parsedValue = next === "" || !Number.isFinite(parsed) ? undefined : parsed;
        lastEmitted.current = parsedValue;
        onChange(symbol, parsedValue);
      }}
      className="h-8 w-24 rounded-lg border border-neutral-300 bg-white px-2 text-right text-sm tabular-nums text-neutral-900 outline-none transition-colors focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-neutral-400"
    />
  );
}

/** Fetches every open symbol's price in one call and fills the Last price fields. */
function RefreshPricesButton({
  symbols,
  relayUrl,
  onPriceChange,
}: {
  symbols: string[];
  relayUrl: string;
  onPriceChange: (symbol: string, price: number | undefined) => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    if (symbols.length === 0) return;
    setStatus("loading");
    setMessage(null);
    try {
      const { prices, failed } = await fetchLivePrices(symbols, relayUrl);
      for (const [symbol, price] of Object.entries(prices)) onPriceChange(symbol, price);

      const updated = Object.keys(prices).length;
      setStatus("done");
      setMessage(
        failed.length === 0
          ? `Updated ${updated} price${updated === 1 ? "" : "s"}.`
          : `Updated ${updated}; no quote for ${failed.join(", ")}.`,
      );
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof LiveQuoteError ? error.message : "Couldn't fetch prices.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => void refresh()}
        disabled={status === "loading" || symbols.length === 0}
        className="h-8 shrink-0 rounded-lg border border-neutral-300 px-3 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        {status === "loading" ? "Refreshing…" : "Refresh prices"}
      </button>
      {message && (
        <span
          className={`text-xs ${
            status === "error"
              ? "text-rose-600 dark:text-rose-400"
              : "text-neutral-500 dark:text-neutral-400"
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
