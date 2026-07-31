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
  /** Broker commission for this trade, normally quantity × price × rate. */
  commission: number;
  /** Tax on the commission. */
  tax: number;
  /** Execution date as `YYYY-MM-DD`. */
  date: string;
  notes?: string;
}

export type TradeDraft = Omit<Trade, "id">;

/** Cash received from a holding. Income, so it never touches the cost basis. */
export interface Dividend {
  id: string;
  symbol: string;
  /** Payment date as `YYYY-MM-DD`. */
  date: string;
  /** Cash actually received. Enter it net of any withholding tax. */
  amount: number;
  notes?: string;
}

export type DividendDraft = Omit<Dividend, "id">;

/**
 * A realised gain or loss entered by hand, for a trade with no record in the
 * log. It carries no shares or price — just the amount, and which stock and
 * when, so it lands in the right year.
 */
export interface Adjustment {
  id: string;
  symbol: string;
  /** Date the gain or loss was realised, as `YYYY-MM-DD`. */
  date: string;
  /** Positive for a gain, negative for a loss. */
  amount: number;
  notes?: string;
}

export type AdjustmentDraft = Omit<Adjustment, "id">;

/** Rates used to fill in commission and tax on new trades. */
export interface FeeSettings {
  /** Fraction of traded value, e.g. 0.00157. */
  commissionRate: number;
  /** Fraction of the commission, e.g. 0.07. */
  taxRate: number;
}

export interface Settings extends FeeSettings {
  /**
   * Realised profit or loss from before this app was used, entered by hand.
   * Negative for a carried-forward loss. Counts towards all-time P&L but never
   * towards the current year.
   */
  carriedForwardPnl: number;
  /**
   * URL of a small server-side relay that fetches SET prices from Yahoo
   * Finance (browsers can't call Yahoo directly — see cloudflare-worker/).
   * Undefined/empty means "Refresh prices" is hidden and prices stay manual.
   */
  priceRelayUrl?: string;
}

/** Latest known price per symbol, entered by hand for now. */
export type PriceMap = Record<string, number>;

/** Shares from one buy that are still open, oldest-first under FIFO. */
export interface Lot {
  /** Shares still held from this purchase. */
  quantity: number;
  /** Cost per share, including the buy's commission and tax. */
  costPerShare: number;
  /** Purchase date as `YYYY-MM-DD`. */
  date: string;
}

/** An open holding, derived from the trade log. Never stored. */
export interface Position {
  symbol: string;
  /** Open shares. Negative means more was sold than bought (a short). */
  quantity: number;
  /** Weighted average cost of the remaining lots, fees included. */
  avgCost: number;
  /** Total cost of the remaining lots. */
  costBasis: number;
  /** Open lots in FIFO order — oldest first, so sells consume from the front. */
  lots: Lot[];
  /** Locked-in profit/loss from closed shares, net of fees. */
  realizedPnl: number;
  /** Dividends received from this symbol, all time. */
  dividends: number;
  lastPrice?: number;
  marketValue?: number;
  unrealizedPnl?: number;
}

/** A closed-out gain or loss, attributed to the date it was realised. */
export interface RealizedEvent {
  symbol: string;
  /** `YYYY-MM-DD` of the sell that closed the shares. */
  date: string;
  amount: number;
  /** Whether a logged sell produced it or it was entered by hand. */
  source: "sell" | "manual";
  /** The sell's id, so a trade row can show what it realised. */
  tradeId?: string;
}

export interface PortfolioTotals {
  costBasis: number;
  /** Market value of positions that have a price. */
  marketValue: number;
  unrealizedPnl: number;
  /** Realised P&L from logged trades, all time. Excludes carried-forward. */
  realizedPnl: number;
  /** Realised P&L from sells dated in the current calendar year. */
  realizedThisYear: number;
  /** The manually entered figure from before this app. */
  carriedForwardPnl: number;
  /** Dividend income, all time. */
  dividends: number;
  /** Dividends paid in the current calendar year. */
  dividendsThisYear: number;
  /** Unrealised + realised + dividends + carried-forward. */
  totalPnl: number;
  /** Commission and tax paid across every logged trade. */
  feesPaid: number;
  /** True when at least one open position has no price entered. */
  hasMissingPrices: boolean;
}
