"use client";

import { DEFAULT_SETTINGS } from "./fees";
import {
  loadAdjustments,
  loadDividends,
  loadPrices,
  loadSettings,
  loadTrades,
  saveAdjustments,
  saveDividends,
  savePrices,
  saveSettings,
  saveTrades,
} from "./storage";
import type { Adjustment, Dividend, PriceMap, Settings, Trade } from "./types";

/**
 * localStorage is an external store, so it is exposed through the
 * subscribe/getSnapshot contract that `useSyncExternalStore` expects. That
 * keeps reads out of effects, gives correct SSR behaviour via the server
 * snapshot, and syncs other tabs for free through the `storage` event.
 */

export interface TradeState {
  trades: Trade[];
  dividends: Dividend[];
  adjustments: Adjustment[];
  prices: PriceMap;
  settings: Settings;
}

/** What the server and the hydration render see: nothing is known yet. */
const EMPTY_STATE: TradeState = {
  trades: [],
  dividends: [],
  adjustments: [],
  prices: {},
  settings: DEFAULT_SETTINGS,
};

let snapshot: TradeState | null = null;
const listeners = new Set<() => void>();
/** Separate from `listeners`: folder-sync registers here to write-through every change. */
const writeListeners = new Set<(state: TradeState) => void>();

/** Called after every committed change, including ones from `update` below. */
export function onStateWritten(listener: (state: TradeState) => void): () => void {
  writeListeners.add(listener);
  return () => writeListeners.delete(listener);
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", handleExternalChange);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", handleExternalChange);
    }
  };
}

export function getSnapshot(): TradeState {
  snapshot ??= {
    trades: loadTrades(),
    dividends: loadDividends(),
    adjustments: loadAdjustments(),
    prices: loadPrices(),
    settings: loadSettings(),
  };
  return snapshot;
}

export function getServerSnapshot(): TradeState {
  return EMPTY_STATE;
}

/** Applies a change, persists only what actually changed, then notifies React. */
export function update(recipe: (state: TradeState) => TradeState): void {
  const previous = getSnapshot();
  const next = recipe(previous);
  if (next === previous) return;

  snapshot = next;
  if (next.trades !== previous.trades) saveTrades(next.trades);
  if (next.dividends !== previous.dividends) saveDividends(next.dividends);
  if (next.adjustments !== previous.adjustments) saveAdjustments(next.adjustments);
  if (next.prices !== previous.prices) savePrices(next.prices);
  if (next.settings !== previous.settings) saveSettings(next.settings);
  emit();
  for (const listener of writeListeners) listener(next);
}

/**
 * Replaces the whole state without going through localStorage diffing —
 * used when folder-sync loads a file, since every field may differ at once.
 * Does not notify `writeListeners`, so loading a file can't immediately
 * write it straight back out.
 */
export function hydrate(next: TradeState): void {
  snapshot = next;
  saveTrades(next.trades);
  saveDividends(next.dividends);
  saveAdjustments(next.adjustments);
  savePrices(next.prices);
  saveSettings(next.settings);
  emit();
}

/** Fires only for writes from other tabs, so it cannot loop back on itself. */
function handleExternalChange(): void {
  snapshot = null;
  emit();
}

function emit(): void {
  for (const listener of listeners) listener();
}
