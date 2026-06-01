import { default as BottomSheet, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useCallback, useMemo, useRef } from 'react';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePressAnimation } from '@/ui/icons/animations';
import { Icon } from '@/ui/icons/line';
import { PlaceDetail } from '@/ui/screens/PlaceDetail';
import { useTheme } from '@/ui/theme/useTheme';

/**
 * Detail sheet that rises from the bottom whenever `placeId` is set.
 * Snaps mid detail (50%) -> full detail (90%).
 */
export function PlaceDetailSheet({
  placeId,
  onClose,
}: {
  placeId: string | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const closeAnim = usePressAnimation();
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '90%'], []);

  const handleChange = useCallback(
    (index: number) => {
      if (index === -1) onClose();
    },
    [onClose],
  );

  if (!placeId) return null;

  return (
    <BottomSheet
      key={placeId}
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      onChange={handleChange}
      backgroundStyle={{ backgroundColor: theme.colors.paper }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.paperEdge }}
      style={{ zIndex: 20, elevation: 20 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        testID="place-detail-close"
        onPress={() => sheetRef.current?.close()}
        onPressIn={closeAnim.onPressIn}
        onPressOut={closeAnim.onPressOut}
        hitSlop={8}
        style={{
          position: 'absolute',
          top: theme.space.sm,
          right: theme.space.md,
          zIndex: 1,
          width: 28,
          height: 28,
          borderRadius: theme.radii.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.paperEdge,
        }}
      >
        <Animated.View style={closeAnim.style}>
          <Icon name="close" size={16} color={theme.colors.inkSoft} />
        </Animated.View>
      </Pressable>
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: theme.space.lg,
          paddingBottom: insets.bottom + theme.space.xl,
        }}
      >
        {placeId ? <PlaceDetail id={placeId} /> : null}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
