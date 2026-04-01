import { useEffect, useRef, useCallback, useState } from "react";
import NetInfo, { NetInfoState, NetInfoStateType } from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import { syncPendingVistorias, getPendingCount } from "@/lib/offlineStorage";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/hooks/useAuth";

export type SyncStatus = "idle" | "syncing" | "success" | "error" | "offline";
export type ConnectionType = "wifi" | "cellular_5g" | "cellular_4g" | "cellular" | "none" | "unknown";

export interface AutoSyncState {
  isConnected: boolean;
  connectionType: ConnectionType;
  isSyncing: boolean;
  syncStatus: SyncStatus;
  lastSyncAt: Date | null;
  pendingCount: number;
  triggerSync: () => Promise<void>;
}

// Auto-sync interval when connected (5 minutes)
const BACKGROUND_SYNC_INTERVAL_MS = 5 * 60 * 1000;

function resolveConnectionType(state: NetInfoState): ConnectionType {
  if (!state.isConnected) return "none";
  if (state.type === NetInfoStateType.wifi) return "wifi";
  if (state.type === NetInfoStateType.cellular) {
    const gen = (state.details as any)?.cellularGeneration as string | null;
    if (gen === "5g") return "cellular_5g";
    if (gen === "4g") return "cellular_4g";
    return "cellular";
  }
  return "unknown";
}

export function useAutoSync(): AutoSyncState {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState<ConnectionType>("unknown");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const userRef = useRef(user);
  const isSyncingRef = useRef(false);
  const prevConnected = useRef<boolean | null>(null);
  const syncDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backgroundSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const performSync = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser?.id || isSyncingRef.current) return;

    const cached =
      queryClient.getQueryData<any[]>([`/api/vistorias?usuario_id=${currentUser.id}`]) ?? [];
    const serverPending = cached.filter((v: any) => v.status_upload !== "synced").length;
    const offlinePending = await getPendingCount();

    if (offlinePending === 0 && serverPending === 0) {
      setSyncStatus("idle");
      return;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);
    setSyncStatus("syncing");

    try {
      if (offlinePending > 0) {
        await syncPendingVistorias(async (data: any) => {
          await apiRequest("POST", "/api/vistorias", data);
        });
      }
      if (serverPending > 0) {
        await apiRequest("POST", "/api/vistorias/sync", { usuario_id: currentUser.id });
      }

      await queryClient.invalidateQueries({
        queryKey: [`/api/vistorias?usuario_id=${currentUser.id}`],
      });

      const newPending = await getPendingCount();
      setPendingCount(newPending);
      setLastSyncAt(new Date());
      setSyncStatus("success");

      setTimeout(() => setSyncStatus("idle"), 4000);
    } catch {
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 5000);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [queryClient]);

  const scheduleSync = useCallback(
    (delay: number) => {
      if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
      syncDebounceRef.current = setTimeout(performSync, delay);
    },
    [performSync]
  );

  // Start / stop the background periodic sync based on connectivity
  const startBackgroundSync = useCallback(() => {
    if (backgroundSyncRef.current) return; // already running
    backgroundSyncRef.current = setInterval(performSync, BACKGROUND_SYNC_INTERVAL_MS);
  }, [performSync]);

  const stopBackgroundSync = useCallback(() => {
    if (backgroundSyncRef.current) {
      clearInterval(backgroundSyncRef.current);
      backgroundSyncRef.current = null;
    }
  }, []);

  useEffect(() => {
    getPendingCount().then(setPendingCount);
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected =
        state.isConnected === true && state.isInternetReachable !== false;
      const connType = resolveConnectionType(state);

      setIsConnected(connected);
      setConnectionType(connType);

      if (connected) {
        // Reconnected (was offline) → immediate sync after short debounce
        if (prevConnected.current === false) {
          scheduleSync(1500);
        }
        // Start background periodic sync
        startBackgroundSync();
      } else {
        setSyncStatus("offline");
        stopBackgroundSync();
      }

      prevConnected.current = connected;
    });

    // Initial check on mount
    NetInfo.fetch().then((state: NetInfoState) => {
      const connected =
        state.isConnected === true && state.isInternetReachable !== false;
      const connType = resolveConnectionType(state);

      setIsConnected(connected);
      setConnectionType(connType);
      prevConnected.current = connected;

      if (connected) {
        scheduleSync(3000); // first sync 3s after app opens
        startBackgroundSync();
      } else {
        setSyncStatus("offline");
      }
    });

    return () => {
      unsubscribe();
      if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
      stopBackgroundSync();
    };
  }, [performSync, scheduleSync, startBackgroundSync, stopBackgroundSync]);

  return {
    isConnected,
    connectionType,
    isSyncing,
    syncStatus,
    lastSyncAt,
    pendingCount,
    triggerSync: performSync,
  };
}
