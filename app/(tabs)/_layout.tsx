import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { useAutoSync } from '@/features/sync/hooks';
import { Icon, type IconName } from '@/ui/icons/line';
import { NavRail } from '@/ui/primitives/NavRail';
import { useLayout } from '@/ui/layout/useLayout';
import { useTheme } from '@/ui/theme/useTheme';

/** Mounts inside QueryProvider; triggers background sync every 5 minutes. */
function AutoSyncMount() {
  useAutoSync();
  return null;
}

export default function TabsLayout() {
  const t = useTheme();
  const { isTablet } = useLayout();
  const tabIcon = (name: IconName) => ({ color }: { color: string }) =>
    <Icon name={name} color={color} size={20} />;

  return (
    <View style={{ flex: 1, flexDirection: isTablet ? 'row' : 'column' }}>
      {isTablet ? <NavRail /> : null}
      <AutoSyncMount />
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            // Hide the bottom tab bar entirely on tablet — NavRail handles nav.
            tabBarStyle: isTablet
              ? { display: 'none' }
              : { backgroundColor: t.colors.paper, borderTopColor: t.colors.paperEdge },
            tabBarActiveTintColor: t.colors.forest,
            tabBarInactiveTintColor: t.colors.inkFaint,
            tabBarLabelStyle: { fontFamily: t.fonts.sansBold, fontSize: 11 },
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Daily', tabBarIcon: tabIcon('cup') }} />
          <Tabs.Screen name="library" options={{ title: 'Library', tabBarIcon: tabIcon('book') }} />
          <Tabs.Screen
            name="lab"
            options={{ title: 'Lab', tabBarIcon: tabIcon('flask'), href: null }}
          />
          <Tabs.Screen
            name="care"
            options={{ title: 'Care', tabBarIcon: tabIcon('wrench'), href: null }}
          />
          <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: tabIcon('pin') }} />
        </Tabs>
      </View>
    </View>
  );
}
