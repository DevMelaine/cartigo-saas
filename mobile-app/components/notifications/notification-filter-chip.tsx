import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type NotificationFilterChipProps = {
  active: boolean;
  label: string;
  onPress: () => void;
};

export function NotificationFilterChip({
  active,
  label,
  onPress,
}: NotificationFilterChipProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: active ? palette.text : palette.surfaceMuted,
          borderColor: active ? palette.text : palette.border,
        },
      ]}>
      <Text
        style={[
          styles.label,
          {
            color: active ? palette.inverseText : palette.text,
          },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
});
