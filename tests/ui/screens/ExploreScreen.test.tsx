import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

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
    { osmId: 'n1', name: 'Mókuska', kind: 'cafe', city: 'Stuttgart', curated: true },
    { osmId: 'n2', name: 'Starbucks', kind: 'cafe', city: 'Stuttgart', curated: false },
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
