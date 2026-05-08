import { useRouter } from 'expo-router';
import { Pressable, ScrollView } from 'react-native';

import appJson from '../../app.json';
import { Sheet } from '@/ui/primitives/Sheet';
import { Text } from '@/ui/primitives/Text';
import { useTheme } from '@/ui/theme/useTheme';

export default function Settings() {
  const t = useTheme();
  const router = useRouter();
  return (
    <Sheet>
      <Text variant="title">Settings</Text>
      <ScrollView contentContainerStyle={{ gap: t.space.md, marginTop: t.space.lg }}>
        <Row label="Weight unit" value="g" />
        <Row label="Theme" value="Earthy Forest" />
        <Row label="Default ratio" value="1:2.0" />
        <Row label="Send diagnostic report" value="↗" />
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
