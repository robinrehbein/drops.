import {
  Fraunces_300Light,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { createContext, useContext, type ReactNode } from 'react';
import { View } from 'react-native';

import { theme as defaultTheme, type Theme } from './tokens';

const Ctx = createContext<Theme>(defaultTheme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [loaded] = useFonts({
    Fraunces_300Light,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_600SemiBold,
  });
  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: defaultTheme.colors.paper }} />;
  }
  return <Ctx.Provider value={defaultTheme}>{children}</Ctx.Provider>;
}

export function useThemeContext(): Theme {
  return useContext(Ctx);
}
