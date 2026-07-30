"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { DEFAULT_SETTINGS } from "./fees";
import { buildPortfolio, computeTotals } from "./portfolio";
import { getServerSnapshot, getSnapshot, subscribe, update } from "./store";
import type { DividendDraft, Settings, TradeDraft } from "./types";

/** Single source of truth for the dashboard: trades in, positions out. */
export function useTrades() {
  const { trades, dividends, prices, settings } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const addTrade = useCallback((draft: TradeDraft) => {
    update((state) => ({
      ...state,
      trades: [
        ...state.trades,
        { ...draft, id: createId(), symbol: draft.symbol.trim().toUpperCase() },
      ],
    }));
  }, []);

  const deleteTrade = useCallback((id: string) => {
    update((state) => ({
      ...state,
      trades: state.trades.filter((trade) => trade.id !== id),
    }));
  }, []);

  const addDividend = useCallback((draft: DividendDraft) => {
    update((state) => ({
      ...state,
      dividends: [
        ...state.dividends,
        { ...draft, id: createId(), symbol: draft.symbol.trim().toUpperCase() },
      ],
    }));
  }, []);

  const deleteDividend = useCallback((id: string) => {
    update((state) => ({
      ...state,
      dividends: state.dividends.filter((dividend) => dividend.id !== id),
    }));
  }, []);

  const setPrice = useCallback((symbol: string, price: number | undefined) => {
    const key = symbol.toUpperCase();
    update((state) => {
      if (price === undefined || !Number.isFinite(price)) {
        if (!(key in state.prices)) return state;
        return {
          ...state,
          prices: Object.fromEntries(
            Object.entries(state.prices).filter(([existing]) => existing !== key),
          ),
        };
      }
      return { ...state, prices: { ...state.prices, [key]: price } };
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    update((state) => ({ ...state, settings: { ...state.settings, ...patch } }));
  }, []);

  const resetSettings = useCallback(() => {
    update((state) => ({ ...state, settings: DEFAULT_SETTINGS }));
  }, []);

  /** Clears logged data but keeps configured rates and the carried-forward figure. */
  const clearAll = useCallback(() => {
    update((state) => ({ ...state, trades: [], dividends: [], prices: {} }));
  }, []);

  const portfolio = useMemo(
    () => buildPortfolio(trades, prices, dividends),
    [trades, prices, dividends],
  );
  const totals = useMemo(() => computeTotals(portfolio, settings), [portfolio, settings]);

  return {
    trades,
    dividends,
    positions: portfolio.positions,
    totals,
    prices,
    settings,
    addTrade,
    deleteTrade,
    addDividend,
    deleteDividend,
    setPrice,
    updateSettings,
    resetSettings,
    clearAll,
  };
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
