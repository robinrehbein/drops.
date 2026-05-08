import { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { useSnackbarStore } from '@/state/snackbar';
import { useTheme } from '@/ui/theme/useTheme';
import { Text } from './Text';

export function Snackbar() {
  const t = useTheme();
  const { message, action, dismiss } = useSnackbarStore();
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(dismiss, 4000);
    return () => clearTimeout(id);
  }, [message, dismiss]);
  if (!message) return null;
  return (
    <View
      style={{
        position: 'absolute', left: t.space.lg, right: t.space.lg, bottom: t.space.xxl,
        backgroundColor: t.colors.forestDeep,
        borderRadius: t.radii.md,
        padding: t.space.md,
        flexDirection: 'row', alignItems: 'center',
      }}
    >
      <Text variant="body" color={t.colors.paper} style={{ flex: 1 }}>{message}</Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={() => { action.onPress(); dismiss(); }}
          style={{ paddingLeft: t.space.md }}
        >
          <Text variant="bodyStrong" color={t.colors.forestPale}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
