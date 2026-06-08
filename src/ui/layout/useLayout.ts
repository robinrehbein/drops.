import { useWindowDimensions } from 'react-native';

export type LayoutSize = 'phone' | 'tablet' | 'tabletLarge';

export type Layout = {
  size: LayoutSize;
  width: number;
  height: number;
  isTablet: boolean;
  isLarge: boolean;
};

/**
 * Returns the current responsive layout tier based on screen width.
 *
 * Breakpoints:
 *   phone       < 768 px
 *   tablet      768–1023 px
 *   tabletLarge ≥ 1024 px
 */
export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  const size: LayoutSize =
    width >= 1024 ? 'tabletLarge' : width >= 768 ? 'tablet' : 'phone';
  return {
    size,
    width,
    height,
    isTablet: size !== 'phone',
    isLarge: size === 'tabletLarge',
  };
}
