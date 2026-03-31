import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type CartToastProps = {
  text: string;
  type: 'success' | 'error';
};

export function CartToast({ text, type }: CartToastProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const backgroundColor = type === 'success' ? palette.success : palette.danger;

  return (
    <View style={[styles.toast, { backgroundColor }]}>
      <Text style={[styles.text, { color: palette.inverseText }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minWidth: 220,
    maxWidth: 340,
  },
  text: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});
