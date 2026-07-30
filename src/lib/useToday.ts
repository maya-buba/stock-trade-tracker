"use client";

import { useSyncExternalStore } from "react";

/**
 * Today's date as `YYYY-MM-DD`, or "" while rendering on the server.
 *
 * The page is prerendered at build time, so baking a date into the HTML would
 * go stale and break hydration. Reading it as an external store means the
 * server snapshot stays empty and the real date arrives right after hydration.
 */
export function useToday(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

let cached: string | null = null;

/** Never changes within a session, so there is nothing to subscribe to. */
function subscribe(): () => void {
  return () => {};
}

function getSnapshot(): string {
  return (cached ??= todayInLocalTime());
}

function getServerSnapshot(): string {
  return "";
}

function todayInLocalTime(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
