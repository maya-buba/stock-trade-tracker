"use client";

import { useMemo, useState } from "react";
import { cashFlow, commissionFor, rateToPercent, taxFor } from "@/lib/fees";
import { formatMoney, formatPercent, formatShares, formatSignedMoney, pnlColor } from "@/lib/format";
import { simulateSell } from "@/lib/portfolio";
import type { Position, Settings, TradeDraft, TradeSide } from "@/lib/types";
import { useToday } from "@/lib/useToday";

const EMPTY = { symbol: "", quantity: "", price: "", notes: "" };

export function TradeForm({
  positions,
  settings,
  onAdd,
}: {
  positions: Position[];
  settings: Settings;
  onAdd: (draft: TradeDraft) => void;
}) {
  const [fields, setFields] = useState(EMPTY);
  const [side, setSide] = useState<TradeSide>("buy");
  const [error, setError] = useState<string | null>(null);
  // Defaults to today until the user picks something else.
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const today = useToday();
  const date = pickedDate ?? today;

  // Commission and tax fill themselves in from the configured rates. Editing
  // either one pins it until the trade is submitted or the field is cleared.
  const [commissionOverride, setCommissionOverride] = useState<string | null>(null);
  const [taxOverride, setTaxOverride] = useState<string | null>(null);

  const quantity = toNumber(fields.quantity);
  const price = toNumber(fields.price);
  const hasBasis = quantity !== null && quantity > 0 && price !== null && price >= 0;

  const autoCommission = hasBasis ? commissionFor(quantity, price, settings) : 0;
  const commission = commissionOverride === null ? autoCommission : toNumber(commissionOverride) ?? 0;
  const autoTax = taxFor(commission, settings);
  const tax = taxOverride === null ? autoTax : toNumber(taxOverride) ?? 0;
  const total = hasBasis ? cashFlow(side, quantity, price, commission, tax) : 0;

  const symbol = fields.symbol.trim().toUpperCase();
  const position = useMemo(
    () => positions.find((candidate) => candidate.symbol === symbol),
    [positions, symbol],
  );
  const held = position?.quantity ?? 0;

  // Live preview of what this sell would lock in, matched against the FIFO lots.
  const simulation =
    side === "sell" && hasBasis && symbol !== ""
      ? simulateSell(position?.lots ?? [], quantity, price, commission, tax)
      : null;

  function update(key: keyof typeof EMPTY, value: string) {
    setFields((previous) => ({ ...previous, [key]: value }));
    setError(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const symbol = fields.symbol.trim().toUpperCase();
    if (!symbol) return setError("Enter a ticker symbol.");
    if (quantity === null || quantity <= 0) return setError("Quantity must be greater than zero.");
    if (price === null || price < 0) return setError("Enter a price per share.");
    if (!Number.isFinite(commission) || commission < 0) return setError("Commission cannot be negative.");
    if (!Number.isFinite(tax) || tax < 0) return setError("Tax cannot be negative.");
    if (!date) return setError("Pick a trade date.");

    onAdd({
      symbol,
      side,
      quantity,
      price,
      commission,
      tax,
      date,
      notes: fields.notes.trim() || undefined,
    });

    setFields(EMPTY);
    setCommissionOverride(null);
    setTaxOverride(null);
    setError(null);
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Log a trade</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Commission {rateToPercent(settings.commissionRate).toFixed(3)}% of value · tax{" "}
          {rateToPercent(settings.taxRate).toFixed(2)}% of commission
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-12">
        <div className="col-span-2 lg:col-span-2">
          <Label htmlFor="symbol">Symbol</Label>
          <input
            id="symbol"
            value={fields.symbol}
            onChange={(event) => update("symbol", event.target.value)}
            placeholder="IVL"
            autoComplete="off"
            className={`${inputClass} uppercase`}
          />
        </div>

        <div className="col-span-2 lg:col-span-2">
          <Label htmlFor="side">Side</Label>
          <div
            id="side"
            className="mt-1 flex h-9 rounded-lg border border-neutral-300 p-0.5 dark:border-neutral-700"
          >
            <SideButton current={side} value="buy" onSelect={setSide} />
            <SideButton current={side} value="sell" onSelect={setSide} />
          </div>
        </div>

        <div className="lg:col-span-2">
          <Label htmlFor="quantity">Shares</Label>
          <input
            id="quantity"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={fields.quantity}
            onChange={(event) => update("quantity", event.target.value)}
            placeholder="500"
            className={inputClass}
          />
        </div>

        <div className="lg:col-span-2">
          <Label htmlFor="price">Price / share</Label>
          <input
            id="price"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={fields.price}
            onChange={(event) => update("price", event.target.value)}
            placeholder="21.20"
            className={inputClass}
          />
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="commission">Commission</Label>
            {commissionOverride !== null && (
              <AutoButton onClick={() => setCommissionOverride(null)} />
            )}
          </div>
          <input
            id="commission"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={commissionOverride ?? (hasBasis ? autoCommission.toFixed(2) : "")}
            onChange={(event) => setCommissionOverride(event.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="tax">Tax</Label>
            {taxOverride !== null && <AutoButton onClick={() => setTaxOverride(null)} />}
          </div>
          <input
            id="tax"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={taxOverride ?? (hasBasis ? autoTax.toFixed(2) : "")}
            onChange={(event) => setTaxOverride(event.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
        </div>

        <div className="lg:col-span-2">
          <Label htmlFor="date">Date</Label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(event) => setPickedDate(event.target.value)}
            className={inputClass}
          />
        </div>

        <div className="col-span-2 lg:col-span-6">
          <Label htmlFor="notes">Notes (optional)</Label>
          <input
            id="notes"
            value={fields.notes}
            onChange={(event) => update("notes", event.target.value)}
            placeholder="Why you took the trade"
            className={inputClass}
          />
        </div>

        <div className="col-span-2 flex items-end lg:col-span-4">
          <div className="mr-3 min-w-0 flex-1 rounded-lg bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {side === "buy" ? "Total cost" : "Net proceeds"}
            </p>
            <p className="truncate text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
              {hasBasis ? formatMoney(total) : "—"}
            </p>
          </div>
          <button
            type="submit"
            className="h-9 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-700 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Add trade
          </button>
        </div>
      </div>

      {simulation && (
        <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Selling now would realise
            </span>
            <span className={`text-xl font-semibold tabular-nums ${pnlColor(simulation.realized)}`}>
              {formatSignedMoney(simulation.realized)}
            </span>
            {simulation.returnPercent !== undefined && (
              <span className={`text-sm font-medium tabular-nums ${pnlColor(simulation.realized)}`}>
                {formatPercent(simulation.returnPercent)}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            FIFO cost of the oldest {formatShares(simulation.matched)} share
            {simulation.matched === 1 ? "" : "s"} {formatMoney(simulation.costBasis)} · proceeds after
            fees {formatMoney(simulation.netProceeds)} · you hold {formatShares(held)}
          </p>
          {simulation.uncovered > 0 && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              {formatShares(simulation.uncovered)} of these shares are not covered by any lot — they
              would realise against a zero cost basis and open a short position.
            </p>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </form>
  );
}

const inputClass =
  "mt-1 h-9 w-full rounded-lg border border-neutral-300 bg-white px-2.5 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-neutral-400";

/** Returns null for blank or unparseable input, so "" is not treated as 0. */
function toNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
      {children}
    </label>
  );
}

function AutoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs text-neutral-500 underline transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50"
    >
      auto
    </button>
  );
}

function SideButton({
  current,
  value,
  onSelect,
}: {
  current: TradeSide;
  value: TradeSide;
  onSelect: (side: TradeSide) => void;
}) {
  const active = current === value;
  const activeClass = value === "buy" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white";
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={active}
      className={`flex-1 rounded-md text-sm font-medium capitalize transition-colors ${
        active
          ? activeClass
          : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
      }`}
    >
      {value}
    </button>
  );
}
