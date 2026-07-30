"use client";

import { DataActions } from "./DataActions";
import { DividendPanel } from "./DividendPanel";
import { PerformanceChart } from "./PerformanceChart";
import { PositionsTable } from "./PositionsTable";
import { SettingsPanel } from "./SettingsPanel";
import { SummaryCards } from "./SummaryCards";
import { TradeForm } from "./TradeForm";
import { TradesTable } from "./TradesTable";
import { useTrades } from "@/lib/useTrades";

export function Dashboard() {
  const {
    trades,
    dividends,
    adjustments,
    positions,
    realizedByTradeId,
    realizedEvents,
    totals,
    prices,
    settings,
    addTrade,
    deleteTrade,
    addDividend,
    deleteDividend,
    addAdjustment,
    deleteAdjustment,
    setPrice,
    updateSettings,
    resetSettings,
    clearAll,
    replaceAll,
  } = useTrades();
  const hasData = trades.length > 0 || dividends.length > 0 || adjustments.length > 0;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            Bonaparte Wealth
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Your trades stay in this browser — nothing is uploaded anywhere.
          </p>
        </div>

        <DataActions
          state={{ trades, dividends, adjustments, prices, settings }}
          realizedByTradeId={realizedByTradeId}
          hasData={hasData}
          onImport={replaceAll}
          onClear={clearAll}
        />
      </header>

      <div className="mt-8 flex flex-col gap-6">
        <PerformanceChart realizedEvents={realizedEvents} dividends={dividends} />
        <SummaryCards totals={totals} />
        <SettingsPanel settings={settings} onChange={updateSettings} onReset={resetSettings} />
        <TradeForm positions={positions} settings={settings} onAdd={addTrade} />
        <PositionsTable positions={positions} settings={settings} onPriceChange={setPrice} />
        <TradesTable
          trades={trades}
          adjustments={adjustments}
          realizedByTradeId={realizedByTradeId}
          onDelete={deleteTrade}
          onAddAdjustment={addAdjustment}
          onDeleteAdjustment={deleteAdjustment}
        />
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
