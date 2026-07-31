"use client";

import { backupToJson, parseBackup } from "./backup";
import { clearDirectoryHandle, loadDirectoryHandle, saveDirectoryHandle } from "./handleDb";
import { getSnapshot, hydrate, onStateWritten } from "./store";
import type { TradeState } from "./store";

/**
 * Mirrors the trade store to a JSON file in a folder the user picks (e.g.
 * their iCloud Drive), using the File System Access API. Chromium desktop
 * only — Safari and every iOS browser lack this API entirely, so on those
 * platforms the app stays localStorage-only and `isSupported()` says so.
 */

const FILE_NAME = "bonaparte-wealth-data.json";

export type FolderStatus =
  | { kind: "checking" }
  | { kind: "unsupported" }
  | { kind: "disconnected" }
  | { kind: "connecting" }
  | { kind: "needs-permission"; folderName: string }
  | { kind: "connected"; folderName: string; lastSyncedAt: string }
  | { kind: "error"; message: string };

export interface ConnectConflict {
  fileState: TradeState;
  localState: TradeState;
}

export type ConnectOutcome = "connected" | "conflict" | "cancelled" | "error";

export interface ConnectResult {
  outcome: ConnectOutcome;
  conflict?: ConnectConflict;
  message?: string;
}

/**
 * A stable reference for the pre-hydration value. useSyncExternalStore
 * compares getServerSnapshot results with Object.is, so a fresh object
 * literal on every call would look like a change every render and warn
 * about (or loop on) a server snapshot that never actually settles.
 */
const CHECKING_STATUS: FolderStatus = { kind: "checking" };

let status: FolderStatus = CHECKING_STATUS;
let currentHandle: FileSystemDirectoryHandle | undefined;
let supportChecked = false;
const statusListeners = new Set<() => void>();

export function subscribeFolderStatus(listener: () => void): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export function getFolderStatus(): FolderStatus {
  if (!supportChecked) {
    supportChecked = true;
    if (!isSupported()) status = { kind: "unsupported" };
    else if (status.kind === "checking") status = { kind: "disconnected" };
  }
  return status;
}

export function getFolderServerStatus(): FolderStatus {
  return CHECKING_STATUS;
}

export function isSupported(): boolean {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

/** Runs once per page load: reattaches a previously chosen folder, if permission survived. */
export async function initFolderSync(): Promise<void> {
  if (!isSupported()) return setStatus({ kind: "unsupported" });

  const handle = await loadDirectoryHandle().catch(() => undefined);
  if (!handle) return setStatus({ kind: "disconnected" });

  currentHandle = handle;
  const permission = await handle.queryPermission({ mode: "readwrite" }).catch(() => "denied" as PermissionState);

  if (permission !== "granted") {
    return setStatus({ kind: "needs-permission", folderName: handle.name });
  }

  try {
    const fileState = await tryReadFile(handle);
    if (fileState) hydrate(fileState);
    setStatus({ kind: "connected", folderName: handle.name, lastSyncedAt: new Date().toISOString() });
  } catch (error) {
    setStatus({ kind: "error", message: describeError(error) });
  }
}

/** User clicks "Choose folder" — must run inside the click handler (needs a user gesture). */
export async function connectFolder(): Promise<ConnectResult> {
  if (!isSupported() || !window.showDirectoryPicker) {
    return { outcome: "error", message: "This browser can't save to a folder." };
  }

  setStatus({ kind: "connecting" });
  let handle: FileSystemDirectoryHandle;
  try {
    handle = await window.showDirectoryPicker({ id: "bonaparte-wealth", mode: "readwrite" });
  } catch (error) {
    setStatus({ kind: "disconnected" });
    if (isAbort(error)) return { outcome: "cancelled" };
    return { outcome: "error", message: describeError(error) };
  }

  currentHandle = handle;
  await saveDirectoryHandle(handle).catch(() => {});
  return finishConnecting(handle);
}

/** User clicks "Reconnect" after a reload — needs a fresh gesture to request permission again. */
export async function reconnectFolder(): Promise<ConnectResult> {
  if (!currentHandle) return { outcome: "error", message: "No folder on file — choose one again." };

  const granted = await currentHandle.requestPermission({ mode: "readwrite" }).catch(() => "denied" as PermissionState);
  if (granted !== "granted") {
    setStatus({ kind: "needs-permission", folderName: currentHandle.name });
    return { outcome: "cancelled" };
  }
  return finishConnecting(currentHandle);
}

async function finishConnecting(handle: FileSystemDirectoryHandle): Promise<ConnectResult> {
  try {
    const fileState = await tryReadFile(handle);
    const localState = getSnapshot();

    if (fileState && hasData(localState) && !sameData(fileState, localState)) {
      // Both sides have real, different data — don't guess which one is right.
      setStatus({ kind: "connected", folderName: handle.name, lastSyncedAt: new Date().toISOString() });
      return { outcome: "conflict", conflict: { fileState, localState } };
    }

    if (fileState) hydrate(fileState);
    else await writeFile(handle, localState);

    setStatus({ kind: "connected", folderName: handle.name, lastSyncedAt: new Date().toISOString() });
    return { outcome: "connected" };
  } catch (error) {
    setStatus({ kind: "error", message: describeError(error) });
    return { outcome: "error", message: describeError(error) };
  }
}

/** The user's answer to a conflict: keep the folder's data, or overwrite the folder with this browser's. */
export async function resolveConflict(choice: "file" | "local", conflict: ConnectConflict): Promise<void> {
  if (choice === "file") {
    hydrate(conflict.fileState);
    return;
  }
  if (currentHandle) await writeFile(currentHandle, conflict.localState);
}

export async function disconnectFolder(): Promise<void> {
  currentHandle = undefined;
  await clearDirectoryHandle().catch(() => {});
  setStatus({ kind: "disconnected" });
}

// Every committed change write-throughs to the connected folder, if any.
onStateWritten((state) => {
  if (!currentHandle || status.kind !== "connected") return;
  void writeFile(currentHandle, state)
    .then(() => setStatus({ kind: "connected", folderName: currentHandle!.name, lastSyncedAt: new Date().toISOString() }))
    .catch((error) => setStatus({ kind: "error", message: describeError(error) }));
});

async function writeFile(handle: FileSystemDirectoryHandle, state: TradeState): Promise<void> {
  const fileHandle = await handle.getFileHandle(FILE_NAME, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(backupToJson(state));
  await writable.close();
}

/** `undefined` means the file doesn't exist yet — not the same as a read/parse failure. */
async function tryReadFile(handle: FileSystemDirectoryHandle): Promise<TradeState | undefined> {
  let fileHandle: FileSystemFileHandle;
  try {
    fileHandle = await handle.getFileHandle(FILE_NAME);
  } catch {
    return undefined;
  }
  const text = await (await fileHandle.getFile()).text();
  if (!text.trim()) return undefined;
  return parseBackup(text);
}

function hasData(state: TradeState): boolean {
  return state.trades.length > 0 || state.dividends.length > 0 || state.adjustments.length > 0;
}

function sameData(a: TradeState, b: TradeState): boolean {
  return (
    JSON.stringify(a.trades) === JSON.stringify(b.trades) &&
    JSON.stringify(a.dividends) === JSON.stringify(b.dividends) &&
    JSON.stringify(a.adjustments) === JSON.stringify(b.adjustments)
  );
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong talking to the folder.";
}

function setStatus(next: FolderStatus): void {
  status = next;
  for (const listener of statusListeners) listener();
}
