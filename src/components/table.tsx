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

export const panelClass =
  "rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900";
