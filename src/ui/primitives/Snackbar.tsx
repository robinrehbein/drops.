import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSnackbarStore } from '@/state/snackbar';
import { useTheme } from '@/ui/theme/useTheme';
import { Text } from './Text';

export function Snackbar() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
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
        position: 'absolute',
        left: t.space.lg,
        right: t.space.lg,
        // Float above the home indicator / gesture bar; fall back to
        // a comfortable spacing if no inset is reported.
        bottom: insets.bottom + t.space.lg,
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
