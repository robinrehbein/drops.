import { usePathname, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/ui/icons/line';
import { Text } from './Text';
import { useTheme } from '@/ui/theme/useTheme';

export const RAIL_WIDTH = 88;

type NavItem = { segment: string; icon: IconName; label: string; href: string };

const NAV_ITEMS: NavItem[] = [
  { segment: '/', icon: 'cup', label: 'Daily', href: '/' },
  { segment: 'library', icon: 'book', label: 'Library', href: '/library' },
  { segment: 'lab', icon: 'flask', label: 'Lab', href: '/lab' },
  { segment: 'care', icon: 'wrench', label: 'Care', href: '/care' },
  { segment: 'explore', icon: 'pin', label: 'Explore', href: '/explore' },
];

/**
 * Side navigation rail for tablet layouts.
 *
 * Reads the active route from `usePathname()` and navigates with `useRouter()`.
 * Mounted alongside `<Tabs>` (with the bottom bar hidden) in the tabs layout.
 */
export function NavRail() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  // Derive the active segment from the pathname, e.g. '/library/abc' → 'library'
  const firstSegment = pathname === '/' ? '/' : (pathname.split('/')[1] ?? '/');

  return (
    <View
      style={{
        width: RAIL_WIDTH,
        backgroundColor: t.colors.paper,
        borderRightWidth: 1,
        borderRightColor: t.colors.paperEdge,
        paddingTop: insets.top + t.space.lg,
        paddingBottom: insets.bottom + t.space.lg,
        alignItems: 'center',
        gap: t.space.xs,
      }}
    >
      {NAV_ITEMS.map((item) => {
        const focused = firstSegment === item.segment;
        const color = focused ? t.colors.forest : t.colors.inkFaint;

        return (
          <Pressable
            key={item.segment}
            onPress={() => router.navigate(item.href as never)}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: focused }}
            style={({ pressed }) => ({
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: t.space.sm,
              paddingHorizontal: t.space.xs,
              borderRadius: t.radii.md,
              width: RAIL_WIDTH - t.space.md,
              gap: 4,
              backgroundColor: focused
                ? t.colors.paperDeep
                : pressed
                  ? t.colors.paperEdge
                  : 'transparent',
            })}
          >
            <Icon name={item.icon} color={color} size={22} />
            <Text
              variant="label"
              color={color}
              style={{ fontSize: 10, letterSpacing: 0.6 }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
