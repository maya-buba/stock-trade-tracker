import { formatMoney, formatPercent, formatSignedMoney, pnlColor } from "@/lib/format";
import { returnPercent } from "@/lib/portfolio";
import type { PortfolioTotals } from "@/lib/types";

export function SummaryCards({ totals }: { totals: PortfolioTotals }) {
  const totalReturn = returnPercent(totals.totalPnl, totals.costBasis);

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card label="Market value" value={formatMoney(totals.marketValue)} hint="Open positions with a price" />
      <Card label="Cost basis" value={formatMoney(totals.costBasis)} hint="What the open shares cost you" />
      <Card
        label="Unrealised P&L"
        value={formatSignedMoney(totals.unrealizedPnl)}
        valueClass={pnlColor(totals.unrealizedPnl)}
        hint={totals.hasMissingPrices ? "Some positions have no price yet" : "On shares you still hold"}
      />
      <Card
        label="Total P&L"
        value={formatSignedMoney(totals.totalPnl)}
        valueClass={pnlColor(totals.totalPnl)}
        hint={`Realised ${formatSignedMoney(totals.realizedPnl)}${
          totalReturn === undefined ? "" : ` · ${formatPercent(totalReturn)}`
        }`}
      />
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
