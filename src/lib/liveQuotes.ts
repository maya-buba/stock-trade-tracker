import type { PriceMap } from "./types";

export interface LiveQuoteResult {
  prices: PriceMap;
  /** Symbols the relay couldn't resolve — delisted, typo, or no Yahoo quote. */
  failed: string[];
}

export class LiveQuoteError extends Error {}

/**
 * Calls the user's own price relay (see cloudflare-worker/price-relay.js) for
 * every symbol at once. The relay is what makes this possible at all — a
 * browser can't call Yahoo Finance directly, since Yahoo's response has no
 * CORS header allowing it.
 */
export async function fetchLivePrices(symbols: string[], relayUrl: string): Promise<LiveQuoteResult> {
  const url = new URL(relayUrl);
  url.searchParams.set("symbols", symbols.join(","));

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch {
    throw new LiveQuoteError("Couldn't reach the price relay — check the URL in settings.");
  }

  if (!response.ok) {
    throw new LiveQuoteError(`Price relay returned an error (HTTP ${response.status}).`);
  }

  const data: unknown = await response.json().catch(() => null);
  const rawPrices =
    data && typeof data === "object" && "prices" in data
      ? (data as { prices: unknown }).prices
      : null;

  if (!rawPrices || typeof rawPrices !== "object") {
    throw new LiveQuoteError("The price relay returned an unexpected response.");
  }

  const prices: PriceMap = {};
  const failed: string[] = [];
  for (const [symbol, price] of Object.entries(rawPrices as Record<string, unknown>)) {
    if (typeof price === "number" && Number.isFinite(price)) prices[symbol] = price;
    else failed.push(symbol);
  }

  return { prices, failed };
}
