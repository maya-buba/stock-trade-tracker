import { cashFlow } from "./fees";
import type {
  Dividend,
  PortfolioTotals,
  Position,
  PriceMap,
  RealizedEvent,
  Settings,
  Trade,
} from "./types";

/** Below this many shares a position counts as closed, not as rounding dust. */
const QUANTITY_EPSILON = 1e-9;

export interface Portfolio {
  positions: Position[];
  /** Every closed-out gain/loss, so P&L can be sliced by period. */
  realizedEvents: RealizedEvent[];
  /** Commission plus tax across every trade in the log. */
  feesPaid: number;
  dividends: Dividend[];
}

/**
 * Positions are derived from the trade log using the average-cost method.
 * Buys add value plus fees to the cost basis; sells realise the net proceeds
 * (after fees) against that average cost and leave the average untouched.
 */
export function buildPortfolio(
  trades: Trade[],
  prices: PriceMap = {},
  dividends: Dividend[] = [],
): Portfolio {
  const bySymbol = new Map<string, Position>();
  const realizedEvents: RealizedEvent[] = [];
  let feesPaid = 0;

  for (const trade of sortByDate(trades)) {
    const symbol = trade.symbol.toUpperCase();
    const position = bySymbol.get(symbol) ?? blankPosition(symbol);

    feesPaid += trade.commission + trade.tax;
    const cash = cashFlow(trade.side, trade.quantity, trade.price, trade.commission, trade.tax);

    if (trade.side === "buy") {
      position.costBasis += cash;
      position.quantity += trade.quantity;
    } else {
      // Only shares actually held carry a cost basis; anything beyond that
      // (an oversell or a short) is realised against a zero basis.
      const closedShares = Math.min(trade.quantity, Math.max(position.quantity, 0));
      const closedCost = closedShares * position.avgCost;
      const realized = cash - closedCost;

      position.realizedPnl += realized;
      position.costBasis -= closedCost;
      position.quantity -= trade.quantity;
      realizedEvents.push({ symbol, date: trade.date, amount: realized });
    }

    // Fully closed positions should read as exactly flat, not as float dust.
    if (Math.abs(position.quantity) < QUANTITY_EPSILON) {
      position.quantity = 0;
      position.costBasis = 0;
    }
    position.avgCost = position.quantity > 0 ? position.costBasis / position.quantity : 0;

    bySymbol.set(symbol, position);
  }

  // Dividends can arrive for a symbol that is already fully sold, so they get
  // their own pass and may create a position row of their own.
  for (const dividend of dividends) {
    const symbol = dividend.symbol.toUpperCase();
    const position = bySymbol.get(symbol) ?? blankPosition(symbol);
    position.dividends += dividend.amount;
    bySymbol.set(symbol, position);
  }

  const positions = [...bySymbol.values()]
    .map((position) => withMarketData(position, prices[position.symbol]))
    .sort(byOpenThenSymbol);

  return { positions, realizedEvents, feesPaid, dividends };
}

function blankPosition(symbol: string): Position {
  return { symbol, quantity: 0, avgCost: 0, costBasis: 0, realizedPnl: 0, dividends: 0 };
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

export function computeTotals(
  portfolio: Portfolio,
  settings: Settings,
  year: number = new Date().getFullYear(),
): PortfolioTotals {
  let costBasis = 0;
  let marketValue = 0;
  let unrealizedPnl = 0;
  let realizedPnl = 0;
  let hasMissingPrices = false;

  for (const position of portfolio.positions) {
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

  const realizedThisYear = sumInYear(portfolio.realizedEvents, year);
  const dividends = portfolio.dividends.reduce((total, entry) => total + entry.amount, 0);
  const dividendsThisYear = sumInYear(portfolio.dividends, year);

  return {
    costBasis,
    marketValue,
    unrealizedPnl,
    realizedPnl,
    realizedThisYear,
    carriedForwardPnl: settings.carriedForwardPnl,
    dividends,
    dividendsThisYear,
    totalPnl: unrealizedPnl + realizedPnl + dividends + settings.carriedForwardPnl,
    feesPaid: portfolio.feesPaid,
    hasMissingPrices,
  };
}

function sumInYear(entries: { date: string; amount: number }[], year: number): number {
  return entries
    .filter((entry) => entry.date.startsWith(`${year}-`))
    .reduce((total, entry) => total + entry.amount, 0);
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
