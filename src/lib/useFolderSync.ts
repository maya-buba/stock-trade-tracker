"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  connectFolder,
  disconnectFolder,
  getFolderServerStatus,
  getFolderStatus,
  initFolderSync,
  reconnectFolder,
  resolveConflict,
  subscribeFolderStatus,
} from "./folderSync";

let initStarted = false;

export function useFolderSync() {
  const status = useSyncExternalStore(subscribeFolderStatus, getFolderStatus, getFolderServerStatus);

  useEffect(() => {
    if (initStarted) return;
    initStarted = true;
    void initFolderSync();
  }, []);

  return { status, connect: connectFolder, disconnect: disconnectFolder, reconnect: reconnectFolder, resolveConflict };
}
