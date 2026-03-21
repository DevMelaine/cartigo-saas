import type { ComponentProps } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { AUTH_COLORS, AUTH_RADIUS } from '@/components/auth/auth-theme';

type AuthInputProps = ComponentProps<typeof TextInput>;

export function AuthInput(props: AuthInputProps) {
  return (
    <TextInput
      autoCapitalize="none"
      autoCorrect={false}
      placeholderTextColor={AUTH_COLORS.muted}
      selectionColor={AUTH_COLORS.primary}
      style={styles.input}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: 50,
    borderRadius: AUTH_RADIUS.control,
    backgroundColor: AUTH_COLORS.surface,
    paddingHorizontal: 16,
    color: AUTH_COLORS.text,
    fontSize: 16,
  },
});
