"use client";

import { useCallback, useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export interface SortState<K extends string> {
  key: K;
  direction: SortDirection;
}

/**
 * A sortable column: `compare` always orders ascending, and the table flips it
 * for descending. `defaultDirection` is what a first click on the column gives,
 * so text starts A–Z while numbers and dates start with the largest first.
 */
export interface Column<Row, K extends string> {
  key: K;
  label: string;
  align?: "left" | "right";
  defaultDirection: SortDirection;
  compare: (a: Row, b: Row) => number;
}

export function useSort<Row, K extends string>(
  columns: Column<Row, K>[],
  initialKey: K,
) {
  const initial = columns.find((column) => column.key === initialKey);
  const [sort, setSort] = useState<SortState<K>>({
    key: initialKey,
    direction: initial?.defaultDirection ?? "desc",
  });

  const toggle = useCallback(
    (key: K) => {
      setSort((previous) => {
        if (previous.key === key) {
          return { key, direction: previous.direction === "asc" ? "desc" : "asc" };
        }
        const column = columns.find((candidate) => candidate.key === key);
        return { key, direction: column?.defaultDirection ?? "desc" };
      });
    },
    [columns],
  );

  const sortRows = useCallback(
    (rows: Row[]): Row[] => {
      const column = columns.find((candidate) => candidate.key === sort.key);
      if (!column) return rows;
      const factor = sort.direction === "asc" ? 1 : -1;
      return [...rows].sort((a, b) => column.compare(a, b) * factor);
    },
    [columns, sort],
  );

  return { sort, toggle, sortRows };
}

/** Case-insensitive substring match, used by every symbol filter. */
export function matchesSymbol(symbol: string, query: string): boolean {
  const trimmed = query.trim().toUpperCase();
  return trimmed === "" || symbol.toUpperCase().includes(trimmed);
}

/** Compares text for sorting, ignoring case. */
export function byText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

/** Sorts numbers with undefined last, so blank cells do not lead. */
export function byNumber(a: number | undefined, b: number | undefined): number {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return -1;
  if (b === undefined) return 1;
  return a - b;
}

/** Distinct symbols present in a set of rows, for filter dropdowns. */
export function useSymbols(rows: { symbol: string }[]): string[] {
  return useMemo(
    () => [...new Set(rows.map((row) => row.symbol))].sort((a, b) => byText(a, b)),
    [rows],
  );
}
