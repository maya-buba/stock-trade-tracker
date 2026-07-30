"use client";

import { useMemo, useState } from "react";
import { cashFlow } from "@/lib/fees";
import { formatDate, formatMoney, formatShares, formatSignedMoney, pnlColor } from "@/lib/format";
import type { Adjustment, AdjustmentDraft, Trade } from "@/lib/types";
import { byNumber, byText, matchesSymbol, useSort, useSymbols } from "@/lib/useSort";
import type { Column } from "@/lib/useSort";
import { useToday } from "@/lib/useToday";
import {
  Empty,
  FilterBar,
  FilterCount,
  panelClass,
  SegmentedFilter,
  SortableTh,
  SymbolFilter,
  Td,
  Th,
} from "./table";

type Kind = "buy" | "sell" | "manual";
type KindFilter = "all" | Kind;

/**
 * Logged trades and manual entries share one chronological ledger, flattened to
 * a common shape so sorting works across both.
 */
interface LedgerRow {
  id: string;
  source: "trade" | "manual";
  kind: Kind;
  date: string;
  symbol: string;
  shares?: number;
  price?: number;
  commission?: number;
  tax?: number;
  total?: number;
  realized?: number;
  notes?: string;
}

const COLUMNS: Column<LedgerRow, string>[] = [
  { key: "date", label: "Date", align: "left", defaultDirection: "desc", compare: (a, b) => byText(a.date, b.date) },
  { key: "symbol", label: "Symbol", align: "left", defaultDirection: "asc", compare: (a, b) => byText(a.symbol, b.symbol) },
  { key: "side", label: "Side", align: "left", defaultDirection: "asc", compare: (a, b) => byText(a.kind, b.kind) },
  { key: "shares", label: "Shares", defaultDirection: "desc", compare: (a, b) => byNumber(a.shares, b.shares) },
  { key: "price", label: "Price", defaultDirection: "desc", compare: (a, b) => byNumber(a.price, b.price) },
  { key: "commission", label: "Comm", defaultDirection: "desc", compare: (a, b) => byNumber(a.commission, b.commission) },
  { key: "tax", label: "Tax", defaultDirection: "desc", compare: (a, b) => byNumber(a.tax, b.tax) },
  { key: "total", label: "Total", defaultDirection: "desc", compare: (a, b) => byNumber(a.total, b.total) },
  { key: "realized", label: "Realised", defaultDirection: "desc", compare: (a, b) => byNumber(a.realized, b.realized) },
];

export function TradesTable({
  trades,
  adjustments,
  realizedByTradeId,
  onDelete,
  onAddAdjustment,
  onDeleteAdjustment,
}: {
  trades: Trade[];
  adjustments: Adjustment[];
  realizedByTradeId: Record<string, number>;
  onDelete: (id: string) => void;
  onAddAdjustment: (draft: AdjustmentDraft) => void;
  onDeleteAdjustment: (id: string) => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [symbolFilter, setSymbolFilter] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const { sort, toggle, sortRows } = useSort(COLUMNS, "date");

  const rows = useMemo<LedgerRow[]>(
    () => [
      ...trades.map((trade) => ({
        id: trade.id,
        source: "trade" as const,
        kind: trade.side,
        date: trade.date,
        symbol: trade.symbol,
        shares: trade.quantity,
        price: trade.price,
        commission: trade.commission,
        tax: trade.tax,
        total: cashFlow(trade.side, trade.quantity, trade.price, trade.commission, trade.tax),
        realized: realizedByTradeId[trade.id],
        notes: trade.notes,
      })),
      ...adjustments.map((adjustment) => ({
        id: adjustment.id,
        source: "manual" as const,
        kind: "manual" as const,
        date: adjustment.date,
        symbol: adjustment.symbol,
        realized: adjustment.amount,
        notes: adjustment.notes,
      })),
    ],
    [trades, adjustments, realizedByTradeId],
  );

  const symbols = useSymbols(rows);

  const visible = useMemo(() => {
    const filtered = rows.filter(
      (row) => matchesSymbol(row.symbol, symbolFilter) && (kind === "all" || row.kind === kind),
    );
    return sortRows(filtered);
  }, [rows, symbolFilter, kind, sortRows]);

  /** Realised total for exactly what is on screen, so filters stay meaningful. */
  const visibleRealized = visible.reduce((total, row) => total + (row.realized ?? 0), 0);

  return (
    <section className={panelClass}>
      <header className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          Trade history
        </h2>
        <button
          type="button"
          onClick={() => setFormOpen((previous) => !previous)}
          aria-expanded={formOpen}
          className="text-xs font-medium text-neutral-700 underline transition-colors hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-neutral-50"
        >
          {formOpen ? "Cancel" : "Add manual gain / loss"}
        </button>
      </header>

      {formOpen && (
        <ManualEntryForm
          onAdd={(draft) => {
            onAddAdjustment(draft);
            setFormOpen(false);
          }}
        />
      )}

      {rows.length > 0 && (
        <FilterBar>
          <SymbolFilter
            id="trades-symbol"
            value={symbolFilter}
            symbols={symbols}
            onChange={setSymbolFilter}
          />
          <SegmentedFilter
            label="Type"
            value={kind}
            options={[
              { value: "all", label: "All" },
              { value: "buy", label: "Buy" },
              { value: "sell", label: "Sell" },
              { value: "manual", label: "Manual" },
            ]}
            onChange={setKind}
          />
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Realised shown{" "}
            <span className={`font-medium tabular-nums ${pnlColor(visibleRealized)}`}>
              {formatSignedMoney(visibleRealized)}
            </span>
          </span>
          <FilterCount
            shown={visible.length}
            total={rows.length}
            noun="entries"
            onClear={() => {
              setSymbolFilter("");
              setKind("all");
            }}
          />
        </FilterBar>
      )}

      {rows.length === 0 ? (
        <Empty>No trades logged yet.</Empty>
      ) : visible.length === 0 ? (
        <Empty>No entries match these filters.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[62rem] text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {COLUMNS.map((column) => (
                  <SortableTh key={column.key} column={column} sort={sort} onSort={toggle} />
                ))}
                <Th align="left">Notes</Th>
                <Th>{""}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {visible.map((row) => (
                <LedgerTableRow
                  key={row.id}
                  row={row}
                  onDelete={() =>
                    row.source === "trade" ? onDelete(row.id) : onDeleteAdjustment(row.id)
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function LedgerTableRow({ row, onDelete }: { row: LedgerRow; onDelete: () => void }) {
  return (
    <tr className="text-neutral-700 dark:text-neutral-300">
      <Td align="left">{formatDate(row.date)}</Td>
      <Td align="left">
        <span className="font-medium text-neutral-900 dark:text-neutral-50">{row.symbol}</span>
      </Td>
      <Td align="left">
        <Badge tone={row.kind}>{row.kind}</Badge>
      </Td>
      <Td>{row.shares === undefined ? "—" : formatShares(row.shares)}</Td>
      <Td>{row.price === undefined ? "—" : formatMoney(row.price)}</Td>
      <Td>{row.commission === undefined ? "—" : formatMoney(row.commission)}</Td>
      <Td>{row.tax === undefined ? "—" : formatMoney(row.tax)}</Td>
      <Td className={row.total === undefined ? "" : "font-medium text-neutral-900 dark:text-neutral-50"}>
        {row.total === undefined ? "—" : formatMoney(row.total)}
      </Td>
      <Td className={row.realized === undefined ? "" : pnlColor(row.realized)}>
        {row.realized === undefined ? "—" : formatSignedMoney(row.realized)}
      </Td>
      <Td align="left" className="max-w-xs truncate text-neutral-500 dark:text-neutral-400">
        {row.notes ?? "—"}
      </Td>
      <Td>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${row.kind} entry for ${row.symbol} on ${row.date}`}
          className="rounded px-2 py-1 text-xs text-neutral-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-neutral-400 dark:hover:bg-rose-950 dark:hover:text-rose-400"
        >
          Delete
        </button>
      </Td>
    </tr>
  );
}

/** For a closed trade with no record: just the symbol, date, and amount. */
function ManualEntryForm({ onAdd }: { onAdd: (draft: AdjustmentDraft) => void }) {
  const [symbol, setSymbol] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = useToday();
  const date = pickedDate ?? today;

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const ticker = symbol.trim().toUpperCase();
    const parsed = Number(amount);

    if (!ticker) return setError("Enter a ticker symbol.");
    if (amount.trim() === "" || !Number.isFinite(parsed)) {
      return setError("Enter the gain or loss — negative for a loss.");
    }
    if (parsed === 0) return setError("Enter an amount other than zero.");
    if (!date) return setError("Pick the date it was realised.");

    onAdd({ symbol: ticker, date, amount: parsed, notes: notes.trim() || undefined });
  }

  return (
    <form
      onSubmit={submit}
      className="border-y border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950"
    >
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        For a trade you no longer have the details of — enter what you made or lost, and it counts
        towards realised P&amp;L for that year.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-2">
          <Label htmlFor="manual-symbol">Symbol</Label>
          <input
            id="manual-symbol"
            value={symbol}
            onChange={(event) => {
              setSymbol(event.target.value);
              setError(null);
            }}
            placeholder="BCP"
            autoComplete="off"
            className={`${inputClass} uppercase`}
          />
        </div>

        <div className="lg:col-span-2">
          <Label htmlFor="manual-date">Realised on</Label>
          <input
            id="manual-date"
            type="date"
            value={date}
            onChange={(event) => setPickedDate(event.target.value)}
            className={inputClass}
          />
        </div>

        <div className="lg:col-span-2">
          <Label htmlFor="manual-amount">Gain / loss</Label>
          <input
            id="manual-amount"
            type="number"
            inputMode="decimal"
            step="any"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setError(null);
            }}
            placeholder="-1250.00"
            className={inputClass}
          />
        </div>

        <div className="col-span-2 lg:col-span-4">
          <Label htmlFor="manual-notes">Notes (optional)</Label>
          <input
            id="manual-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="No broker record"
            className={inputClass}
          />
        </div>

        <div className="col-span-2 flex items-end lg:col-span-2">
          <button
            type="submit"
            className="h-9 w-full rounded-lg border border-neutral-900 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-900 hover:text-white dark:border-neutral-50 dark:text-neutral-50 dark:hover:bg-neutral-50 dark:hover:text-neutral-900"
          >
            Add entry
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </form>
  );
}

const inputClass =
  "mt-1 h-9 w-full rounded-lg border border-neutral-300 bg-white px-2.5 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-neutral-400";

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
      {children}
    </label>
  );
}

function Badge({ tone, children }: { tone: Kind; children: React.ReactNode }) {
  const styles = {
    buy: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    sell: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
    manual: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  }[tone];

  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium capitalize ${styles}`}>
      {children}
    </span>
  );
}
