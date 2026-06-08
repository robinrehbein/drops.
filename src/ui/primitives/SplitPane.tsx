import { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { useLayout } from '@/ui/layout/useLayout';
import { useTheme } from '@/ui/theme/useTheme';

export type SplitPaneProps = {
  /** The list / sidebar panel (left on tablet). */
  list: ReactNode;
  /** The detail panel (right on tablet, hidden on phone when no detail). */
  detail: ReactNode | null;
  /** Width ratio for the list pane (0–1). Defaults to 0.38 */
  listRatio?: number;
  /** When true, phone layout shows `detail` instead of `list`. */
  showDetailOnPhone?: boolean;
};

/**
 * Adaptive split-pane container.
 *
 * - **Phone:** renders `list` or `detail` (stacked navigation, controlled by
 *   the router or `showDetailOnPhone`).
 * - **Tablet / tabletLarge:** renders `list` on the left and `detail` on the
 *   right, separated by a 1px divider.
 */
export function SplitPane({
  list,
  detail,
  listRatio = 0.38,
  showDetailOnPhone = false,
}: SplitPaneProps) {
  const { isTablet } = useLayout();
  const t = useTheme();

  if (!isTablet) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.paper }}>
        {showDetailOnPhone ? (detail ?? list) : list}
      </View>
    );
  }

  const divider: ViewStyle = {
    width: 1,
    backgroundColor: t.colors.paperEdge,
  };

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: t.colors.paper }}>
      <View style={{ flex: listRatio }}>{list}</View>
      <View style={divider} />
      <View style={{ flex: 1 - listRatio }}>{detail}</View>
    </View>
  );
}
