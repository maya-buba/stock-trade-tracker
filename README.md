# Trade Tracker

A personal stock trade tracker in Thai baht: log buys and sells, and see your
open positions, cost basis, dividends, and realised/unrealised P&L. Everything
is stored in your browser — no account, no server, nothing uploaded.

## Getting started

```bash
npm run dev
```

Then open http://localhost:3000.

## How it works

The trade log, dividend log, and settings are the only stored data. Positions
and P&L are always **derived** from them, never saved, so deleting a trade
recalculates everything.

### Commission and tax

Both fill themselves in on every buy and sell, from the rates in
**Rates & opening balance**:

```
commission = shares × price × 0.157%      (default, editable)
tax        = commission × 7%              (default, editable)
```

- **Buy** total cost = `shares × price + commission + tax`
- **Sell** net proceeds = `shares × price − commission − tax`

Either figure can be typed over on an individual trade; click **auto** to go
back to the calculated value. Editing the rates only affects new trades —
already-logged trades keep the commission and tax they were saved with.

Values are kept at full precision internally and rounded only for display, so a
round trip matches a spreadsheet that does the same. For 500 IVL bought at 21.20
and sold at 22.30: commission 16.642 + 17.5055 = **34.15**, tax **2.39**, profit
**513.46**.

### Cost basis and P&L

- **Average-cost method** — buys raise the average cost (fees included); sells
  realise P&L against that average and leave it unchanged.
- **Dividends** are logged separately, count as income, and never touch the cost
  basis. Enter the cash you actually received, net of withholding tax.
- **Carried-forward P&L** is a manual figure for profit or loss from before you
  started using this app. Negative for a past loss. It counts towards Total P&L
  but never towards the current year.
- **Last price is manual.** Type a price into the Positions table to get market
  value and unrealised P&L — there is no market data provider wired up yet.
- **Selling more than you hold** is allowed but warned about: the excess shares
  realise against a zero cost basis and the position is flagged `short`.

Total P&L = unrealised + realised + dividends + carried-forward.

## Layout

| Path | What lives there |
| --- | --- |
| `src/lib/types.ts` | `Trade`, `Dividend`, `Position`, `Settings` shapes |
| `src/lib/fees.ts` | Commission/tax formulas and the default rates |
| `src/lib/portfolio.ts` | All the P&L maths — pure functions, no React |
| `src/lib/storage.ts` | The only place that touches `localStorage` |
| `src/lib/store.ts` | External store powering `useSyncExternalStore` |
| `src/lib/useTrades.ts` | The hook the UI reads from |
| `src/components/` | Dashboard, forms, and tables |

### Swapping in a real database

`src/lib/storage.ts` is the seam. Everything else is unaware of where data
lives. Point its load/save functions at Supabase, SQLite, or a route handler and
the UI is unchanged — the store will need to `await` them and expose a loading
state.

## Not built yet

- Live quotes (needs a market data API key)
- Multi-currency / FX — everything is baht
- FIFO or specific-lot accounting for taxes — this is average-cost only
- Splits and options
- CSV import, and CSV export of dividends (trade export works)

## Scripts

```bash
npm run dev     # dev server
npm run build   # production build + typecheck
npm run lint    # eslint
```
