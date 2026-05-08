import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Pressable, ScrollView } from 'react-native';

import appJson from '../../app.json';
import { usePreferences, useUpdatePreferences } from '@/features/preferences/hooks';
import { exportAllData } from '@/features/export/export';
import { exportDebugLog } from '@/lib/debug-log';
import { Sheet } from '@/ui/primitives/Sheet';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

export default function Settings() {
  const t = useTheme();
  const router = useRouter();
  const { data: prefs } = usePreferences();
  const updatePrefs = useUpdatePreferences();

  const sendReport = async () => {
    const text = exportDebugLog();
    const path = `${FileSystem.cacheDirectory}brewlog-debug.txt`;
    await FileSystem.writeAsStringAsync(path, text);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: 'text/plain', dialogTitle: 'Brewlog debug log' });
    }
  };

  const cycleWeightUnit = () => {
    updatePrefs.mutate({ weightUnit: prefs?.weightUnit === 'g' ? 'oz' : 'g' });
  };

  const cycleDefaultRatio = () => {
    const next = ((prefs?.defaultRatio ?? 2) + 0.5);
    updatePrefs.mutate({ defaultRatio: next > 4 ? 1 : next });
  };

  return (
    <Sheet>
      <Text variant="title">Settings</Text>
      <ScrollView contentContainerStyle={{ gap: t.space.md, marginTop: t.space.lg }}>
        <Row label="Weight unit" value={prefs?.weightUnit ?? 'g'} onPress={cycleWeightUnit} />
        <Row label="Default ratio" value={`1:${(prefs?.defaultRatio ?? 2).toFixed(1)}`} onPress={cycleDefaultRatio} />
        <Row label="Extraction model TDS" value={`${((prefs?.tdsAssumed ?? 0.09) * 100).toFixed(1)}%`} />
        <Row label="Theme" value="Earthy Forest" />
        <Row label="Send diagnostic report" value="↗" onPress={sendReport} />
        <Row label="Export all data (JSON)" value="↗" onPress={async () => { try { await exportAllData(); } catch { /* cancelled */ } }} />
        <Row label="About" value={`Brewlog v${appJson.expo.version}`} />
      </ScrollView>
      <Pressable onPress={() => router.back()} style={{ alignItems: 'center', padding: t.space.md, marginTop: t.space.lg }}>
        <Text variant="bodyStrong" color={t.colors.forest}>Done</Text>
      </Pressable>
    </Sheet>
  );
}

function Row({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: t.space.md,
        borderBottomWidth: 1, borderBottomColor: t.colors.paperEdge,
      }}
    >
      <Text variant="body">{label}</Text>
      <Text variant="caption">{value}</Text>
    </Pressable>
  );
}
