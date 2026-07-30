"use client";

import { useMemo, useState } from "react";
import { formatSignedMoney } from "@/lib/format";
import type { Granularity, PeriodBucket } from "@/lib/timeSeries";
import { buildPeriods, yearsWithData } from "@/lib/timeSeries";
import type { Dividend, RealizedEvent } from "@/lib/types";
import { panelClass } from "./table";

/**
 * A diverging bar per week/month: bars grow up from a zero baseline for a gain
 * and down for a loss, so sign is readable from direction alone — color is
 * reinforcement, not the only channel. Matches the emerald/rose used for P&L
 * everywhere else in the app.
 */
export function PerformanceChart({
  realizedEvents,
  dividends,
}: {
  realizedEvents: RealizedEvent[];
  dividends: Dividend[];
}) {
  const years = useMemo(() => yearsWithData(realizedEvents, dividends), [realizedEvents, dividends]);
  const [year, setYear] = useState(years[0]);
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [hovered, setHovered] = useState<number | null>(null);

  const periods = useMemo(
    () => buildPeriods(realizedEvents, dividends, year, granularity),
    [realizedEvents, dividends, year, granularity],
  );

  const hasData = periods.some((period) => period.total !== 0);
  const maxAbs = Math.max(1, ...periods.map((period) => Math.abs(period.total)));

  return (
    <section className={panelClass}>
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Performance
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Realised P&amp;L (sells + manual entries) plus dividends, per {granularity}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Legend />
          <div className="flex rounded-lg border border-neutral-300 p-0.5 dark:border-neutral-700">
            {(["week", "month"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setGranularity(option)}
                aria-pressed={granularity === option}
                className={`h-7 rounded-md px-2.5 text-xs font-medium capitalize transition-colors ${
                  granularity === option
                    ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <label htmlFor="performance-year" className="sr-only">
            Year
          </label>
          <select
            id="performance-year"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="h-8 rounded-lg border border-neutral-300 bg-white px-2 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-neutral-400"
          >
            {years.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="border-t border-neutral-200 px-4 py-4 dark:border-neutral-800">
        {!hasData ? (
          <p className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
            No realised P&amp;L or dividends in {year} yet.
          </p>
        ) : (
          <BarChart
            periods={periods}
            maxAbs={maxAbs}
            hovered={hovered}
            onHover={setHovered}
          />
        )}
      </div>
    </section>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
        Gain
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-rose-600 dark:bg-rose-500" />
        Loss
      </span>
    </div>
  );
}

const CHART_HEIGHT = 200;
const HALF = CHART_HEIGHT / 2;
const BAR_GAP = 2;

function BarChart({
  periods,
  maxAbs,
  hovered,
  onHover,
}: {
  periods: PeriodBucket[];
  maxAbs: number;
  hovered: number | null;
  onHover: (index: number | null) => void;
}) {
  // Leave headroom so the tallest bar doesn't touch the chart edge.
  const scale = (HALF - 8) / maxAbs;
  const barWidth = Math.max(4, 100 / periods.length - BAR_GAP);
  const showEveryLabel = periods.length <= 12;
  const active = hovered !== null ? periods[hovered] : undefined;

  return (
    <div>
      <div className="relative" style={{ height: CHART_HEIGHT }}>
        <svg
          viewBox={`0 0 100 ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
          role="img"
          aria-label={`Bar chart of realised profit and loss by ${periods.length === 12 ? "month" : "week"}`}
        >
          <line
            x1="0"
            y1={HALF}
            x2="100"
            y2={HALF}
            className="stroke-neutral-300 dark:stroke-neutral-700"
            strokeWidth="0.3"
          />
          {periods.map((period, index) => {
            const height = Math.abs(period.total) * scale;
            const isGain = period.total >= 0;
            const x = index * (100 / periods.length) + BAR_GAP / 2;
            const y = isGain ? HALF - height : HALF;
            const isHovered = hovered === index;

            return (
              <rect
                key={period.start}
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(height, period.total === 0 ? 0 : 1)}
                rx="1.2"
                className={
                  isGain
                    ? "fill-emerald-600 dark:fill-emerald-500"
                    : "fill-rose-600 dark:fill-rose-500"
                }
                opacity={isHovered || hovered === null ? 1 : 0.45}
                onPointerEnter={() => onHover(index)}
                onPointerLeave={() => onHover(null)}
                onFocus={() => onHover(index)}
                onBlur={() => onHover(null)}
                tabIndex={0}
                role="button"
                aria-label={`${period.fullLabel}: ${formatSignedMoney(period.total)}`}
              />
            );
          })}
        </svg>
      </div>

      <div className="mt-1 flex text-xs text-neutral-500 dark:text-neutral-400">
        {periods.map((period, index) => (
          <span
            key={period.start}
            style={{ width: `${100 / periods.length}%` }}
            className={`truncate text-center ${
              showEveryLabel || index % Math.ceil(periods.length / 12) === 0 ? "" : "invisible"
            }`}
          >
            {period.label}
          </span>
        ))}
      </div>

      <div className="mt-3 min-h-[2.5rem] rounded-lg bg-neutral-50 px-3 py-2 text-xs dark:bg-neutral-950">
        {active ? (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-medium text-neutral-900 dark:text-neutral-50">
              {active.fullLabel}
            </span>
            <span className="text-neutral-500 dark:text-neutral-400">
              Realised{" "}
              <span
                className={
                  active.realized >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }
              >
                {formatSignedMoney(active.realized)}
              </span>
            </span>
            <span className="text-neutral-500 dark:text-neutral-400">
              Dividends{" "}
              <span className="text-neutral-900 dark:text-neutral-50">
                {formatSignedMoney(active.dividends)}
              </span>
            </span>
            <span className="text-neutral-500 dark:text-neutral-400">
              Total{" "}
              <span
                className={
                  active.total >= 0
                    ? "font-medium text-emerald-600 dark:text-emerald-400"
                    : "font-medium text-rose-600 dark:text-rose-400"
                }
              >
                {formatSignedMoney(active.total)}
              </span>
            </span>
          </div>
        ) : (
          <span className="text-neutral-400 dark:text-neutral-600">
            Hover or focus a bar for the breakdown
          </span>
        )}
      </div>
    </div>
  );
}
