import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useRepos } from '@/features/_provider/RepoProvider';
import type { BeanInput } from '@/domain/validators/bean';

const KEYS = {
  all: ['beans'] as const,
  one: (id: string) => ['beans', id] as const,
};

export function useBeans() {
  const { beans } = useRepos();
  return useQuery({ queryKey: KEYS.all, queryFn: () => beans.listBeans() });
}

export function useBean(id: string) {
  const { beans } = useRepos();
  return useQuery({ queryKey: KEYS.one(id), queryFn: () => beans.getBean(id), enabled: !!id });
}

export function useAddBean() {
  const { beans } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BeanInput) => beans.addBean(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdateBean() {
  const { beans } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<BeanInput> }) =>
      beans.updateBean(id, patch),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
      void qc.invalidateQueries({ queryKey: KEYS.one(id) });
    },
  });
}

export function useSoftDeleteBean() {
  const { beans } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => beans.softDeleteBean(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useRestoreBean() {
  const { beans } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => beans.restoreBean(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
