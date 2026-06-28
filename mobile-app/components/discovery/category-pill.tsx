import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type CategoryPillProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
};

export function CategoryPill({ label, active = false, onPress }: CategoryPillProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: active ? palette.surfaceSoft : palette.surface,
          borderColor: active ? palette.surfaceSoft : palette.border,
        },
      ]}>
      <Text style={[styles.label, { color: active ? palette.text : palette.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginRight: 12,
  },
  label: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
  },
});
