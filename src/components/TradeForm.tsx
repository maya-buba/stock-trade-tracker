"use client";

import { useMemo, useState } from "react";
import { openQuantity } from "@/lib/portfolio";
import type { Trade, TradeDraft, TradeSide } from "@/lib/types";
import { useToday } from "@/lib/useToday";

const EMPTY = { symbol: "", quantity: "", price: "", fees: "", notes: "" };

export function TradeForm({
  trades,
  onAdd,
}: {
  trades: Trade[];
  onAdd: (draft: TradeDraft) => void;
}) {
  const [fields, setFields] = useState(EMPTY);
  const [side, setSide] = useState<TradeSide>("buy");
  const [error, setError] = useState<string | null>(null);
  // Defaults to today until the user picks something else.
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const today = useToday();
  const date = pickedDate ?? today;

  const held = useMemo(() => openQuantity(trades, fields.symbol), [trades, fields.symbol]);
  const quantity = Number(fields.quantity);
  const oversell =
    side === "sell" && fields.symbol.trim() !== "" && quantity > 0 && quantity > held;

  function update(key: keyof typeof EMPTY, value: string) {
    setFields((previous) => ({ ...previous, [key]: value }));
    setError(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const symbol = fields.symbol.trim().toUpperCase();
    const price = Number(fields.price);
    const fees = fields.fees === "" ? 0 : Number(fields.fees);

    if (!symbol) return setError("Enter a ticker symbol.");
    if (!(quantity > 0)) return setError("Quantity must be greater than zero.");
    if (!(price >= 0) || fields.price === "") return setError("Enter a price per share.");
    if (!(fees >= 0)) return setError("Fees cannot be negative.");
    if (!date) return setError("Pick a trade date.");

    onAdd({ symbol, side, quantity, price, fees, date, notes: fields.notes.trim() || undefined });
    setFields(EMPTY);
    setError(null);
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Log a trade</h2>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-12">
        <div className="col-span-2 lg:col-span-2">
          <Label htmlFor="symbol">Symbol</Label>
          <input
            id="symbol"
            value={fields.symbol}
            onChange={(event) => update("symbol", event.target.value)}
            placeholder="AAPL"
            autoComplete="off"
            className={`${inputClass} uppercase`}
          />
        </div>

        <div className="col-span-2 lg:col-span-2">
          <Label htmlFor="side">Side</Label>
          <div id="side" className="flex rounded-lg border border-neutral-300 p-0.5 dark:border-neutral-700">
            <SideButton current={side} value="buy" onSelect={setSide} />
            <SideButton current={side} value="sell" onSelect={setSide} />
          </div>
        </div>

        <div className="lg:col-span-2">
          <Label htmlFor="quantity">Quantity</Label>
          <input
            id="quantity"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={fields.quantity}
            onChange={(event) => update("quantity", event.target.value)}
            placeholder="10"
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
            placeholder="182.50"
            className={inputClass}
          />
        </div>

        <div className="lg:col-span-2">
          <Label htmlFor="fees">Fees</Label>
          <input
            id="fees"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={fields.fees}
            onChange={(event) => update("fees", event.target.value)}
            placeholder="0"
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

        <div className="col-span-2 lg:col-span-10">
          <Label htmlFor="notes">Notes (optional)</Label>
          <input
            id="notes"
            value={fields.notes}
            onChange={(event) => update("notes", event.target.value)}
            placeholder="Why you took the trade"
            className={inputClass}
          />
        </div>

        <div className="col-span-2 flex items-end lg:col-span-2">
          <button
            type="submit"
            className="h-9 w-full rounded-lg bg-neutral-900 text-sm font-medium text-white transition-colors hover:bg-neutral-700 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Add trade
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {!error && oversell && (
        <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
          You only hold {held} share{held === 1 ? "" : "s"} of {fields.symbol.trim().toUpperCase()} —
          this will record a short position.
        </p>
      )}
    </form>
  );
}

const inputClass =
  "mt-1 h-9 w-full rounded-lg border border-neutral-300 bg-white px-2.5 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-neutral-400";

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-xs font-medium text-neutral-600 dark:text-neutral-400"
    >
      {children}
    </label>
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
  const activeClass =
    value === "buy"
      ? "bg-emerald-600 text-white"
      : "bg-rose-600 text-white";
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={active}
      className={`h-8 flex-1 rounded-md text-sm font-medium capitalize transition-colors ${
        active ? activeClass : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
      }`}
    >
      {value}
    </button>
  );
}
