export const DEFAULT_TDS_ASSUMED = 0.09;

/** Returns extraction yield as a fraction in [0, 1]. Null if dose invalid. */
export function extractionPercent(
  doseG: number,
  yieldG: number,
  tdsAssumed: number = DEFAULT_TDS_ASSUMED,
): number | null {
  if (!Number.isFinite(doseG) || doseG <= 0) return null;
  if (!Number.isFinite(yieldG) || yieldG <= 0) return 0;
  const raw = (yieldG * tdsAssumed) / doseG;
  if (raw > 1) return 1;
  return raw;
}
