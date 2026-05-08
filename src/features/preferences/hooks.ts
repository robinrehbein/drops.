import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useRepos } from '@/features/_provider/RepoProvider';
import type { PreferencesUpdate } from './repo';

export function usePreferences() {
  const repos = useRepos();
  return useQuery({
    queryKey: ['preferences'],
    queryFn: () => repos.preferences.get(),
    staleTime: Infinity,
  });
}

export function useUpdatePreferences() {
  const repos = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: PreferencesUpdate) => repos.preferences.update(patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['preferences'] });
    },
  });
}
