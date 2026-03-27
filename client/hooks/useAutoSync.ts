import { useEffect, useRef, useCallback, useState } from "react";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import { syncPendingVistorias, getPendingCount } from "@/lib/offlineStorage";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/hooks/useAuth";

export type SyncStatus = "idle" | "syncing" | "success" | "error" | "offline";

export interface AutoSyncState {
  isConnected: boolean;
  isSyncing: boolean;
  syncStatus: SyncStatus;
  lastSyncAt: Date | null;
  pendingCount: number;
  triggerSync: () => Promise<void>;
}

export function useAutoSync(): AutoSyncState {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const userRef = useRef(user);
  const isSyncingRef = useRef(false);
  const prevConnected = useRef<boolean | null>(null);
  const syncDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const performSync = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser?.id || isSyncingRef.current) return;

    const cached = queryClient.getQueryData<any[]>(
      [`/api/vistorias?usuario_id=${currentUser.id}`]
    ) ?? [];
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

  useEffect(() => {
    getPendingCount().then(setPendingCount);
  }, []);

  useEffect(() => {
    const scheduleSync = (delay: number) => {
      if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
      syncDebounceRef.current = setTimeout(performSync, delay);
    };

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected =
        state.isConnected === true && state.isInternetReachable !== false;
      setIsConnected(connected);

      if (connected && prevConnected.current === false) {
        scheduleSync(1500);
      }

      if (!connected) {
        setSyncStatus("offline");
      }

      prevConnected.current = connected;
    });

    NetInfo.fetch().then((state: NetInfoState) => {
      const connected =
        state.isConnected === true && state.isInternetReachable !== false;
      setIsConnected(connected);
      prevConnected.current = connected;
      if (connected) {
        scheduleSync(3000);
      } else {
        setSyncStatus("offline");
      }
    });

    return () => {
      unsubscribe();
      if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
    };
  }, [performSync]);

  return {
    isConnected,
    isSyncing,
    syncStatus,
    lastSyncAt,
    pendingCount,
    triggerSync: performSync,
  };
}
