/** Brew ratio expressed as yield/dose. Returns null for invalid inputs. */
export function brewRatio(doseG: number, yieldG: number): number | null {
  if (!Number.isFinite(doseG) || doseG <= 0) return null;
  if (!Number.isFinite(yieldG) || yieldG < 0) return null;
  return yieldG / doseG;
}

/** Render a ratio as `1:N.NN`. Null → em-dash. */
export function formatRatio(ratio: number | null): string {
  if (ratio === null) return '—';
  return `1:${ratio.toFixed(2)}`;
}
