import {
  default as BottomSheet,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useCallback, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      onChange={handleChange}
      backgroundStyle={{ backgroundColor: theme.colors.paper }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.paperEdge }}
      style={{ zIndex: 20, elevation: 20 }}
    >
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
