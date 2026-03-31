import { useColorScheme as useNativeColorScheme } from 'react-native';

import { useThemePreference } from '@/providers/theme-preference-provider';

export function useColorScheme() {
  const themePreference = useThemePreference(true);
  const systemColorScheme = useNativeColorScheme() ?? 'light';

  return themePreference?.resolvedColorScheme ?? systemColorScheme;
}
