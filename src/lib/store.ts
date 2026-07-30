"use client";

import { loadPrices, loadTrades, savePrices, saveTrades } from "./storage";
import type { PriceMap, Trade } from "./types";

/**
 * localStorage is an external store, so it is exposed through the
 * subscribe/getSnapshot contract that `useSyncExternalStore` expects. That
 * keeps reads out of effects, gives correct SSR behaviour via the server
 * snapshot, and syncs other tabs for free through the `storage` event.
 */

export interface TradeState {
  trades: Trade[];
  prices: PriceMap;
}

/** What the server and the hydration render see: nothing is known yet. */
const EMPTY_STATE: TradeState = { trades: [], prices: {} };

let snapshot: TradeState | null = null;
const listeners = new Set<() => void>();

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
  snapshot ??= { trades: loadTrades(), prices: loadPrices() };
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
  if (next.prices !== previous.prices) savePrices(next.prices);
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
