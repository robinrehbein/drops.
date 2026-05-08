export type RoastLevel = 1 | 2 | 3 | 4 | 5;

const COEFFICIENT_MG_PER_G: Record<RoastLevel, number> = { 1: 12, 2: 11, 3: 10, 4: 9, 5: 8 };

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** Rough caffeine estimate in mg for a single shot. */
export function caffeineForShot(doseG: number, roastLevel: RoastLevel | null | undefined): number {
  if (!Number.isFinite(doseG) || doseG <= 0) return 0;
  const level = (roastLevel == null ? 3 : clamp(Math.round(roastLevel), 1, 5)) as RoastLevel;
  return Math.round(doseG * COEFFICIENT_MG_PER_G[level]);
}
