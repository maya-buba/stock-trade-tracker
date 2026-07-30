import { formatMoney, formatPercent, formatSignedMoney, pnlColor } from "@/lib/format";
import { returnPercent } from "@/lib/portfolio";
import type { PortfolioTotals } from "@/lib/types";

export function SummaryCards({ totals }: { totals: PortfolioTotals }) {
  const totalReturn = returnPercent(totals.totalPnl, totals.costBasis);

  return (
    <section>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          label="Market value"
          value={formatMoney(totals.marketValue)}
          hint={
            totals.hasMissingPrices
              ? "Some open positions have no price yet"
              : `Cost basis ${formatMoney(totals.costBasis)}`
          }
        />
        <Card
          label="Unrealised P&L"
          value={formatSignedMoney(totals.unrealizedPnl)}
          valueClass={pnlColor(totals.unrealizedPnl)}
          hint="On shares you still hold"
        />
        <Card
          label="Realised P&L"
          value={formatSignedMoney(totals.realizedPnl)}
          valueClass={pnlColor(totals.realizedPnl)}
          hint={`This year ${formatSignedMoney(totals.realizedThisYear)}`}
        />
        <Card
          label="Total P&L"
          value={formatSignedMoney(totals.totalPnl)}
          valueClass={pnlColor(totals.totalPnl)}
          hint={
            totalReturn === undefined
              ? "Unrealised + realised + dividends + carried"
              : `${formatPercent(totalReturn)} on open cost basis`
          }
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 px-1 text-xs text-neutral-500 dark:text-neutral-400">
        <Stat label="Dividends" value={formatMoney(totals.dividends)}>
          {formatMoney(totals.dividendsThisYear)} this year
        </Stat>
        <Stat label="Carried forward" value={formatSignedMoney(totals.carriedForwardPnl)}>
          from before this app
        </Stat>
        <Stat label="Commission + tax paid" value={formatMoney(totals.feesPaid)}>
          across all trades
        </Stat>
      </div>
    </section>
  );
}

function Card({
  label,
  value,
  hint,
  valueClass = "text-neutral-900 dark:text-neutral-50",
}: {
  label: string;
  value: string;
  hint: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <span>
      {label}{" "}
      <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-50">{value}</span>{" "}
      <span className="opacity-75">({children})</span>
    </span>
  );
}
