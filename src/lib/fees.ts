import type { FeeSettings, Settings, TradeSide } from "./types";

/**
 * Commission is a percentage of the traded value, and tax is a percentage of
 * that commission. Both rates are editable in the UI; these are the defaults.
 */
export const DEFAULT_SETTINGS: Settings = {
  commissionRate: 0.00157,
  taxRate: 0.07,
  carriedForwardPnl: 0,
};

/** quantity × price × commissionRate */
export function commissionFor(quantity: number, price: number, settings: FeeSettings): number {
  const value = quantity * price;
  if (!Number.isFinite(value)) return 0;
  return value * settings.commissionRate;
}

/** commission × taxRate */
export function taxFor(commission: number, settings: FeeSettings): number {
  if (!Number.isFinite(commission)) return 0;
  return commission * settings.taxRate;
}

/**
 * Cash that actually moves: a buy costs the traded value plus fees, a sell
 * returns the traded value minus fees.
 *
 * Values are kept unrounded and only rounded for display, which is what the
 * source spreadsheet does — rounding each leg first drifts by a satang or two.
 */
export function cashFlow(
  side: TradeSide,
  quantity: number,
  price: number,
  commission: number,
  tax: number,
): number {
  const gross = quantity * price;
  return side === "buy" ? gross + commission + tax : gross - commission - tax;
}

/** Rate stored as a decimal, shown as a percentage. */
export function rateToPercent(rate: number): number {
  return rate * 100;
}

export function percentToRate(percent: number): number {
  return percent / 100;
}
