// Mock expo native modules
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/tmp/cache/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock the DB client so exportAllData doesn't try to open expo-sqlite
jest.mock('@/db/client', () => ({
  getDb: jest.fn(() => {
    const { makeTestDb } = jest.requireActual('@tests/helpers/test-db');
    return makeTestDb();
  }),
}));

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { exportAllData } from '@/features/export/export';

describe('exportAllData', () => {
  it('writes a JSON file with all non-deleted beans, sessions, milestones, tasting notes, and preferences', async () => {
    await exportAllData();

    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledTimes(1);
    const [path, contents] = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0];
    expect(path).toMatch(/^\/tmp\/cache\/drop-export-/);
    expect(path).toMatch(/\.json$/);

    const payload = JSON.parse(contents);
    expect(payload).toHaveProperty('exportedAt');
    expect(payload).toHaveProperty('version', 1);
    expect(payload).toHaveProperty('beans');
    expect(payload).toHaveProperty('sessions');
    expect(payload).toHaveProperty('milestones');
    expect(payload).toHaveProperty('tastingNotes');
    expect(payload).toHaveProperty('preferences');
  });

  it('shares the file via expo-sharing', async () => {
    jest.clearAllMocks();
    await exportAllData();

    expect(Sharing.isAvailableAsync).toHaveBeenCalledTimes(1);
    expect(Sharing.shareAsync).toHaveBeenCalledTimes(1);
    const [path, options] = (Sharing.shareAsync as jest.Mock).mock.calls[0];
    expect(path).toMatch(/drop-export-.*\.json$/);
    expect(options.mimeType).toBe('application/json');
    expect(options.dialogTitle).toBe('Export Drop Data');
  });

  it('skips sharing when share sheet is unavailable', async () => {
    jest.clearAllMocks();
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);

    await exportAllData();

    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledTimes(1);
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });
});
