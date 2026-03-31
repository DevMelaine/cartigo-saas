import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type StickyHeaderProps = {
  title: string;
  topInset: number;
  onBack: () => void;
  onSearch: () => void;
};

export function StickyHeader({ title, topInset, onBack, onSearch }: StickyHeaderProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: topInset + 8,
          backgroundColor: palette.background,
          borderBottomColor: palette.border,
        },
      ]}>
      <View style={styles.inner}>
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={[styles.iconButton, { backgroundColor: palette.surfaceSoft }]}>
          <MaterialIcons name="arrow-back" size={21} color={palette.text} />
        </Pressable>

        <Text numberOfLines={1} style={[styles.title, { color: palette.text }]}>
          {title}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={onSearch}
          style={[styles.iconButton, { backgroundColor: palette.surfaceSoft }]}>
          <MaterialIcons name="search" size={21} color={palette.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  inner: {
    minHeight: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '700',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
