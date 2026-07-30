import type { PortfolioTotals, Position, PriceMap, Trade } from "./types";

/** Below this many shares a position counts as closed, not as rounding dust. */
const QUANTITY_EPSILON = 1e-9;

/**
 * Positions are derived from the trade log using the average-cost method:
 * buys raise the average cost (fees included), sells realise P&L against that
 * average and leave the average untouched.
 */
export function computePositions(trades: Trade[], prices: PriceMap = {}): Position[] {
  const bySymbol = new Map<string, Position>();

  for (const trade of sortByDate(trades)) {
    const symbol = trade.symbol.toUpperCase();
    const position =
      bySymbol.get(symbol) ??
      { symbol, quantity: 0, avgCost: 0, costBasis: 0, realizedPnl: 0 };

    if (trade.side === "buy") {
      position.costBasis += trade.quantity * trade.price + trade.fees;
      position.quantity += trade.quantity;
    } else {
      const proceeds = trade.quantity * trade.price - trade.fees;
      // Only shares actually held carry a cost basis; anything beyond that
      // (an oversell or a short) is realised against a zero basis.
      const closedShares = Math.min(trade.quantity, Math.max(position.quantity, 0));
      const closedCost = closedShares * position.avgCost;
      position.realizedPnl += proceeds - closedCost;
      position.costBasis -= closedCost;
      position.quantity -= trade.quantity;
    }

    // Fully closed positions should read as exactly flat, not as float dust.
    if (Math.abs(position.quantity) < QUANTITY_EPSILON) {
      position.quantity = 0;
      position.costBasis = 0;
    }
    position.avgCost = position.quantity > 0 ? position.costBasis / position.quantity : 0;

    bySymbol.set(symbol, position);
  }

  return [...bySymbol.values()]
    .map((position) => withMarketData(position, prices[position.symbol]))
    .sort(byOpenThenSymbol);
}

function withMarketData(position: Position, lastPrice?: number): Position {
  if (typeof lastPrice !== "number" || !Number.isFinite(lastPrice)) return position;
  const marketValue = position.quantity * lastPrice;
  return {
    ...position,
    lastPrice,
    marketValue,
    unrealizedPnl: marketValue - position.costBasis,
  };
}

export function computeTotals(positions: Position[]): PortfolioTotals {
  let costBasis = 0;
  let marketValue = 0;
  let unrealizedPnl = 0;
  let realizedPnl = 0;
  let hasMissingPrices = false;

  for (const position of positions) {
    realizedPnl += position.realizedPnl;
    if (position.quantity === 0) continue;

    costBasis += position.costBasis;
    if (position.marketValue === undefined) {
      hasMissingPrices = true;
      continue;
    }
    marketValue += position.marketValue;
    unrealizedPnl += position.unrealizedPnl ?? 0;
  }

  return {
    costBasis,
    marketValue,
    unrealizedPnl,
    realizedPnl,
    totalPnl: unrealizedPnl + realizedPnl,
    hasMissingPrices,
  };
}

/** Shares currently held for a symbol — used to warn about overselling. */
export function openQuantity(trades: Trade[], symbol: string): number {
  const target = symbol.trim().toUpperCase();
  if (!target) return 0;
  return trades.reduce((total, trade) => {
    if (trade.symbol.toUpperCase() !== target) return total;
    return trade.side === "buy" ? total + trade.quantity : total - trade.quantity;
  }, 0);
}

export function returnPercent(pnl: number, costBasis: number): number | undefined {
  if (costBasis <= 0) return undefined;
  return (pnl / costBasis) * 100;
}

/** Newest first, for display. */
export function sortNewestFirst(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function sortByDate(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function byOpenThenSymbol(a: Position, b: Position): number {
  const aOpen = a.quantity !== 0;
  const bOpen = b.quantity !== 0;
  if (aOpen !== bOpen) return aOpen ? -1 : 1;
  return a.symbol.localeCompare(b.symbol);
}
