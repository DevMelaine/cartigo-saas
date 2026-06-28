import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthButton } from '@/components/auth/auth-button';
import { AuthInput } from '@/components/auth/auth-input';
import { AuthShell } from '@/components/auth/auth-shell';
import { AUTH_COLORS, AUTH_SPACING } from '@/components/auth/auth-theme';
import { useCustomerSession } from '@/providers/customer-session-provider';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isSubmitting } = useCustomerSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isDisabled = !name.trim() || !email.trim() || !password || isSubmitting;

  async function handleRegister() {
    if (isDisabled) {
      return;
    }

    try {
      setError(null);
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      router.replace('/(tabs)');
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Impossible de créer le compte pour le moment.";
      setError(message);
    }
  }

  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Crée ton compte pour retrouver tes commerces favoris.">
      <View style={styles.form}>
        <AuthInput onChangeText={setName} placeholder="Nom complet" value={name} />

        <AuthInput
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          value={email}
        />

        <AuthInput
          onChangeText={setPassword}
          placeholder="Mot de passe"
          secureTextEntry
          value={password}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <AuthButton
          label="Créer un compte"
          loading={isSubmitting}
          disabled={isDisabled}
          onPress={handleRegister}
        />

        <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/login')} style={styles.linkRow}>
          <Text style={styles.linkLabel}>Vous avez déjà un compte ?</Text>
          <Text style={styles.linkAction}> Se connecter</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: AUTH_SPACING.gap,
  },
  errorText: {
    fontSize: 14,
    color: AUTH_COLORS.danger,
    lineHeight: 20,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 4,
  },
  linkLabel: {
    fontSize: 14,
    color: AUTH_COLORS.muted,
  },
  linkAction: {
    fontSize: 14,
    color: AUTH_COLORS.primary,
    fontWeight: '600',
  },
});
