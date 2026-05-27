export type TastingAxes = {
  mouthfeel: number;
  acidity: number;
  sweetness: number;
  bitterness: number;
  balance: number;
};

export type TastingNoteLike = Partial<TastingAxes>;

const AXES = ['mouthfeel', 'acidity', 'sweetness', 'bitterness', 'balance'] as const;

/**
 * Averages each tasting axis (1–5) across the notes that have it set. Each axis is
 * averaged independently over only its non-null values; an axis with no values is 0.
 * Returns null when no note contributes any axis. Values round to one decimal.
 */
export function tastingRadar(notes: TastingNoteLike[]): TastingAxes | null {
  let anyContribution = false;
  const result = {} as TastingAxes;
  for (const axis of AXES) {
    const vals = notes
      .map((n) => n[axis])
      .filter((v): v is number => typeof v === 'number');
    if (vals.length > 0) anyContribution = true;
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    result[axis] = Math.round(avg * 10) / 10;
  }
  return anyContribution ? result : null;
}
