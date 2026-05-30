import { useLastShotForBean, useTastingNotes } from '@/features/brew/hooks';
import { usePreferences } from '@/features/preferences/hooks';
import { useRecipeForBean } from '@/features/recipes/hooks';
import {
  buildShotSignal,
  dialingAdvice,
  resolveDialingTarget,
  type DialingAdvice,
} from '@/domain/dialing';

export type DialingAdviceResult = {
  advice: DialingAdvice | null;
  lastShot: ReturnType<typeof useLastShotForBean>['data'];
};

/**
 * Composes the bean's latest shot, its tasting note, the bean recipe, and preferences
 * into a DialingAdvice. Returns `{ advice: null }` until data is loaded or when the bean
 * has no prior shot (the screen then shows the empty espresso tip).
 */
export function useDialingAdvice(beanId: string | null): DialingAdviceResult {
  const { data: lastShot } = useLastShotForBean(beanId);
  const { data: note } = useTastingNotes(lastShot?.id ?? '');
  const { data: recipe } = useRecipeForBean(beanId);
  const { data: prefs } = usePreferences();

  if (!lastShot || !prefs) return { advice: null, lastShot };

  const target = resolveDialingTarget(recipe ?? null, {
    dialTimeMinS: prefs.dialTimeMinS,
    dialTimeMaxS: prefs.dialTimeMaxS,
    defaultRatio: prefs.defaultRatio,
  });
  const signal = buildShotSignal(lastShot, note ?? null);
  return { advice: dialingAdvice(signal, target), lastShot };
}
