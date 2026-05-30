import { useRouter } from 'expo-router';

import { AddPlaceScreen } from '@/ui/screens/AddPlaceScreen';

export default function NewPlaceRoute() {
  const router = useRouter();
  return <AddPlaceScreen onDone={() => router.back()} />;
}
