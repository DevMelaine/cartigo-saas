import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AUTH_COLORS, AUTH_RADIUS, AUTH_SHADOW, AUTH_SPACING } from '@/components/auth/auth-theme';

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : 'height';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={keyboardBehavior} style={styles.keyboardContainer}>
        <View style={styles.container}>
          <View style={styles.heroSection}>
            <ImageBackground
              source={require('../../assets/images/image2.jpg')}
              resizeMode="cover"
              style={styles.heroImage}>
              <LinearGradient
                colors={[AUTH_COLORS.overlayTop, AUTH_COLORS.overlayBottom]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Bienvenue chez Cartigo</Text>
                <Text style={styles.heroSubtitle}>Achetez facilement depuis votre maison</Text>
              </View>
            </ImageBackground>
          </View>

          <View style={styles.formSection}>
            <View style={styles.panel}>
              <ScrollView
                bounces={false}
                contentContainerStyle={styles.panelContent}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>{title}</Text>
                  {subtitle ? <Text style={styles.panelSubtitle}>{subtitle}</Text> : null}
                </View>

                <View style={styles.content}>{children}</View>
              </ScrollView>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AUTH_COLORS.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: AUTH_COLORS.background,
  },
  heroSection: {
    height: '40%',
    minHeight: 220,
    maxHeight: 320,
  },
  heroImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroCopy: {
    paddingHorizontal: AUTH_SPACING.screen,
    paddingBottom: 28,
    gap: 8,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 16,
    lineHeight: 22,
  },
  formSection: {
    flex: 1,
    marginTop: -24,
    backgroundColor: 'transparent',
  },
  panel: {
    flex: 1,
    backgroundColor: AUTH_COLORS.background,
    borderTopLeftRadius: AUTH_RADIUS.panel,
    borderTopRightRadius: AUTH_RADIUS.panel,
    ...AUTH_SHADOW,
  },
  panelContent: {
    flexGrow: 1,
    paddingHorizontal: AUTH_SPACING.screen,
    paddingTop: 24,
    paddingBottom: AUTH_SPACING.screen + 24,
    gap: 24,
  },
  panelHeader: {
    gap: 8,
  },
  panelTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: AUTH_COLORS.text,
  },
  panelSubtitle: {
    fontSize: 16,
    color: AUTH_COLORS.muted,
    lineHeight: 22,
  },
  content: {
    gap: AUTH_SPACING.gap,
  },
});
