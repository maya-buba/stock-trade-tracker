import type { Dividend, RealizedEvent } from "./types";

export type Granularity = "week" | "month";

export interface PeriodBucket {
  /** ISO date of the period's first day — stable key for sorting/lookup. */
  start: string;
  /** Short axis label, e.g. "Jan" or "W1". */
  label: string;
  /** Longer label for tooltips, e.g. "Jan 2026" or "Jan 1 – Jan 7, 2026". */
  fullLabel: string;
  realized: number;
  dividends: number;
  total: number;
}

/** Years that appear anywhere in the log, newest first, always including the current year. */
export function yearsWithData(
  realizedEvents: RealizedEvent[],
  dividends: Dividend[],
  now: Date = new Date(),
): number[] {
  const years = new Set<number>([now.getFullYear()]);
  for (const event of realizedEvents) years.add(Number(event.date.slice(0, 4)));
  for (const dividend of dividends) years.add(Number(dividend.date.slice(0, 4)));
  return [...years].sort((a, b) => b - a);
}

/**
 * Buckets realised P&L (sells + manual adjustments) and dividends into weeks or
 * months of `year`, in calendar order. Every bucket for the year is included,
 * even empty ones, so the chart's x-axis doesn't skip around.
 */
export function buildPeriods(
  realizedEvents: RealizedEvent[],
  dividends: Dividend[],
  year: number,
  granularity: Granularity,
): PeriodBucket[] {
  const buckets = granularity === "month" ? monthBuckets(year) : weekBuckets(year);

  for (const event of realizedEvents) {
    const bucket = findBucket(buckets, event.date, year);
    if (bucket) bucket.realized += event.amount;
  }
  for (const dividend of dividends) {
    const bucket = findBucket(buckets, dividend.date, year);
    if (bucket) bucket.dividends += dividend.amount;
  }
  for (const bucket of buckets) bucket.total = bucket.realized + bucket.dividends;

  return buckets;
}

function findBucket(buckets: PeriodBucket[], date: string, year: number): PeriodBucket | undefined {
  if (!date.startsWith(`${year}-`)) return undefined;
  // Buckets are in calendar order and cover the whole year, so the last bucket
  // whose start is not after `date` is the one that contains it.
  let match: PeriodBucket | undefined;
  for (const bucket of buckets) {
    if (bucket.start <= date) match = bucket;
    else break;
  }
  return match;
}

function monthBuckets(year: number): PeriodBucket[] {
  const names = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return names.map((label, month) => ({
    start: `${year}-${String(month + 1).padStart(2, "0")}-01`,
    label,
    fullLabel: `${label} ${year}`,
    realized: 0,
    dividends: 0,
    total: 0,
  }));
}

/** ISO-style weeks: each starts on Monday, week 1 is the Monday on/before Jan 1. */
function weekBuckets(year: number): PeriodBucket[] {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dayOfWeek = (jan1.getUTCDay() + 6) % 7; // 0 = Monday
  const firstMonday = addDays(jan1, -dayOfWeek);

  const dec31 = new Date(Date.UTC(year, 11, 31));
  const buckets: PeriodBucket[] = [];
  let cursor = firstMonday;
  let index = 1;

  while (cursor <= dec31) {
    const end = addDays(cursor, 6);
    buckets.push({
      start: toIso(cursor),
      label: `W${index}`,
      fullLabel: `${formatShort(cursor)} – ${formatShort(end)}, ${year}`,
      realized: 0,
      dividends: 0,
      total: 0,
    });
    cursor = addDays(cursor, 7);
    index += 1;
  }

  return buckets;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatShort(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
