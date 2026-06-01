import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import type { ReactNode } from 'react';

import { useDeviceLocation } from '@/features/location/hooks';

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

it('returns a null origin when permission is denied', async () => {
  const { result } = renderHook(() => useDeviceLocation(), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.origin).toBeNull();
});

it('returns the device coordinates when permission is granted', async () => {
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
    status: 'granted',
  });
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValueOnce({
    coords: { latitude: 48.7758, longitude: 9.1829 },
  });

  const { result } = renderHook(() => useDeviceLocation(), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.origin).not.toBeNull());
  expect(result.current.origin).toEqual({ lat: 48.7758, lng: 9.1829 });
});
