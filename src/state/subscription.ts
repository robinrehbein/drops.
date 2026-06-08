import { create } from 'zustand';
import { Storage } from 'expo-sqlite/kv-store';

export type SyncEntitlement = {
  /** Opaque bearer token issued by the sync server after payment. */
  token: string;
  /** UUID assigned to this device at pairing time. */
  deviceId: string;
  /** Base URL of the user's Coolify-hosted sync server, no trailing slash. */
  serverUrl: string;
  /** Unix ms expiry, 0 = no expiry set. When > 0 and in the past: lapsed. */
  expiresAt: number;
};

type SubscriptionState = {
  entitlement: SyncEntitlement | null;
  /** Activate Cloud Sync by storing a server-issued entitlement. */
  activate: (e: SyncEntitlement) => void;
  /** Deactivate Cloud Sync (e.g. after logout or subscription lapse). */
  deactivate: () => void;
};

const STORAGE_KEY = 'drop_sync_entitlement';

function readStored(): SyncEntitlement | null {
  try {
    const raw = Storage.getItemSync(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SyncEntitlement) : null;
  } catch {
    return null;
  }
}

function writeStored(e: SyncEntitlement | null): void {
  try {
    if (e) {
      Storage.setItemSync(STORAGE_KEY, JSON.stringify(e));
    } else {
      Storage.removeItemSync(STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export const useSubscriptionStore = create<SubscriptionState>()((set) => ({
  entitlement: readStored(),
  activate: (e) => {
    writeStored(e);
    set({ entitlement: e });
  },
  deactivate: () => {
    writeStored(null);
    set({ entitlement: null });
  },
}));

/** True when Cloud Sync is paid and the entitlement has not expired. */
export function useIsCloudSyncActive(): boolean {
  const e = useSubscriptionStore((s) => s.entitlement);
  if (!e) return false;
  if (e.expiresAt > 0 && e.expiresAt < Date.now()) return false;
  return true;
}
