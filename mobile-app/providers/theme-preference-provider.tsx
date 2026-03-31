import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  resolvedColorScheme: 'light' | 'dark';
  isHydratingTheme: boolean;
  setPreference: (nextPreference: ThemePreference) => Promise<void>;
  toggleColorScheme: () => Promise<void>;
};

const STORAGE_KEY = 'cartigo.theme.preference';

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

export function ThemePreferenceProvider({ children }: PropsWithChildren) {
  const systemColorScheme = useNativeColorScheme() ?? 'light';
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [isHydratingTheme, setIsHydratingTheme] = useState(true);

  useEffect(() => {
    let active = true;

    async function hydratePreference() {
      try {
        const storedPreference = await AsyncStorage.getItem(STORAGE_KEY);

        if (!active) {
          return;
        }

        if (
          storedPreference === 'light' ||
          storedPreference === 'dark' ||
          storedPreference === 'system'
        ) {
          setPreferenceState(storedPreference);
        }
      } finally {
        if (active) {
          setIsHydratingTheme(false);
        }
      }
    }

    hydratePreference();

    return () => {
      active = false;
    };
  }, []);

  const resolvedColorScheme = preference === 'system' ? systemColorScheme : preference;

  const setPreference = useCallback(async (nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);

    if (nextPreference === 'system') {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return;
    }

    await AsyncStorage.setItem(STORAGE_KEY, nextPreference);
  }, []);

  const toggleColorScheme = useCallback(async () => {
    const nextPreference = resolvedColorScheme === 'dark' ? 'light' : 'dark';
    await setPreference(nextPreference);
  }, [resolvedColorScheme, setPreference]);

  const value = useMemo(
    () => ({
      preference,
      resolvedColorScheme,
      isHydratingTheme,
      setPreference,
      toggleColorScheme,
    }),
    [isHydratingTheme, preference, resolvedColorScheme, setPreference, toggleColorScheme]
  );

  return (
    <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemePreferenceContextValue;
export function useThemePreference(optional: true): ThemePreferenceContextValue | null;
export function useThemePreference(optional = false) {
  const context = useContext(ThemePreferenceContext);

  if (!context && !optional) {
    throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  }

  return context;
}
