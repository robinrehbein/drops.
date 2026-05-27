export type CupsProgress = { filled: number; total: number; overshoot: number };

/**
 * Drives the Daily "match daily cups" widget. `filled` is the cups drawn full (capped at
 * the goal), `total` the goal (min 1), `overshoot` the shots beyond the goal.
 */
export function cupsTowardGoal(shotsToday: number, goal: number): CupsProgress {
  const total = Math.max(1, Math.floor(goal));
  const shots = Math.max(0, Math.floor(shotsToday));
  return {
    filled: Math.min(shots, total),
    total,
    overshoot: Math.max(0, shots - total),
  };
}
