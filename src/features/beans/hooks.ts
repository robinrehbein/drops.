import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useRepos } from '@/features/_provider/RepoProvider';
import type { BeanFilter } from '@/features/beans/repo';
import type { BeanInput } from '@/domain/validators/bean';

const KEYS = {
  all: (filter?: BeanFilter): readonly string[] => (filter ? ['beans', filter] : ['beans']),
  one: (id: string): readonly string[] => ['bean', id],
};

export function useBeans(filter: BeanFilter = 'active') {
  const { beans } = useRepos();
  return useQuery({ queryKey: KEYS.all(filter), queryFn: () => beans.listBeans(filter) });
}

export function useBean(id: string) {
  const { beans } = useRepos();
  return useQuery({ queryKey: KEYS.one(id), queryFn: () => beans.getBean(id), enabled: !!id });
}

export function useBeansBySourcePlace(placeId: string) {
  const { beans } = useRepos();
  return useQuery({
    queryKey: ['beans', 'source', placeId],
    queryFn: () => beans.listBySourcePlace(placeId),
    enabled: !!placeId,
  });
}

export function useSetBeanStatus() {
  const { beans } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'finished' | 'archived' }) =>
      beans.setStatus(id, status),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: KEYS.all() });
      void qc.invalidateQueries({ queryKey: KEYS.one(id) });
    },
  });
}

export function useSetWouldBuyAgain() {
  const { beans } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean | null }) =>
      beans.setWouldBuyAgain(id, value),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: KEYS.all() });
      void qc.invalidateQueries({ queryKey: KEYS.one(id) });
    },
  });
}

export function useAddBean() {
  const { beans } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BeanInput) => beans.addBean(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  });
}

export function useUpdateBean() {
  const { beans } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<BeanInput> }) =>
      beans.updateBean(id, patch),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: KEYS.all() });
      void qc.invalidateQueries({ queryKey: KEYS.one(id) });
    },
  });
}

export function useSoftDeleteBean() {
  const { beans } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => beans.softDeleteBean(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  });
}

export function useRestoreBean() {
  const { beans } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => beans.restoreBean(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all() }),
  });
}
