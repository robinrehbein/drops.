/**
 * Cost per shot in minor currency units, or null when inputs are missing/invalid.
 * shots = startWeightG / avgDoseG; costPerShot = round(pricePaidMinor / shots).
 */
export function costPerShot(args: {
  pricePaidMinor: number | null;
  startWeightG: number | null;
  avgDoseG: number | null;
}): number | null {
  const { pricePaidMinor, startWeightG, avgDoseG } = args;
  if (pricePaidMinor == null || startWeightG == null || avgDoseG == null) return null;
  if (avgDoseG <= 0 || startWeightG <= 0) return null;
  const shots = startWeightG / avgDoseG; // > 0 given the guards above
  return Math.round(pricePaidMinor / shots);
}
