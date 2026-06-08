import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  useIsCloudSyncActive,
  useSubscriptionStore,
} from '@/state/subscription';
import { fetchConnectedDevices, getLastSyncDate, performSync } from './service';
import type { ConnectedDevice, SyncStatus } from './types';

const SYNC_QUERY_KEY = ['sync', 'status'] as const;
const DEVICES_QUERY_KEY = ['sync', 'devices'] as const;

/**
 * Returns the current sync status and the last sync date read from the KV store.
 * Refreshes whenever a sync completes.
 */
export function useSyncStatus(): {
  status: SyncStatus;
  lastSyncAt: Date | null;
} {
  const isActive = useIsCloudSyncActive();
  const [status, setStatus] = useState<SyncStatus>(
    isActive ? { kind: 'idle' } : { kind: 'no_entitlement' },
  );
  const lastSyncAt = getLastSyncDate();

  useEffect(() => {
    setStatus(isActive ? { kind: 'idle' } : { kind: 'no_entitlement' });
  }, [isActive]);

  return { status, lastSyncAt };
}

/**
 * Triggers a manual sync. Returns a mutation you can call from UI.
 * The query client is invalidated after a successful sync so all dependent
 * hooks re-fetch fresh data.
 */
export function useTriggerSync() {
  const entitlement = useSubscriptionStore((s) => s.entitlement);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!entitlement) throw new Error('No sync entitlement');
      await performSync(entitlement);
    },
    onSuccess: () => {
      // Invalidate all local data queries so screens reflect synced state
      void qc.invalidateQueries();
    },
  });
}

/**
 * Fetches the list of devices connected to the same sync account.
 * Only runs when Cloud Sync is active.
 */
export function useConnectedDevices(): {
  devices: ConnectedDevice[];
  isLoading: boolean;
  error: Error | null;
} {
  const entitlement = useSubscriptionStore((s) => s.entitlement);
  const isActive = useIsCloudSyncActive();

  const { data, isLoading, error } = useQuery({
    queryKey: DEVICES_QUERY_KEY,
    queryFn: () => fetchConnectedDevices(entitlement!),
    enabled: isActive && !!entitlement,
    staleTime: 60_000,
  });

  return {
    devices: data ?? [],
    isLoading,
    error: error as Error | null,
  };
}

/**
 * Runs a background sync on a given interval (default: every 5 minutes).
 * Silently swallows errors — a status indicator elsewhere shows failures.
 */
export function useAutoSync(intervalMs = 5 * 60 * 1000): void {
  const entitlement = useSubscriptionStore((s) => s.entitlement);
  const isActive = useIsCloudSyncActive();
  const trigger = useTriggerSync();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isActive || !entitlement) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      trigger.mutate();
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, entitlement, intervalMs]);
}
