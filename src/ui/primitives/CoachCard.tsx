import { View } from 'react-native';

import type { DialingAdvice, Verdict } from '@/domain/dialing';
import { useTheme } from '@/ui/theme/useTheme';
import { Surface } from './Surface';
import { Text } from './Text';

const EMPTY_TIP = 'Aim for ~1:2 in 25–30s. Tastes sour → grind finer; bitter → grind coarser.';

function accentFor(verdict: Verdict, t: ReturnType<typeof useTheme>): string {
  switch (verdict) {
    case 'dialed-in':
    case 'in-range':
      return t.colors.forest;
    case 'sour':
    case 'too-fast':
    case 'bitter':
    case 'too-slow':
      return t.colors.amber;
    default:
      return t.colors.forest;
  }
}

export function CoachCard({
  advice,
  children,
}: {
  advice: DialingAdvice | null;
  children?: React.ReactNode;
}) {
  const t = useTheme();

  if (!advice) {
    return (
      <Surface bg="paperDeep" padding="md" radius="md" bordered>
        <Text variant="label">COACH</Text>
        <Text testID="coach-empty-tip" variant="body" color={t.colors.inkSoft} style={{ marginTop: t.space.xs }}>
          {EMPTY_TIP}
        </Text>
      </Surface>
    );
  }

  const accent = accentFor(advice.verdict, t);

  return (
    <Surface bg="paperDeep" padding="md" radius="md" bordered>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="label">COACH</Text>
        {advice.confidence === 'low' ? (
          <Text testID="coach-low-confidence" variant="caption" color={t.colors.inkFaint}>
            low confidence
          </Text>
        ) : null}
      </View>
      <Text variant="heading" color={accent} style={{ marginTop: t.space.xs }}>
        {advice.primary.text}
      </Text>
      <Text variant="caption" color={t.colors.inkSoft} style={{ marginTop: 2 }}>
        {advice.rationale}
      </Text>
      {advice.secondary ? (
        <Text variant="caption" color={t.colors.inkSoft} style={{ marginTop: t.space.xs }}>
          {advice.secondary.text}
        </Text>
      ) : null}
      {children ? <View style={{ marginTop: t.space.md }}>{children}</View> : null}
    </Surface>
  );
}
