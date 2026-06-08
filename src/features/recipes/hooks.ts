import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useRepos } from '@/features/_provider/RepoProvider';
import type { SaveRecipeArgs } from './repo';

/** Invalidate everything that reflects a bean's recipes. */
function useInvalidateBeanRecipes() {
  const qc = useQueryClient();
  return (beanId: string) => {
    void qc.invalidateQueries({ queryKey: ['recipe', beanId] });
    void qc.invalidateQueries({ queryKey: ['recipes', beanId] });
    void qc.invalidateQueries({ queryKey: ['bean', beanId] });
    void qc.invalidateQueries({ queryKey: ['beans'] });
  };
}

/** The bean's default recipe (falls back to its newest). */
export function useRecipeForBean(beanId: string | null) {
  const { recipes } = useRepos();
  return useQuery({
    queryKey: ['recipe', beanId],
    queryFn: () => (beanId ? recipes.getForBean(beanId) : null),
    enabled: !!beanId,
  });
}

/** All live recipes for a bean, newest first. */
export function useRecipesForBean(beanId: string | null) {
  const { recipes } = useRepos();
  return useQuery({
    queryKey: ['recipes', beanId],
    queryFn: () => (beanId ? recipes.listForBean(beanId) : []),
    enabled: !!beanId,
  });
}

/** Create a recipe from manual entry (or any explicit args). */
export function useCreateRecipe() {
  const { recipes } = useRepos();
  const invalidate = useInvalidateBeanRecipes();
  return useMutation({
    mutationFn: (args: SaveRecipeArgs) => recipes.create(args),
    onSuccess: (data) => invalidate(data.beanId),
  });
}

/** Create a new recipe copied from a finished session. */
export function useSaveRecipeFromSession() {
  const { recipes } = useRepos();
  const invalidate = useInvalidateBeanRecipes();
  return useMutation({
    mutationFn: ({
      sessionId,
      name,
      notes,
    }: {
      sessionId: string;
      name?: string | null;
      notes?: string | null;
    }) => recipes.createFromSession(sessionId, { name: name ?? null, notes: notes ?? null }),
    onSuccess: (data) => invalidate(data.beanId),
  });
}

export function useUpdateRecipe() {
  const { recipes } = useRepos();
  const invalidate = useInvalidateBeanRecipes();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<SaveRecipeArgs> }) =>
      recipes.updateRecipe(id, patch),
    onSuccess: (data) => invalidate(data.beanId),
  });
}

export function useSetDefaultRecipe() {
  const { recipes } = useRepos();
  const invalidate = useInvalidateBeanRecipes();
  return useMutation({
    mutationFn: ({ beanId, recipeId }: { beanId: string; recipeId: string }) =>
      recipes.setDefault(beanId, recipeId),
    onSuccess: (_data, { beanId }) => invalidate(beanId),
  });
}

export function useDeleteRecipe() {
  const { recipes } = useRepos();
  const invalidate = useInvalidateBeanRecipes();
  return useMutation({
    mutationFn: ({ id }: { id: string; beanId: string }) => recipes.deleteRecipe(id),
    onSuccess: (_data, { beanId }) => invalidate(beanId),
  });
}
