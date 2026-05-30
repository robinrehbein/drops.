import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PlaceInput, UserDataInput } from '@/domain/validators/place';
import { useRepos } from '@/features/_provider/RepoProvider';

const KEYS = {
  all: ['places'] as const,
  one: (id: string) => ['place', id] as const,
  cities: ['places', 'cities'] as const,
  wishlist: ['places', 'wishlist'] as const,
  visited: ['places', 'visited'] as const,
};

function invalidateAll(qc: ReturnType<typeof useQueryClient>, id?: string) {
  void qc.invalidateQueries({ queryKey: KEYS.all });
  void qc.invalidateQueries({ queryKey: KEYS.wishlist });
  void qc.invalidateQueries({ queryKey: KEYS.visited });
  if (id) void qc.invalidateQueries({ queryKey: KEYS.one(id) });
}

export function usePlaces() {
  const { places } = useRepos();
  return useQuery({ queryKey: KEYS.all, queryFn: () => places.listPlaces() });
}

export function usePlace(id: string) {
  const { places } = useRepos();
  return useQuery({ queryKey: KEYS.one(id), queryFn: () => places.getPlace(id), enabled: !!id });
}

export function useCities() {
  const { places } = useRepos();
  return useQuery({ queryKey: KEYS.cities, queryFn: () => places.listCities() });
}

export function useWishlist() {
  const { places } = useRepos();
  return useQuery({ queryKey: KEYS.wishlist, queryFn: () => places.listWishlist() });
}

export function useVisited() {
  const { places } = useRepos();
  return useQuery({ queryKey: KEYS.visited, queryFn: () => places.listVisited() });
}

export function useAddPlace() {
  const { places } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PlaceInput) => places.addPlace(input),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useToggleWishlist() {
  const { places } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => places.toggleWishlist(id),
    onSuccess: (_, id) => invalidateAll(qc, id),
  });
}

export function useSetUserData() {
  const { places } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UserDataInput }) =>
      places.setUserData(id, patch),
    onSuccess: (_, { id }) => invalidateAll(qc, id),
  });
}

export function useLinkBeanSource() {
  const { places } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ beanId, placeId }: { beanId: string; placeId: string | null }) =>
      places.linkBean(beanId, placeId),
    onSuccess: (_, { beanId }) => {
      void qc.invalidateQueries({ queryKey: ['beans'] });
      void qc.invalidateQueries({ queryKey: ['bean', beanId] });
    },
  });
}
