import AsyncStorage from "@react-native-async-storage/async-storage";

const OFFLINE_VISTORIAS_KEY = "offline_vistorias";
const PENDING_SYNC_KEY = "pending_sync_ids";

export interface OfflineVistoria {
  id: string;
  data: any;
  createdAt: string;
  syncStatus: "pending" | "synced" | "error";
}

export async function saveVistoriaOffline(vistoria: any): Promise<string> {
  try {
    const existing = await getOfflineVistorias();
    const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const offlineVistoria: OfflineVistoria = {
      id,
      data: { ...vistoria, id },
      createdAt: new Date().toISOString(),
      syncStatus: "pending",
    };
    
    existing.push(offlineVistoria);
    await AsyncStorage.setItem(OFFLINE_VISTORIAS_KEY, JSON.stringify(existing));
    
    const pendingIds = await getPendingSyncIds();
    pendingIds.push(id);
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pendingIds));
    
    return id;
  } catch (error) {
    console.error("Error saving offline vistoria:", error);
    throw error;
  }
}

export async function getOfflineVistorias(): Promise<OfflineVistoria[]> {
  try {
    const data = await AsyncStorage.getItem(OFFLINE_VISTORIAS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting offline vistorias:", error);
    return [];
  }
}

export async function getPendingSyncIds(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting pending sync ids:", error);
    return [];
  }
}

export async function getPendingCount(): Promise<number> {
  const ids = await getPendingSyncIds();
  return ids.length;
}

export async function markAsSynced(id: string): Promise<void> {
  try {
    const vistorias = await getOfflineVistorias();
    const updated = vistorias.map((v) =>
      v.id === id ? { ...v, syncStatus: "synced" as const } : v
    );
    await AsyncStorage.setItem(OFFLINE_VISTORIAS_KEY, JSON.stringify(updated));
    
    const pendingIds = await getPendingSyncIds();
    const filteredIds = pendingIds.filter((pid) => pid !== id);
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(filteredIds));
  } catch (error) {
    console.error("Error marking as synced:", error);
    throw error;
  }
}

export async function markAsError(id: string): Promise<void> {
  try {
    const vistorias = await getOfflineVistorias();
    const updated = vistorias.map((v) =>
      v.id === id ? { ...v, syncStatus: "error" as const } : v
    );
    await AsyncStorage.setItem(OFFLINE_VISTORIAS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Error marking as error:", error);
  }
}

export async function removeOfflineVistoria(id: string): Promise<void> {
  try {
    const vistorias = await getOfflineVistorias();
    const filtered = vistorias.filter((v) => v.id !== id);
    await AsyncStorage.setItem(OFFLINE_VISTORIAS_KEY, JSON.stringify(filtered));
    
    const pendingIds = await getPendingSyncIds();
    const filteredIds = pendingIds.filter((pid) => pid !== id);
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(filteredIds));
  } catch (error) {
    console.error("Error removing offline vistoria:", error);
  }
}

export async function syncPendingVistorias(
  syncFn: (data: any) => Promise<any>
): Promise<{ synced: number; errors: number }> {
  const vistorias = await getOfflineVistorias();
  const pending = vistorias.filter((v) => v.syncStatus === "pending");
  
  let synced = 0;
  let errors = 0;
  
  for (const vistoria of pending) {
    try {
      await syncFn(vistoria.data);
      await markAsSynced(vistoria.id);
      synced++;
    } catch (error) {
      console.error("Error syncing vistoria:", vistoria.id, error);
      await markAsError(vistoria.id);
      errors++;
    }
  }
  
  return { synced, errors };
}
