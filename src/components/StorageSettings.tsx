"use client";

import { useState } from "react";
import type { ConnectConflict, ConnectResult } from "@/lib/folderSync";
import { useFolderSync } from "@/lib/useFolderSync";
import { panelClass } from "./table";

const buttonClass =
  "h-8 rounded-lg border border-neutral-300 px-3 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800";

/**
 * Lets the user connect a local folder (Chromium desktop only) so the trade
 * log writes straight to a file there — e.g. an iCloud Drive folder, which
 * macOS then syncs on its own. Everywhere else this explains why the option
 * isn't there and points at the JSON backup/restore flow instead.
 */
export function StorageSettings() {
  const { status, connect, disconnect, reconnect, resolveConflict } = useFolderSync();
  const [open, setOpen] = useState(false);
  const [conflict, setConflict] = useState<ConnectConflict | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<ConnectResult>) {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (result.outcome === "conflict" && result.conflict) setConflict(result.conflict);
    else if (result.outcome === "error") setError(result.message ?? "Something went wrong.");
  }

  async function pickSide(choice: "file" | "local") {
    if (!conflict) return;
    await resolveConflict(choice, conflict);
    setConflict(null);
  }

  if (status.kind === "checking") return null;

  return (
    <section className={panelClass}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          Storage location
        </span>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {open ? "Hide" : <StatusSummary status={status} />}
        </span>
      </button>

      {open && (
        <div className="border-t border-neutral-200 px-4 py-4 dark:border-neutral-800">
          {status.kind === "unsupported" && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              This browser can&apos;t save to a folder you pick — that feature (the File System
              Access API) only exists in Chrome, Edge, and other Chromium browsers on desktop, not
              Safari or any iOS browser. Your data stays in this browser only. To move it elsewhere,
              use <strong>Backup (JSON)</strong> above and <strong>Restore backup</strong> on the
              other device.
            </p>
          )}

          {status.kind === "disconnected" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Pick a folder — for example one inside iCloud Drive — and every change here will be
                written to a file in it automatically. iCloud (or Dropbox, etc.) then syncs that file
                on its own; this app never talks to iCloud directly.
              </p>
              <button type="button" onClick={() => run(connect)} disabled={busy} className={buttonClass}>
                {busy ? "Opening picker…" : "Choose folder"}
              </button>
            </div>
          )}

          {status.kind === "connecting" && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Connecting…</p>
          )}

          {status.kind === "needs-permission" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                This browser needs permission again to use <strong>{status.folderName}</strong> — that
                resets on reload. Nothing was lost; reconnect to resume syncing.
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => run(reconnect)} disabled={busy} className={buttonClass}>
                  {busy ? "Reconnecting…" : "Reconnect"}
                </button>
                <button type="button" onClick={() => void disconnect()} className={buttonClass}>
                  Forget this folder
                </button>
              </div>
            </div>
          )}

          {status.kind === "connected" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Saving to <strong className="text-neutral-900 dark:text-neutral-50">{status.folderName}</strong>{" "}
                — last written {formatTime(status.lastSyncedAt)}.
              </p>
              <div>
                <button type="button" onClick={() => void disconnect()} className={buttonClass}>
                  Disconnect
                </button>
              </div>
            </div>
          )}

          {status.kind === "error" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-rose-600 dark:text-rose-400">{status.message}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => run(connect)} disabled={busy} className={buttonClass}>
                  Choose folder
                </button>
                <button type="button" onClick={() => void disconnect()} className={buttonClass}>
                  Disconnect
                </button>
              </div>
            </div>
          )}

          {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

          {conflict && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <p>
                This folder already has data that&apos;s different from what&apos;s in this browser.
                Which one should win?
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => pickSide("file")}
                  className="rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700"
                >
                  Use the folder&apos;s data ({counts(conflict.fileState)})
                </button>
                <button
                  type="button"
                  onClick={() => pickSide("local")}
                  className="rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700"
                >
                  Use this browser&apos;s data ({counts(conflict.localState)})
                </button>
                <button
                  type="button"
                  onClick={() => setConflict(null)}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900"
                >
                  Decide later
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function StatusSummary({ status }: { status: ReturnType<typeof useFolderSync>["status"] }) {
  switch (status.kind) {
    case "unsupported":
      return <>Not available in this browser</>;
    case "disconnected":
      return <>This browser only</>;
    case "connecting":
      return <>Connecting…</>;
    case "needs-permission":
      return <>Reconnect needed</>;
    case "connected":
      return <>Synced to {status.folderName}</>;
    case "error":
      return <>Error</>;
    default:
      return null;
  }
}

function counts(state: ConnectConflict["fileState"]): string {
  return `${state.trades.length} trades, ${state.dividends.length} dividends, ${state.adjustments.length} manual`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
