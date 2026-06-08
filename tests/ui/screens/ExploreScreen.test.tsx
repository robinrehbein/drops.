import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';

import { RepoProvider } from '@/features/_provider/RepoProvider';
import { makePlacesRepo } from '@/features/places/repo';
import { ExploreScreen } from '@/ui/screens/ExploreScreen';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';
import { makeTestDb } from '@tests/helpers/test-db';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

async function setup() {
  const repo = makePlacesRepo(makeTestDb());
  await repo.upsertSeed([
    {
      osmId: 'n1',
      name: 'Mókuska',
      kind: 'cafe',
      city: 'Stuttgart',
      curated: true,
      lat: 48.77,
      lng: 9.18,
    },
    {
      osmId: 'n2',
      name: 'Starbucks',
      kind: 'cafe',
      city: 'Stuttgart',
      curated: false,
      lat: 48.78,
      lng: 9.19,
    },
  ]);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrap = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <RepoProvider repos={{ places: repo } as never}>
        <ThemeProvider>{children}</ThemeProvider>
      </RepoProvider>
    </QueryClientProvider>
  );
  return { wrap };
}

it('lists seeded places and filters by search', async () => {
  const { wrap } = await setup();
  render(<ExploreScreen />, { wrapper: wrap });
  await waitFor(() => expect(screen.getByText('Mókuska')).toBeTruthy());
  expect(screen.getByText('Starbucks')).toBeTruthy();
  fireEvent.changeText(screen.getByPlaceholderText(/search/i), 'mok');
  await waitFor(() => expect(screen.queryByText('Starbucks')).toBeNull());
  expect(screen.getByText('Mókuska')).toBeTruthy();
});

it('filters to curated via the status chip', async () => {
  const { wrap } = await setup();
  render(<ExploreScreen />, { wrapper: wrap });
  await waitFor(() => expect(screen.getByText('Starbucks')).toBeTruthy());
  fireEvent.press(screen.getByTestId('status-curated'));
  await waitFor(() => expect(screen.queryByText('Starbucks')).toBeNull());
  expect(screen.getByText('Mókuska')).toBeTruthy();
});

it('opens the detail sheet when a place is tapped', async () => {
  const { wrap } = await setup();
  render(<ExploreScreen />, { wrapper: wrap });
  await waitFor(() => expect(screen.getByText('Mókuska')).toBeTruthy());
  // Detail sheet is empty until a place is selected.
  expect(screen.queryByTestId('toggle-wishlist')).toBeNull();
  fireEvent.press(screen.getByText('Mókuska'));
  // Tapping the row mounts PlaceDetail in the detail sheet → quick actions appear.
  await waitFor(() => expect(screen.getByTestId('toggle-wishlist')).toBeTruthy());
});

it('opens the detail sheet when a map marker is tapped', async () => {
  const { wrap } = await setup();
  render(<ExploreScreen />, { wrapper: wrap });
  await waitFor(() => expect(screen.getAllByTestId('map-marker')).toHaveLength(2));
  expect(screen.queryByTestId('toggle-wishlist')).toBeNull();
  fireEvent.press(screen.getAllByTestId('map-marker')[0]);
  await waitFor(() => expect(screen.getByTestId('toggle-wishlist')).toBeTruthy());
});

it('shows map zoom controls above the follow-me button', async () => {
  const { wrap } = await setup();
  render(<ExploreScreen />, { wrapper: wrap });
  await waitFor(() => expect(screen.getByText('Mókuska')).toBeTruthy());

  expect(screen.getByTestId('map-zoom-in')).toBeTruthy();
  expect(screen.getByTestId('map-zoom-out')).toBeTruthy();
  expect(screen.getByTestId('sort-nearest')).toBeTruthy();
});

it('alerts (instead of failing silently) when location permission is denied', async () => {
  const { wrap } = await setup();
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
    status: 'denied',
  });
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  render(<ExploreScreen />, { wrapper: wrap });
  await waitFor(() => expect(screen.getByText('Mókuska')).toBeTruthy());

  fireEvent.press(screen.getByTestId('sort-nearest'));

  await waitFor(() => expect(alertSpy).toHaveBeenCalled());
  // No user-location puck when we never got a fix.
  expect(screen.queryByTestId('user-location')).toBeNull();
  alertSpy.mockRestore();
});

it('shows the user-location puck and never alerts when permission is granted', async () => {
  const { wrap } = await setup();
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
    status: 'granted',
  });
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValueOnce({
    coords: { latitude: 48.775, longitude: 9.185 },
  });
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  render(<ExploreScreen />, { wrapper: wrap });
  await waitFor(() => expect(screen.getByText('Mókuska')).toBeTruthy());

  fireEvent.press(screen.getByTestId('sort-nearest'));

  await waitFor(() => expect(screen.getByTestId('user-location')).toBeTruthy());
  expect(alertSpy).not.toHaveBeenCalled();
  alertSpy.mockRestore();
});

it('marks the locate button active after centring, then clears it when the user pans', async () => {
  const { wrap } = await setup();
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
    status: 'granted',
  });
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValueOnce({
    coords: { latitude: 48.775, longitude: 9.185 },
  });
  render(<ExploreScreen />, { wrapper: wrap });
  await waitFor(() => expect(screen.getByText('Mókuska')).toBeTruthy());

  // Inactive until the user asks to be located.
  expect(screen.getByTestId('sort-nearest').props.accessibilityState?.selected).toBe(false);

  fireEvent.press(screen.getByTestId('sort-nearest'));
  await waitFor(() =>
    expect(screen.getByTestId('sort-nearest').props.accessibilityState?.selected).toBe(true),
  );

  // A user pan (Google-Maps style) stops following without losing the puck.
  fireEvent.press(screen.getByTestId('map-pan-gesture'));
  await waitFor(() =>
    expect(screen.getByTestId('sort-nearest').props.accessibilityState?.selected).toBe(false),
  );
  expect(screen.getByTestId('user-location')).toBeTruthy();
});

it('falls back to the last known position when a fresh fix fails (emulator/cold GPS)', async () => {
  const { wrap } = await setup();
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
    status: 'granted',
  });
  (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValueOnce(
    new Error('location unavailable'),
  );
  (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValueOnce({
    coords: { latitude: 50.776, longitude: 6.083 },
  });
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  render(<ExploreScreen />, { wrapper: wrap });
  await waitFor(() => expect(screen.getByText('Mókuska')).toBeTruthy());

  fireEvent.press(screen.getByTestId('sort-nearest'));

  await waitFor(() => expect(screen.getByTestId('user-location')).toBeTruthy());
  expect(alertSpy).not.toHaveBeenCalled();
  alertSpy.mockRestore();
});
