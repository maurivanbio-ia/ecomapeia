import React, { createContext, useContext, ReactNode } from "react";
import { useAutoSync, AutoSyncState } from "@/hooks/useAutoSync";

const AutoSyncContext = createContext<AutoSyncState | null>(null);

export function AutoSyncProvider({ children }: { children: ReactNode }) {
  const autoSync = useAutoSync();
  return (
    <AutoSyncContext.Provider value={autoSync}>
      {children}
    </AutoSyncContext.Provider>
  );
}

export function useAutoSyncContext(): AutoSyncState {
  const ctx = useContext(AutoSyncContext);
  if (!ctx) throw new Error("useAutoSyncContext must be inside AutoSyncProvider");
  return ctx;
}
