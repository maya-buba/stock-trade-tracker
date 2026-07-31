"use client";

import { useState } from "react";
import { DEFAULT_SETTINGS, percentToRate, rateToPercent } from "@/lib/fees";
import { formatMoney } from "@/lib/format";
import type { Settings } from "@/lib/types";

export function SettingsPanel({
  settings,
  onChange,
  onReset,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  // Bumping this re-keys the fields so a reset refreshes what they display.
  const [revision, setRevision] = useState(0);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          Rates &amp; opening balance
        </span>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {open ? "Hide" : `Commission ${rateToPercent(settings.commissionRate).toFixed(3)}% · tax ${rateToPercent(settings.taxRate).toFixed(2)}% · carried ${formatMoney(settings.carriedForwardPnl)}`}
        </span>
      </button>

      {open && (
        <div className="border-t border-neutral-200 px-4 py-4 dark:border-neutral-800">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <NumberField
              key={`commission-${revision}`}
              id="commission-rate"
              label="Commission rate"
              suffix="% of trade value"
              value={rateToPercent(settings.commissionRate)}
              decimals={5}
              min={0}
              onCommit={(percent) => onChange({ commissionRate: percentToRate(percent) })}
            />
            <NumberField
              key={`tax-${revision}`}
              id="tax-rate"
              label="Tax rate"
              suffix="% of commission"
              value={rateToPercent(settings.taxRate)}
              decimals={4}
              min={0}
              onCommit={(percent) => onChange({ taxRate: percentToRate(percent) })}
            />
            <NumberField
              key={`carried-${revision}`}
              id="carried-forward"
              label="Carried-forward P&L"
              suffix="negative for a past loss"
              value={settings.carriedForwardPnl}
              decimals={2}
              onCommit={(amount) => onChange({ carriedForwardPnl: amount })}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              New trades use these rates: commission = shares × price ×{" "}
              {rateToPercent(settings.commissionRate).toFixed(3)}%, tax = commission ×{" "}
              {rateToPercent(settings.taxRate).toFixed(2)}%. Already-logged trades keep the
              commission and tax they were saved with.
            </p>
            <button
              type="button"
              onClick={() => {
                onReset();
                setRevision((previous) => previous + 1);
              }}
              className="h-8 shrink-0 rounded-lg border border-neutral-300 px-3 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Reset to {rateToPercent(DEFAULT_SETTINGS.commissionRate).toFixed(3)}% /{" "}
              {rateToPercent(DEFAULT_SETTINGS.taxRate).toFixed(0)}%
            </button>
          </div>

          <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <UrlField
              key={`relay-${revision}`}
              id="price-relay-url"
              label="Live price relay URL (optional)"
              value={settings.priceRelayUrl ?? ""}
              placeholder="https://your-worker.your-name.workers.dev"
              onCommit={(url) => onChange({ priceRelayUrl: url || undefined })}
            />
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Fetches SET prices from Yahoo Finance via a small relay you host —
              see <code>cloudflare-worker/price-relay.js</code>. Leave blank to keep entering
              prices by hand; set this to show a <strong>Refresh prices</strong> button on
              Positions.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

/** Holds its own text so partial input like "0." or "-" stays editable. */
function NumberField({
  id,
  label,
  suffix,
  value,
  decimals,
  min,
  onCommit,
}: {
  id: string;
  label: string;
  suffix: string;
  value: number;
  decimals: number;
  min?: number;
  onCommit: (value: number) => void;
}) {
  const [text, setText] = useState(trim(value, decimals));

  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step="any"
        min={min}
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          const parsed = Number(next);
          if (next.trim() !== "" && Number.isFinite(parsed) && (min === undefined || parsed >= min)) {
            onCommit(parsed);
          }
        }}
        className="mt-1 h-9 w-full rounded-lg border border-neutral-300 bg-white px-2.5 text-sm tabular-nums text-neutral-900 outline-none transition-colors focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-neutral-400"
      />
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{suffix}</p>
    </div>
  );
}

/** Commits on blur, not per keystroke — a URL shouldn't try to save while half-typed. */
function UrlField({
  id,
  label,
  value,
  placeholder,
  onCommit,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onCommit: (value: string) => void;
}) {
  const [text, setText] = useState(value);

  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
        {label}
      </label>
      <input
        id={id}
        type="url"
        inputMode="url"
        value={text}
        placeholder={placeholder}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => onCommit(text.trim())}
        className="mt-1 h-9 w-full rounded-lg border border-neutral-300 bg-white px-2.5 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-neutral-400"
      />
    </div>
  );
}

/** Formats without trailing zeros, so 0.157 does not show as 0.15700. */
function trim(value: number, decimals: number): string {
  return String(Number(value.toFixed(decimals)));
}
