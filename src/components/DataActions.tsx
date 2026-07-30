"use client";

import { useRef, useState } from "react";
import { BackupParseError, downloadBackup, parseBackup } from "@/lib/backup";
import { dividendsToCsv, downloadCsv, ledgerToCsv } from "@/lib/csv";
import type { TradeState } from "@/lib/store";

const buttonClass =
  "h-9 rounded-lg border border-neutral-300 px-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800";

/**
 * Export/import/reset, grouped so the header doesn't become a wall of
 * buttons. Import is the one destructive action here, so it gets its own
 * confirm step, same pattern as Reset.
 */
export function DataActions({
  state,
  realizedByTradeId,
  hasData,
  onImport,
  onClear,
}: {
  state: TradeState;
  realizedByTradeId: Record<string, number>;
  hasData: boolean;
  onImport: (state: TradeState) => void;
  onClear: () => void;
}) {
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [pendingImport, setPendingImport] = useState<TradeState | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // let the same file be picked again later
    if (!file) return;

    setImportError(null);
    try {
      const text = await file.text();
      setPendingImport(parseBackup(text));
    } catch (error) {
      setPendingImport(null);
      setImportError(
        error instanceof BackupParseError ? error.message : "Couldn't read that file.",
      );
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => downloadCsv(ledgerToCsv(state.trades, state.adjustments, realizedByTradeId), "bonaparte-wealth-trades.csv")}
          disabled={state.trades.length === 0 && state.adjustments.length === 0}
          className={buttonClass}
        >
          Export trades CSV
        </button>
        <button
          type="button"
          onClick={() => downloadCsv(dividendsToCsv(state.dividends), "bonaparte-wealth-dividends.csv")}
          disabled={state.dividends.length === 0}
          className={buttonClass}
        >
          Export dividends CSV
        </button>
        <button type="button" onClick={() => downloadBackup(state)} className={buttonClass}>
          Backup (JSON)
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} className={buttonClass}>
          Restore backup
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          onChange={handleFile}
          className="hidden"
        />

        {confirmingClear ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClear();
                setConfirmingClear(false);
              }}
              className="h-9 rounded-lg bg-rose-600 px-3 text-sm font-medium text-white transition-colors hover:bg-rose-700"
            >
              Delete everything
            </button>
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              className="h-9 rounded-lg px-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            disabled={!hasData}
            className={buttonClass}
          >
            Reset
          </button>
        )}
      </div>

      {importError && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{importError}</p>
      )}

      {pendingImport && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <span>
            This backup has {pendingImport.trades.length} trades, {pendingImport.dividends.length}{" "}
            dividends, and {pendingImport.adjustments.length} manual entries. Restoring it replaces
            everything currently on this device.
          </span>
          <button
            type="button"
            onClick={() => {
              onImport(pendingImport);
              setPendingImport(null);
            }}
            className="shrink-0 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-700"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={() => setPendingImport(null)}
            className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
