export type TradeSide = "buy" | "sell";

/** A single executed trade. Amounts are in one currency (no FX handling yet). */
export interface Trade {
  id: string;
  symbol: string;
  side: TradeSide;
  /** Shares traded, always positive. `side` carries the direction. */
  quantity: number;
  /** Price per share. */
  price: number;
  /** Total commission/fees for this trade. */
  fees: number;
  /** Execution date as `YYYY-MM-DD`. */
  date: string;
  notes?: string;
}

export type TradeDraft = Omit<Trade, "id">;

/** Latest known price per symbol, entered by hand for now. */
export type PriceMap = Record<string, number>;

/** An open holding, derived from the trade log. Never stored. */
export interface Position {
  symbol: string;
  /** Open shares. Negative means more was sold than bought (a short). */
  quantity: number;
  /** Average cost per open share, fees included. */
  avgCost: number;
  /** quantity * avgCost */
  costBasis: number;
  /** Locked-in profit/loss from closed shares. */
  realizedPnl: number;
  lastPrice?: number;
  marketValue?: number;
  unrealizedPnl?: number;
}

export interface PortfolioTotals {
  costBasis: number;
  /** Market value of positions that have a price. */
  marketValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalPnl: number;
  /** True when at least one open position has no price entered. */
  hasMissingPrices: boolean;
}
