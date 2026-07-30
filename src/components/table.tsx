"use client";

import type { Column, SortState } from "@/lib/useSort";

/** Shared table primitives — numbers right-aligned, labels left. */

export function Th({
  children,
  align = "right",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-2 font-medium ${align === "left" ? "text-left" : "text-right"}`}
    >
      {children}
    </th>
  );
}

/** A column header that sorts on click and reports its state to screen readers. */
export function SortableTh<Row, K extends string>({
  column,
  sort,
  onSort,
}: {
  column: Column<Row, K>;
  sort: SortState<K>;
  onSort: (key: K) => void;
}) {
  const active = sort.key === column.key;
  const align = column.align ?? "right";

  return (
    <th
      scope="col"
      aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
      className="px-4 py-2 font-medium"
    >
      <button
        type="button"
        onClick={() => onSort(column.key)}
        className={`flex w-full items-center gap-1 uppercase tracking-wide transition-colors hover:text-neutral-900 dark:hover:text-neutral-50 ${
          align === "left" ? "justify-start" : "justify-end"
        } ${active ? "text-neutral-900 dark:text-neutral-50" : ""}`}
      >
        {column.label}
        <span aria-hidden="true" className={active ? "" : "opacity-30"}>
          {active ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

export function Td({
  children,
  align = "right",
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={`px-4 py-3 tabular-nums ${align === "left" ? "text-left" : "text-right"} ${className}`}
    >
      {children}
    </td>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
      {children}
    </p>
  );
}

/** The row of controls above a table. */
export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-neutral-200 px-4 py-2.5 dark:border-neutral-800">
      {children}
    </div>
  );
}

export function SymbolFilter({
  id,
  value,
  symbols,
  onChange,
}: {
  id: string;
  value: string;
  symbols: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-xs text-neutral-500 dark:text-neutral-400">
        Symbol
      </label>
      <input
        id={id}
        list={`${id}-options`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="All"
        autoComplete="off"
        className="h-8 w-28 rounded-lg border border-neutral-300 bg-white px-2 text-sm uppercase text-neutral-900 outline-none transition-colors placeholder:normal-case placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-neutral-400"
      />
      <datalist id={`${id}-options`}>
        {symbols.map((symbol) => (
          <option key={symbol} value={symbol} />
        ))}
      </datalist>
    </div>
  );
}

/** A small set of mutually exclusive choices, e.g. all / open / closed. */
export function SegmentedFilter<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
      <div
        role="group"
        aria-label={label}
        className="flex rounded-lg border border-neutral-300 p-0.5 dark:border-neutral-700"
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={`h-7 rounded-md px-2.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const ROW_LIMIT_OPTIONS = [10, 25, 50, 100] as const;
/** `undefined` means "All" — kept out of the options array since it isn't a number. */
export type RowLimit = (typeof ROW_LIMIT_OPTIONS)[number] | undefined;

export function RowLimitSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: RowLimit;
  onChange: (value: RowLimit) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-xs text-neutral-500 dark:text-neutral-400">
        Show
      </label>
      <select
        id={id}
        value={value ?? "all"}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next === "all" ? undefined : (Number(next) as RowLimit));
        }}
        className="h-8 rounded-lg border border-neutral-300 bg-white px-2 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-neutral-400"
      >
        {ROW_LIMIT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value="all">All</option>
      </select>
    </div>
  );
}

/** "12 of 30" style count, plus a clear action when a filter is narrowing. */
export function FilterCount({
  shown,
  total,
  noun,
  onClear,
}: {
  shown: number;
  total: number;
  noun: string;
  onClear?: () => void;
}) {
  const filtered = shown !== total;
  return (
    <span className="ml-auto flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
      {filtered ? `${shown} of ${total} ${noun}` : `${total} ${noun}`}
      {filtered && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="underline transition-colors hover:text-neutral-900 dark:hover:text-neutral-50"
        >
          Clear
        </button>
      )}
    </span>
  );
}

export const panelClass =
  "rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900";
