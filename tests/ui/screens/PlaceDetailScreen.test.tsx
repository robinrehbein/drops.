import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { RepoProvider } from '@/features/_provider/RepoProvider';
import { makePlacesRepo } from '@/features/places/repo';
import { PlaceDetailScreen } from '@/ui/screens/PlaceDetailScreen';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';
import { makeTestDb } from '@tests/helpers/test-db';

it('shows a place and toggles wishlist', async () => {
  const repo = makePlacesRepo(makeTestDb());
  const p = await repo.addPlace({ name: 'Mókuska', kind: 'cafe', city: 'Stuttgart' });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrap = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <RepoProvider repos={{ places: repo } as never}>
        <ThemeProvider>{children}</ThemeProvider>
      </RepoProvider>
    </QueryClientProvider>
  );
  render(<PlaceDetailScreen id={p.id} />, { wrapper: wrap });
  await waitFor(() => expect(screen.getByText('Mókuska')).toBeTruthy());
  fireEvent.press(screen.getByTestId('toggle-wishlist'));
  await waitFor(() => expect(screen.getByText(/on wishlist/i)).toBeTruthy());
});
