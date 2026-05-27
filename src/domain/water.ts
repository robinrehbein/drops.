const DEFAULT_PUCK_ABSORPTION_PER_DOSE_G = 2;
const DEFAULT_FLUSH_ML = 20;

export type ShotWaterEstimateOptions = {
  puckAbsorptionMlPerDoseG?: number | undefined;
  flushMl?: number | undefined;
};

export function estimateShotWaterMl(
  doseG: number,
  yieldG: number,
  options: ShotWaterEstimateOptions = {},
): number {
  const puckAbsorptionMlPerDoseG =
    options.puckAbsorptionMlPerDoseG ?? DEFAULT_PUCK_ABSORPTION_PER_DOSE_G;
  const flushMl = options.flushMl ?? DEFAULT_FLUSH_ML;
  if (!Number.isFinite(doseG) || doseG <= 0) return Math.max(0, Math.round(yieldG || 0));
  if (!Number.isFinite(yieldG) || yieldG < 0) return Math.round(doseG * puckAbsorptionMlPerDoseG);
  return Math.round(yieldG + doseG * puckAbsorptionMlPerDoseG + flushMl);
}

export function formatVolume(ml: number): string {
  if (!Number.isFinite(ml)) return '0 ml';
  if (Math.abs(ml) >= 1000) return `${(ml / 1000).toFixed(1)} l`;
  return `${Math.round(ml)} ml`;
}
