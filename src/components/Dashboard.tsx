"use client";

import { useState } from "react";
import { downloadCsv } from "@/lib/csv";
import { useTrades } from "@/lib/useTrades";
import { DividendPanel } from "./DividendPanel";
import { PositionsTable } from "./PositionsTable";
import { SettingsPanel } from "./SettingsPanel";
import { SummaryCards } from "./SummaryCards";
import { TradeForm } from "./TradeForm";
import { TradesTable } from "./TradesTable";

export function Dashboard() {
  const {
    trades,
    dividends,
    positions,
    totals,
    settings,
    addTrade,
    deleteTrade,
    addDividend,
    deleteDividend,
    setPrice,
    updateSettings,
    resetSettings,
    clearAll,
  } = useTrades();
  const [confirmingClear, setConfirmingClear] = useState(false);
  const hasData = trades.length > 0 || dividends.length > 0;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            Trade Tracker
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Your trades stay in this browser — nothing is uploaded anywhere.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadCsv(trades)}
            disabled={trades.length === 0}
            className="h-9 rounded-lg border border-neutral-300 px-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Export CSV
          </button>

          {confirmingClear ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  clearAll();
                  setConfirmingClear(false);
                }}
                className="h-9 rounded-lg bg-rose-600 px-3 text-sm font-medium text-white transition-colors hover:bg-rose-700"
              >
                Delete everything
              </button>
              <button
                type="button"
                onClick={() => setConfirmingClear(false)}
                className="h-9 rounded-lg px-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingClear(true)}
              disabled={!hasData}
              className="h-9 rounded-lg border border-neutral-300 px-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Reset
            </button>
          )}
        </div>
      </header>

      <div className="mt-8 flex flex-col gap-6">
        <SummaryCards totals={totals} />
        <SettingsPanel
          settings={settings}
          onChange={updateSettings}
          onReset={resetSettings}
        />
        <TradeForm trades={trades} settings={settings} onAdd={addTrade} />
        <PositionsTable positions={positions} onPriceChange={setPrice} />
        <TradesTable trades={trades} onDelete={deleteTrade} />
        <DividendPanel
          dividends={dividends}
          total={totals.dividends}
          onAdd={addDividend}
          onDelete={deleteDividend}
        />
      </div>
    </main>
  );
}
