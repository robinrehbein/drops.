import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useRepos } from '@/features/_provider/RepoProvider';
import type { SaveRecipeArgs } from './repo';

export function useRecipeForBean(beanId: string | null) {
  const { recipes } = useRepos();
  return useQuery({
    queryKey: ['recipe', beanId],
    queryFn: () => (beanId ? recipes.getForBean(beanId) : null),
    enabled: !!beanId,
  });
}

export function useSaveRecipeForBean() {
  const { recipes } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: SaveRecipeArgs) => recipes.saveForBean(args),
    onSuccess: (_data, args) => {
      qc.invalidateQueries({ queryKey: ['recipe', args.beanId] });
      qc.invalidateQueries({ queryKey: ['bean', args.beanId] });
      qc.invalidateQueries({ queryKey: ['beans'] });
    },
  });
}

export function useSaveRecipeFromSession() {
  const { recipes } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, notes }: { sessionId: string; notes?: string }) =>
      recipes.saveFromSession(sessionId, notes),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['recipe', data.beanId] });
      qc.invalidateQueries({ queryKey: ['bean', data.beanId] });
      qc.invalidateQueries({ queryKey: ['beans'] });
    },
  });
}

export function useClearRecipe() {
  const { recipes } = useRepos();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (beanId: string) => recipes.clearForBean(beanId),
    onSuccess: (_data, beanId) => {
      qc.invalidateQueries({ queryKey: ['recipe', beanId] });
      qc.invalidateQueries({ queryKey: ['bean', beanId] });
      qc.invalidateQueries({ queryKey: ['beans'] });
    },
  });
}
