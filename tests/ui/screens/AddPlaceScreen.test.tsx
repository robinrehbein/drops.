import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { RepoProvider } from '@/features/_provider/RepoProvider';
import { makePlacesRepo } from '@/features/places/repo';
import { AddPlaceScreen } from '@/ui/screens/AddPlaceScreen';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';
import { makeTestDb } from '@tests/helpers/test-db';

it('adds a place', async () => {
  const repo = makePlacesRepo(makeTestDb());
  const onDone = jest.fn();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrap = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <RepoProvider repos={{ places: repo } as never}>
        <ThemeProvider>{children}</ThemeProvider>
      </RepoProvider>
    </QueryClientProvider>
  );
  render(<AddPlaceScreen onDone={onDone} />, { wrapper: wrap });
  fireEvent.changeText(screen.getByPlaceholderText(/name/i), 'My Café');
  fireEvent.press(screen.getByText(/save/i));
  await waitFor(() => expect(onDone).toHaveBeenCalled());
  expect((await repo.listPlaces()).map((p) => p.name)).toContain('My Café');
});
