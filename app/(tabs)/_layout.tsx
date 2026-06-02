import { Tabs } from 'expo-router';

import { Icon, type IconName } from '@/ui/icons/line';
import { useTheme } from '@/ui/theme/useTheme';

export default function TabsLayout() {
  const t = useTheme();
  const tabIcon = (name: IconName) => ({ color }: { color: string }) =>
    <Icon name={name} color={color} size={20} />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: t.colors.paper, borderTopColor: t.colors.paperEdge },
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
  );
}
