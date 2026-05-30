import { useLocalSearchParams } from 'expo-router';

import { PlaceDetailScreen } from '@/ui/screens/PlaceDetailScreen';

export default function PlaceDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlaceDetailScreen id={id} />;
}
