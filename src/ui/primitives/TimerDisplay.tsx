import { useEffect, useState } from 'react';

import { formatElapsed } from '@/domain/format';
import { Text } from './Text';

export type TimerDisplayProps = {
  /** Anchor epoch ms; null when paused. */
  startedAtMs: number | null;
  /** Frozen elapsed (ms) when stopped. Overrides ticking when set. */
  frozenMs?: number | null;
};

export function TimerDisplay({ startedAtMs, frozenMs }: TimerDisplayProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAtMs === null || frozenMs != null) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [startedAtMs, frozenMs]);

  const elapsed = frozenMs ?? (startedAtMs ? Math.max(0, now - startedAtMs) : 0);
  return <Text variant="display">{formatElapsed(elapsed)}</Text>;
}
