import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useRepos } from '@/features/_provider/RepoProvider';

const KEYS = {
  summary: ['water', 'summary'] as const,
};

export function useWaterSummary() {
  const { water } = useRepos();
  return useQuery({
    queryKey: KEYS.summary,
    queryFn: () => water.summary(),
  });
}

export function useAddWaterRefill() {
  const { water } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (volumeMl: number) => water.addRefill(volumeMl),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.summary }),
  });
}

export function useAddFilterChange() {
  const { water } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => water.addFilterChange(),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.summary }),
  });
}

export function useAddFlush() {
  const { water } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (volumeMl: number) => water.addFlush(volumeMl),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.summary }),
  });
}
