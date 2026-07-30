"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { computePositions, computeTotals } from "./portfolio";
import { getServerSnapshot, getSnapshot, subscribe, update } from "./store";
import type { TradeDraft } from "./types";

/** Single source of truth for the dashboard: trades in, positions out. */
export function useTrades() {
  const { trades, prices } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

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

  const clearAll = useCallback(() => {
    update(() => ({ trades: [], prices: {} }));
  }, []);

  const positions = useMemo(() => computePositions(trades, prices), [trades, prices]);
  const totals = useMemo(() => computeTotals(positions), [positions]);

  return { trades, positions, totals, prices, addTrade, deleteTrade, setPrice, clearAll };
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
