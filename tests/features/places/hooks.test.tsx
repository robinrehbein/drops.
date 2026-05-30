import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { RepoProvider } from '@/features/_provider/RepoProvider';
import { useAddPlace, usePlaces, useToggleWishlist } from '@/features/places/hooks';
import { makePlacesRepo } from '@/features/places/repo';
import { makeTestDb } from '@tests/helpers/test-db';

function wrapper(repos: { places: ReturnType<typeof makePlacesRepo> }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <RepoProvider repos={repos as never}>{children}</RepoProvider>
    </QueryClientProvider>
  );
}

it('usePlaces reflects an added place and wishlist toggle', async () => {
  const repos = { places: makePlacesRepo(makeTestDb()) };
  const w = wrapper(repos);
  const add = renderHook(() => useAddPlace(), { wrapper: w });
  await act(async () => {
    await add.result.current.mutateAsync({ name: 'Misch', kind: 'cafe', city: 'Stuttgart' });
  });

  const list = renderHook(() => usePlaces(), { wrapper: w });
  await waitFor(() => expect(list.result.current.data?.length).toBe(1));

  const place = list.result.current.data?.[0];
  expect(place).toBeDefined();
  const id = place!.id;
  const toggle = renderHook(() => useToggleWishlist(), { wrapper: w });
  await act(async () => {
    await toggle.result.current.mutateAsync(id);
  });
  await waitFor(() => expect(list.result.current.data?.[0]?.userData?.wishlisted).toBe(true));
});
