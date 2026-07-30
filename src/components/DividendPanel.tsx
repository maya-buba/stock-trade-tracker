"use client";

import { useMemo, useState } from "react";
import { formatDate, formatMoney, pnlColor } from "@/lib/format";
import type { Dividend, DividendDraft } from "@/lib/types";
import { byText, matchesSymbol, useSort, useSymbols } from "@/lib/useSort";
import type { Column } from "@/lib/useSort";
import { useToday } from "@/lib/useToday";
import {
  Empty,
  FilterBar,
  FilterCount,
  panelClass,
  SortableTh,
  SymbolFilter,
  Td,
  Th,
} from "./table";

const COLUMNS: Column<Dividend, string>[] = [
  { key: "date", label: "Paid on", align: "left", defaultDirection: "desc", compare: (a, b) => byText(a.date, b.date) },
  { key: "symbol", label: "Symbol", align: "left", defaultDirection: "asc", compare: (a, b) => byText(a.symbol, b.symbol) },
  { key: "amount", label: "Amount", defaultDirection: "desc", compare: (a, b) => a.amount - b.amount },
];

const EMPTY = { symbol: "", amount: "", notes: "" };

export function DividendPanel({
  dividends,
  total,
  onAdd,
  onDelete,
}: {
  dividends: Dividend[];
  total: number;
  onAdd: (draft: DividendDraft) => void;
  onDelete: (id: string) => void;
}) {
  const [fields, setFields] = useState(EMPTY);
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [symbolFilter, setSymbolFilter] = useState("");
  const today = useToday();
  const date = pickedDate ?? today;

  const { sort, toggle, sortRows } = useSort(COLUMNS, "date");
  const symbols = useSymbols(dividends);

  const visible = useMemo(
    () => sortRows(dividends.filter((dividend) => matchesSymbol(dividend.symbol, symbolFilter))),
    [dividends, symbolFilter, sortRows],
  );
  const visibleTotal = visible.reduce((sum, dividend) => sum + dividend.amount, 0);

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const symbol = fields.symbol.trim().toUpperCase();
    const amount = Number(fields.amount);

    if (!symbol) return setError("Enter a ticker symbol.");
    if (fields.amount.trim() === "" || !Number.isFinite(amount)) {
      return setError("Enter the amount received.");
    }
    if (!date) return setError("Pick a payment date.");

    onAdd({ symbol, date, amount, notes: fields.notes.trim() || undefined });
    setFields(EMPTY);
    setError(null);
  }

  return (
    <section className={panelClass}>
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Dividends</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {dividends.length === 0
            ? "Enter the cash you received, net of withholding tax"
            : `${formatMoney(total)} received across ${dividends.length} payment${
                dividends.length === 1 ? "" : "s"
              }`}
        </p>
      </header>

      <form onSubmit={submit} className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-2">
            <Label htmlFor="dividend-symbol">Symbol</Label>
            <input
              id="dividend-symbol"
              value={fields.symbol}
              onChange={(event) => {
                setFields((previous) => ({ ...previous, symbol: event.target.value }));
                setError(null);
              }}
              placeholder="IVL"
              autoComplete="off"
              className={`${inputClass} uppercase`}
            />
          </div>

          <div className="lg:col-span-2">
            <Label htmlFor="dividend-date">Paid on</Label>
            <input
              id="dividend-date"
              type="date"
              value={date}
              onChange={(event) => setPickedDate(event.target.value)}
              className={inputClass}
            />
          </div>

          <div className="lg:col-span-2">
            <Label htmlFor="dividend-amount">Amount received</Label>
            <input
              id="dividend-amount"
              type="number"
              inputMode="decimal"
              step="any"
              value={fields.amount}
              onChange={(event) => {
                setFields((previous) => ({ ...previous, amount: event.target.value }));
                setError(null);
              }}
              placeholder="450.00"
              className={inputClass}
            />
          </div>

          <div className="col-span-2 lg:col-span-4">
            <Label htmlFor="dividend-notes">Notes (optional)</Label>
            <input
              id="dividend-notes"
              value={fields.notes}
              onChange={(event) =>
                setFields((previous) => ({ ...previous, notes: event.target.value }))
              }
              placeholder="Interim, final, special…"
              className={inputClass}
            />
          </div>

          <div className="col-span-2 flex items-end lg:col-span-2">
            <button
              type="submit"
              className="h-9 w-full rounded-lg border border-neutral-900 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-900 hover:text-white dark:border-neutral-50 dark:text-neutral-50 dark:hover:bg-neutral-50 dark:hover:text-neutral-900"
            >
              Add dividend
            </button>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      </form>

      {dividends.length > 0 && (
        <FilterBar>
          <SymbolFilter
            id="dividends-symbol"
            value={symbolFilter}
            symbols={symbols}
            onChange={setSymbolFilter}
          />
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Shown{" "}
            <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-50">
              {formatMoney(visibleTotal)}
            </span>
          </span>
          <FilterCount
            shown={visible.length}
            total={dividends.length}
            noun="payments"
            onClear={() => setSymbolFilter("")}
          />
        </FilterBar>
      )}

      {dividends.length === 0 ? (
        <Empty>No dividends logged yet.</Empty>
      ) : visible.length === 0 ? (
        <Empty>No dividends match this filter.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
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
              {visible.map((dividend) => (
                <tr key={dividend.id} className="text-neutral-700 dark:text-neutral-300">
                  <Td align="left">{formatDate(dividend.date)}</Td>
                  <Td align="left">
                    <span className="font-medium text-neutral-900 dark:text-neutral-50">
                      {dividend.symbol}
                    </span>
                  </Td>
                  <Td className={pnlColor(dividend.amount)}>{formatMoney(dividend.amount)}</Td>
                  <Td align="left" className="max-w-xs truncate text-neutral-500 dark:text-neutral-400">
                    {dividend.notes ?? "—"}
                  </Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => onDelete(dividend.id)}
                      aria-label={`Delete ${dividend.symbol} dividend on ${dividend.date}`}
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

const inputClass =
  "mt-1 h-9 w-full rounded-lg border border-neutral-300 bg-white px-2.5 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-neutral-400";

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
      {children}
    </label>
  );
}

