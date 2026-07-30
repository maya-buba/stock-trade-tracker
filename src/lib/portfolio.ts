import { cashFlow, commissionFor, taxFor } from "./fees";
import type {
  Adjustment,
  Dividend,
  FeeSettings,
  Lot,
  PortfolioTotals,
  Position,
  PriceMap,
  RealizedEvent,
  Settings,
  Trade,
} from "./types";

/** Below this many shares a lot or position counts as closed, not as dust. */
const QUANTITY_EPSILON = 1e-9;

export interface Portfolio {
  positions: Position[];
  /** Every closed-out gain/loss, so P&L can be sliced by period. */
  realizedEvents: RealizedEvent[];
  /** What each sell realised, keyed by trade id, for the history table. */
  realizedByTradeId: Record<string, number>;
  /** Commission plus tax across every trade in the log. */
  feesPaid: number;
  dividends: Dividend[];
}

/**
 * Positions are derived from the trade log using **FIFO**: each buy opens a lot
 * carrying its own cost per share (fees included), and each sell consumes the
 * oldest lots first. Realised P&L is the sell's net proceeds minus the cost of
 * exactly the lots it consumed.
 */
export function buildPortfolio(
  trades: Trade[],
  prices: PriceMap = {},
  dividends: Dividend[] = [],
  adjustments: Adjustment[] = [],
): Portfolio {
  const bySymbol = new Map<string, Position>();
  const realizedEvents: RealizedEvent[] = [];
  const realizedByTradeId: Record<string, number> = {};
  let feesPaid = 0;

  for (const trade of sortByDate(trades)) {
    const symbol = trade.symbol.toUpperCase();
    const position = bySymbol.get(symbol) ?? blankPosition(symbol);

    feesPaid += trade.commission + trade.tax;
    const cash = cashFlow(trade.side, trade.quantity, trade.price, trade.commission, trade.tax);

    if (trade.side === "buy") {
      position.lots.push({
        quantity: trade.quantity,
        costPerShare: cash / trade.quantity,
        date: trade.date,
      });
      position.quantity += trade.quantity;
    } else {
      // Shares beyond what the lots cover are realised against a zero basis,
      // which is what an oversell or a short amounts to here.
      const { cost } = consumeLots(position.lots, trade.quantity);
      const realized = cash - cost;

      position.realizedPnl += realized;
      position.quantity -= trade.quantity;
      realizedByTradeId[trade.id] = realized;
      realizedEvents.push({
        symbol,
        date: trade.date,
        amount: realized,
        source: "sell",
        tradeId: trade.id,
      });
    }

    if (Math.abs(position.quantity) < QUANTITY_EPSILON) position.quantity = 0;
    bySymbol.set(symbol, position);
  }

  // Manual gains and losses stand in for trades that were never logged, so they
  // count as realised without touching any lots.
  for (const adjustment of adjustments) {
    const symbol = adjustment.symbol.toUpperCase();
    const position = bySymbol.get(symbol) ?? blankPosition(symbol);
    position.realizedPnl += adjustment.amount;
    bySymbol.set(symbol, position);
    realizedEvents.push({
      symbol,
      date: adjustment.date,
      amount: adjustment.amount,
      source: "manual",
    });
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
    .map(summarizeLots)
    .map((position) => withMarketData(position, prices[position.symbol]))
    .sort(byOpenThenSymbol);

  return { positions, realizedEvents, realizedByTradeId, feesPaid, dividends };
}

/**
 * Removes the oldest `shares` from `lots` in place and returns what they cost.
 * `matched` is how many shares the lots actually covered.
 */
function consumeLots(lots: Lot[], shares: number): { cost: number; matched: number } {
  let remaining = shares;
  let cost = 0;

  while (remaining > QUANTITY_EPSILON && lots.length > 0) {
    const lot = lots[0];
    const taken = Math.min(lot.quantity, remaining);

    cost += taken * lot.costPerShare;
    lot.quantity -= taken;
    remaining -= taken;

    if (lot.quantity < QUANTITY_EPSILON) lots.shift();
  }

  return { cost, matched: shares - remaining };
}

/** Cost of the oldest `shares` shares without touching the lots. */
export function fifoCostOf(lots: Lot[], shares: number): { cost: number; matched: number } {
  return consumeLots(lots.map((lot) => ({ ...lot })), shares);
}

export interface SellSimulation {
  /** Cash in after commission and tax. */
  netProceeds: number;
  /** FIFO cost of the shares being sold. */
  costBasis: number;
  /** What the sell would lock in. */
  realized: number;
  /** Return on the cost of those shares, if it can be expressed. */
  returnPercent?: number;
  /** Shares the open lots cover — less than requested means a short. */
  matched: number;
  uncovered: number;
}

/** What a sell of `shares` at `price` would realise, before it is logged. */
export function simulateSell(
  lots: Lot[],
  shares: number,
  price: number,
  commission: number,
  tax: number,
): SellSimulation {
  const netProceeds = cashFlow("sell", shares, price, commission, tax);
  const { cost, matched } = fifoCostOf(lots, shares);
  const realized = netProceeds - cost;

  return {
    netProceeds,
    costBasis: cost,
    realized,
    returnPercent: returnPercent(realized, cost),
    matched,
    uncovered: Math.max(shares - matched, 0),
  };
}

/**
 * What closing the whole position at `price` would realise right now, including
 * the commission and tax the exit itself would cost.
 */
export function simulateExit(position: Position, price: number, settings: FeeSettings) {
  const commission = commissionFor(position.quantity, price, settings);
  const tax = taxFor(commission, settings);
  return simulateSell(position.lots, position.quantity, price, commission, tax);
}

function summarizeLots(position: Position): Position {
  const costBasis = position.lots.reduce(
    (total, lot) => total + lot.quantity * lot.costPerShare,
    0,
  );
  return {
    ...position,
    costBasis: position.quantity > 0 ? costBasis : 0,
    avgCost: position.quantity > 0 ? costBasis / position.quantity : 0,
  };
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

export function returnPercent(pnl: number, costBasis: number): number | undefined {
  if (costBasis <= 0) return undefined;
  return (pnl / costBasis) * 100;
}

/** Newest first, for display. */
export function sortNewestFirst(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function blankPosition(symbol: string): Position {
  return {
    symbol,
    quantity: 0,
    avgCost: 0,
    costBasis: 0,
    lots: [],
    realizedPnl: 0,
    dividends: 0,
  };
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
