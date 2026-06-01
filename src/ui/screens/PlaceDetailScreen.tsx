import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlace } from '@/features/places/hooks';
import { PlaceDetail } from '@/ui/screens/PlaceDetail';
import { useTheme } from '@/ui/theme/useTheme';

/** Legacy full-screen route (`/explore/[id]`), kept for deep links. The Explore
 *  flow now shows {@link PlaceDetail} inside a bottom sheet instead. */
export function PlaceDetailScreen({ id }: { id: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data: place } = usePlace(id);
  if (!place) return <View style={{ flex: 1, backgroundColor: theme.colors.paper }} />;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.paper }}
      contentContainerStyle={{ padding: theme.space.lg, paddingTop: insets.top + theme.space.lg }}
    >
      <PlaceDetail id={id} />
    </ScrollView>
  );
}
