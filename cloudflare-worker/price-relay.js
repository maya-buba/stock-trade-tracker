/**
 * Relays SET (Stock Exchange of Thailand) prices from Yahoo Finance to the
 * Bonaparte Wealth browser app.
 *
 * This exists only because browsers block cross-origin reads of Yahoo's
 * response (no Access-Control-Allow-Origin header on their end) — a Worker
 * fetches server-side, where that restriction doesn't apply, then adds CORS
 * headers of its own so the app's own origin can read the result.
 *
 * Deploy: Cloudflare dashboard -> Workers & Pages -> Create -> Create Worker
 * -> replace the default code with this file -> Save and deploy. No CLI, no
 * API token, no account details ever leave Cloudflare's own dashboard.
 *
 * Usage: GET <worker-url>?symbols=PTT,IVL,GULF
 * -> { "prices": { "PTT": 38.5, "IVL": 21.2, "GULF": null }, "fetchedAt": "..." }
 * `null` means that symbol didn't resolve (delisted, typo, or Yahoo has no
 * quote for it) — the caller decides what to do about those.
 */

// Add your deployed app's origin(s) here. A browser only accepts a response
// whose Access-Control-Allow-Origin matches the page's own origin exactly.
const ALLOWED_ORIGINS = new Set([
  "https://maya-buba.github.io",
  "http://localhost:3100",
]);

const MAX_SYMBOLS = 25;

const priceRelay = {
  async fetch(request) {
    const origin = request.headers.get("Origin") ?? "";
    const corsHeaders = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "null",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      Vary: "Origin",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const symbols = (url.searchParams.get("symbols") ?? "")
      .split(",")
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean);

    if (symbols.length === 0) {
      return json({ error: "Pass ?symbols=A,B,C (bare SET tickers, no .BK)" }, 400, corsHeaders);
    }
    if (symbols.length > MAX_SYMBOLS) {
      return json({ error: `Too many symbols — max ${MAX_SYMBOLS} per request` }, 400, corsHeaders);
    }

    const entries = await Promise.all(symbols.map(fetchOne));

    return json(
      { prices: Object.fromEntries(entries), fetchedAt: new Date().toISOString() },
      200,
      { ...corsHeaders, "Cache-Control": "public, max-age=30" },
    );
  },
};

export default priceRelay;

/** SET tickers are ".BK" on Yahoo — the caller passes the bare symbol only. */
async function fetchOne(symbol) {
  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}.BK?interval=1d&range=1d`;
    const response = await fetch(yahooUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!response.ok) return [symbol, null];

    const data = await response.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return [symbol, typeof price === "number" ? price : null];
  } catch {
    return [symbol, null];
  }
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}
