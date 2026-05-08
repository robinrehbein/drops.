/** "MM:SS.t" — one decimal seconds. */
export function formatElapsed(ms: number): string {
  const safe = Math.max(0, ms);
  const totalTenths = Math.floor(safe / 100);
  const tenths = totalTenths % 10;
  const totalSeconds = Math.floor(totalTenths / 10);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(minutes)}:${pad(seconds)}.${tenths}`;
}

export function formatGrams(g: number | null): string {
  if (g === null || !Number.isFinite(g)) return '—';
  return `${g.toFixed(1)} g`;
}
