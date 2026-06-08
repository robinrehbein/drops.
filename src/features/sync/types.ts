export type SyncStatus =
  | { kind: 'idle' }
  | { kind: 'syncing' }
  | { kind: 'success'; lastSyncAt: Date }
  | { kind: 'error'; message: string }
  | { kind: 'no_entitlement' };

export type ConnectedDevice = {
  deviceId: string;
  deviceName: string;
  platform: 'ios' | 'android' | string;
  lastSeenAt: Date;
};

/**
 * Rows that have changed since the last sync cursor.
 * Each table entry is an array of full row objects (serialised as JSON).
 */
export type SyncPayload = {
  deviceId: string;
  /** Unix ms of the last successful sync (0 = first sync). */
  cursorMs: number;
  beans: unknown[];
  brewSessions: unknown[];
  brewMilestones: unknown[];
  tastingNotes: unknown[];
  recipes: unknown[];
  machines: unknown[];
  maintenanceTasks: unknown[];
  maintenanceLogs: unknown[];
  waterEvents: unknown[];
  placeUserData: unknown[];
  /** Single preferences row or null. */
  preferences: unknown | null;
};

/**
 * What the server returns after processing a push.
 */
export type SyncResult = {
  /** New cursor to store locally — unix ms of the server's processing time. */
  serverCursorMs: number;
  /** All rows the server has that are newer than the device's cursor. */
  changes: Omit<SyncPayload, 'deviceId' | 'cursorMs'>;
  /** Devices the server knows about for this account. */
  devices: ConnectedDevice[];
};
