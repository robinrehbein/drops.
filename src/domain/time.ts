export const elapsedMs = (startEpochMs: number, nowEpochMs: number): number =>
  Math.max(0, nowEpochMs - startEpochMs);

export const secondsBetween = (startMs: number, endMs: number): number =>
  Math.max(0, (endMs - startMs) / 1000);
