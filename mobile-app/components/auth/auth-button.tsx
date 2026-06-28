import { Pressable, StyleSheet, Text } from 'react-native';

import { AUTH_COLORS, AUTH_RADIUS } from '@/components/auth/auth-theme';

type AuthButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
};

export function AuthButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
}: AuthButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.button,
        isPrimary ? styles.primaryButton : styles.secondaryButton,
        (disabled || loading) && styles.disabledButton,
      ]}>
      <Text style={[styles.label, isPrimary ? styles.primaryLabel : styles.secondaryLabel]}>
        {loading ? `${label}...` : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: AUTH_RADIUS.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: AUTH_COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: AUTH_COLORS.background,
    borderWidth: 1,
    borderColor: AUTH_COLORS.border,
  },
  disabledButton: {
    opacity: 0.45,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
  secondaryLabel: {
    color: AUTH_COLORS.primary,
  },
});
