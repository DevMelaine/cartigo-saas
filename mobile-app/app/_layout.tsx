import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CartProvider } from '@/providers/cart-provider';
import { CustomerSessionProvider, useCustomerSession } from '@/providers/customer-session-provider';
import { NotificationProvider } from '@/providers/notification-provider';
import { getAccessToken } from '@/services/token.service';
import { ThemePreferenceProvider } from '@/providers/theme-preference-provider';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthGateSplash() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  return (
    <View style={[styles.splash, { backgroundColor: palette.background }]}>
      <ActivityIndicator color={palette.text} size="small" />
      <Text style={[styles.splashText, { color: palette.text }]}>Chargement de Cartigo...</Text>
    </View>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoading } = useCustomerSession();
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [hasStoredToken, setHasStoredToken] = useState(false);
  const hasCompletedBootRedirect = useRef(false);

  const firstSegment = segments[0];
  const inAuthGroup = firstSegment === '(auth)';
  const isIndexRoute = segments.join('/') === '';

  useEffect(() => {
    let active = true;

    async function checkToken() {
      try {
        const token = await getAccessToken();

        if (active) {
          setHasStoredToken(Boolean(token));
        }
      } catch {
        if (active) {
          setHasStoredToken(false);
        }
      } finally {
        if (active) {
          setIsCheckingToken(false);
        }
      }
    }

    checkToken();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isCheckingToken || !rootNavigationState?.key || hasCompletedBootRedirect.current) {
      return;
    }

    if (hasStoredToken) {
      if (inAuthGroup || isIndexRoute) {
        router.replace('/(tabs)');
      }
    } else if (!inAuthGroup) {
      router.replace('/(auth)/login');
    }

    hasCompletedBootRedirect.current = true;
  }, [hasStoredToken, inAuthGroup, isCheckingToken, isIndexRoute, rootNavigationState?.key, router]);

  useEffect(() => {
    if (isCheckingToken || !rootNavigationState?.key) {
      return;
    }

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [inAuthGroup, isAuthenticated, isCheckingToken, rootNavigationState?.key, router]);

  if (isCheckingToken || isLoading || !rootNavigationState?.key) {
    return <AuthGateSplash />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="notifications/index" options={{ headerShown: false }} />
      <Stack.Screen name="orders/index" options={{ title: 'My orders' }} />
      <Stack.Screen name="orders/[orderId]" options={{ title: 'Order' }} />
      <Stack.Screen name="organizations/index" options={{ title: 'Organizations' }} />
      <Stack.Screen name="organizations/[organizationId]" options={{ title: 'Organization' }} />
      <Stack.Screen name="products/[productId]" options={{ title: 'Product' }} />
    </Stack>
  );
}

function AppShell() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const navigationTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <CustomerSessionProvider>
      <NotificationProvider>
        <CartProvider>
          <ThemeProvider
            value={{
              ...navigationTheme,
              colors: {
                ...navigationTheme.colors,
                background: palette.background,
                card: palette.surface,
                border: palette.border,
                primary: palette.tint,
                text: palette.text,
              },
            }}>
            <RootNavigator />
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          </ThemeProvider>
        </CartProvider>
      </NotificationProvider>
    </CustomerSessionProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <AppShell />
    </ThemePreferenceProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  splashText: {
    fontSize: 15,
  },
});
