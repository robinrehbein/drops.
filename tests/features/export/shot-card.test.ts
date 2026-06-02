jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/tmp/cache/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { shareShotCard, type ShotCardInput } from '@/features/export/shot-card';

const sampleShot: ShotCardInput = {
  beanName: 'Ethiopia Yirgacheffe',
  roaster: 'Onyx Coffee Lab',
  doseG: 18.0,
  yieldG: 36.0,
  ratio: '1:2.00',
  durationS: 27.4,
  rating: 4,
  flavorTags: ['bergamot', 'jasmine', 'stone fruit'],
  date: 'May 8, 2026',
};

describe('shareShotCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes a text card to cache and shares it', async () => {
    await shareShotCard(sampleShot);

    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledTimes(1);
    const [path, contents] = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0];
    expect(path).toMatch(/^\/tmp\/cache\/drop-shot-/);
    expect(path).toMatch(/\.txt$/);

    // Verify text card format
    expect(contents).toContain('☕ DROP');
    expect(contents).toContain('Ethiopia Yirgacheffe · Onyx Coffee Lab');
    expect(contents).toContain('18.0g dose · 36.0g yield · 1:2.00');
    expect(contents).toContain('27.4s · ★★★★');
    expect(contents).toContain('bergamot · jasmine · stone fruit');
    expect(contents).toContain('May 8, 2026');

    expect(Sharing.shareAsync).toHaveBeenCalledTimes(1);
  });

  it('handles missing roaster', async () => {
    const shot: ShotCardInput = { ...sampleShot, roaster: null };
    await shareShotCard(shot);

    const contents = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][1];
    expect(contents).toContain('Ethiopia Yirgacheffe');
    expect(contents).not.toContain('· null');
  });

  it('handles missing rating by omitting stars', async () => {
    const shot: ShotCardInput = { ...sampleShot, rating: null };
    await shareShotCard(shot);

    const contents = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][1];
    // Should contain duration but no star characters
    expect(contents).toContain('27.4s');
    expect(contents).not.toContain('★');
  });

  it('handles empty flavor tags by omitting the line', async () => {
    const shot: ShotCardInput = { ...sampleShot, flavorTags: [] };
    await shareShotCard(shot);

    const contents = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][1];
    // The line after duration should be the date, not a flavor line
    const lines = contents.split('\n');
    const durationIdx = lines.findIndex((l: string) => l.includes('27.4s'));
    const afterDuration = lines[durationIdx + 1];
    // Should be the date line, not a flavor line
    expect(afterDuration).toBe('May 8, 2026');
  });
});
