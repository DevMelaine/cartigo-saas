import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCustomerSession } from '@/providers/customer-session-provider';
import { type ThemePreference, useThemePreference } from '@/providers/theme-preference-provider';

export default function AccountScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { customer, isAuthenticated, isHydrating, isSubmitting, logout } = useCustomerSession();
  const themePreference = useThemePreference();

  function renderThemeOption(label: string, value: ThemePreference) {
    const isActive = themePreference.preference === value;

    return (
      <Pressable
        key={value}
        accessibilityRole="button"
        onPress={() => themePreference.setPreference(value)}
        style={[
          styles.themeOption,
          {
            backgroundColor: isActive ? palette.text : palette.surface,
            borderColor: isActive ? palette.text : palette.border,
          },
        ]}>
        <Text
          style={[
            styles.themeOptionText,
            { color: isActive ? palette.inverseText : palette.text },
          ]}>
          {label}
        </Text>
      </Pressable>
    );
  }

  if (isHydrating) {
    return (
      <ScreenShell>
        <View style={[styles.hero, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.title, { color: palette.text }]}>Loading session...</Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <View style={[styles.hero, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={[styles.iconWrap, { backgroundColor: palette.surfaceMuted }]}>
          <MaterialIcons
            name={isAuthenticated ? 'verified-user' : 'person-outline'}
            size={28}
            color={palette.tint}
          />
        </View>

        <Text style={[styles.title, { color: palette.text }]}>
          {isAuthenticated ? `Hello, ${customer?.name ?? 'customer'}` : 'Customer account'}
        </Text>
        <Text style={[styles.body, { color: palette.icon }]}>
          {isAuthenticated
            ? 'Your session is active on this device. You can now keep a cart and continue to checkout.'
            : 'Sign in or create an account to keep your cart across organizations.'}
        </Text>

        {isAuthenticated && customer ? (
          <View style={[styles.infoCard, { backgroundColor: palette.background, borderColor: palette.border }]}>
            <Text style={[styles.infoLabel, { color: palette.icon }]}>Email</Text>
            <Text style={[styles.infoValue, { color: palette.text }]}>{customer.email}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.preferenceCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.preferenceHeader}>
          <Text style={[styles.preferenceTitle, { color: palette.text }]}>Apparence</Text>
          <Text style={[styles.preferenceBody, { color: palette.icon }]}>
            Choisis entre clair, nuit ou le mode systeme.
          </Text>
        </View>

        <View style={[styles.themeOptions, { backgroundColor: palette.surfaceMuted }]}>
          {renderThemeOption('Clair', 'light')}
          {renderThemeOption('Nuit', 'dark')}
          {renderThemeOption('Systeme', 'system')}
        </View>
      </View>

      {isAuthenticated ? (
        <View style={styles.actions}>
          <Link href="/(tabs)/cart" asChild>
            <Pressable style={[styles.primaryAction, { backgroundColor: palette.tint }]}>
              <Text style={[styles.primaryActionText, { color: palette.onTint }]}>Open cart</Text>
            </Pressable>
          </Link>
          <Link href="/orders" asChild>
            <Pressable style={[styles.secondaryAction, { borderColor: palette.border }]}>
              <Text style={[styles.secondaryActionText, { color: palette.text }]}>My orders</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <View style={styles.actions}>
          <Link href="/login" asChild>
            <Pressable style={[styles.primaryAction, { backgroundColor: palette.tint }]}>
              <Text style={[styles.primaryActionText, { color: palette.onTint }]}>Sign in</Text>
            </Pressable>
          </Link>
          <Link href="/register" asChild>
            <Pressable style={[styles.secondaryAction, { borderColor: palette.border }]}>
              <Text style={[styles.secondaryActionText, { color: palette.text }]}>Create account</Text>
            </Pressable>
          </Link>
        </View>
      )}

      {isAuthenticated ? (
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={logout}
          style={[styles.logoutAction, { borderColor: palette.border }]}>
          <Text style={[styles.secondaryActionText, { color: palette.text }]}>
            {isSubmitting ? 'Signing out...' : 'Sign out'}
          </Text>
        </Pressable>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  preferenceCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  preferenceHeader: {
    gap: 4,
  },
  preferenceTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '700',
  },
  preferenceBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  themeOptions: {
    borderRadius: 18,
    padding: 6,
    flexDirection: 'row',
    gap: 6,
  },
  themeOption: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryAction: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  logoutAction: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
});
