import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export type ShotCardInput = {
  beanName: string;
  roaster: string | null;
  doseG: number;
  yieldG: number;
  ratio: string;
  durationS: number;
  rating: number | null;
  flavorTags: string[];
  date: string;
};

function formatShotCard(data: ShotCardInput): string {
  const lines: string[] = [];

  lines.push('☕ DROP');

  // Bean name + roaster
  const header = data.roaster
    ? `${data.beanName} · ${data.roaster}`
    : data.beanName;
  lines.push(header);

  // Dose, yield, ratio
  lines.push(`${data.doseG.toFixed(1)}g dose · ${data.yieldG.toFixed(1)}g yield · ${data.ratio}`);

  // Duration + rating
  const durationStr = `${data.durationS.toFixed(1)}s`;
  const ratingStr = data.rating ? ` · ${'★'.repeat(data.rating)}` : '';
  lines.push(`${durationStr}${ratingStr}`);

  // Flavor tags
  if (data.flavorTags.length > 0) {
    lines.push(data.flavorTags.join(' · '));
  }

  lines.push(data.date);

  return lines.join('\n');
}

export async function shareShotCard(data: ShotCardInput): Promise<void> {
  const text = formatShotCard(data);
  const path = `${FileSystem.cacheDirectory}drop-shot-${Date.now()}.txt`;

  await FileSystem.writeAsStringAsync(path, text, { encoding: 'utf8' });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'text/plain',
      dialogTitle: 'Share Shot',
    });
  }
}
