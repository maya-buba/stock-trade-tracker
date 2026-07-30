# Trade Tracker

A personal stock trade tracker: log buys and sells, and see your open positions,
cost basis, and realised/unrealised P&L. Everything is stored in your browser —
no account, no server, nothing uploaded.

## Getting started

```bash
npm run dev
```

Then open http://localhost:3000.

## How it works

The trade log is the only stored data. Positions and P&L are always **derived**
from it, never saved, so editing or deleting a trade recalculates everything.

- **Average-cost method** — buys raise the average cost (fees included); sells
  realise P&L against that average and leave it unchanged.
- **Last price is manual for now.** Type a price into the Positions table to get
  market value and unrealised P&L. There is no market data provider wired up yet.
- **Selling more than you hold** is allowed but warned about: the excess shares
  realise against a zero cost basis and the position is flagged `short`.

## Layout

| Path | What lives there |
| --- | --- |
| `src/lib/types.ts` | `Trade`, `Position`, and totals shapes |
| `src/lib/portfolio.ts` | All the P&L maths — pure functions, no React |
| `src/lib/storage.ts` | The only place that touches `localStorage` |
| `src/lib/store.ts` | External store powering `useSyncExternalStore` |
| `src/lib/useTrades.ts` | The hook the UI reads from |
| `src/components/` | Dashboard, form, and tables |

### Swapping in a real database

`src/lib/storage.ts` is the seam. It exposes `loadTrades` / `saveTrades` /
`loadPrices` / `savePrices` and nothing else knows where data lives. Point those
at Supabase, SQLite, or a route handler and the UI is unchanged — the store will
need to `await` them and expose a loading state.

## Not built yet

- Live quotes (needs a market data API key)
- Multi-currency / FX
- FIFO or specific-lot accounting for taxes — this is average-cost only
- Dividends, splits, and options
- CSV import (export works)

## Scripts

```bash
npm run dev     # dev server
npm run build   # production build + typecheck
npm run lint    # eslint
```
