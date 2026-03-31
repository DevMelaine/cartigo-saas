import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type CoverHeaderProps = {
  coverImage?: string | null;
  topInset: number;
  onBack: () => void;
  onSearch: () => void;
  onMenu: () => void;
};

export function CoverHeader({
  coverImage,
  topInset,
  onBack,
  onSearch,
  onMenu,
}: CoverHeaderProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  return (
    <View style={[styles.container, { backgroundColor: palette.surfaceSoft }]}>
      {coverImage ? (
        <Image
          source={{ uri: coverImage }}
          contentFit="cover"
          transition={180}
          style={StyleSheet.absoluteFillObject}
        />
      ) : (
        <View style={[styles.fallback, { backgroundColor: palette.surfaceMuted }]} />
      )}

      <LinearGradient
        colors={[palette.overlay, palette.overlayStrong]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.actionsRow, { paddingTop: topInset + 8 }]}>
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={[styles.iconButton, { backgroundColor: palette.floatingSurface }]}>
          <MaterialIcons name="arrow-back" size={22} color={palette.text} />
        </Pressable>

        <View style={styles.rightActions}>
          <Pressable
            accessibilityRole="button"
            onPress={onSearch}
            style={[styles.iconButton, { backgroundColor: palette.floatingSurface }]}>
            <MaterialIcons name="search" size={22} color={palette.text} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onMenu}
            style={[styles.iconButton, { backgroundColor: palette.floatingSurface }]}>
            <MaterialIcons name="more-horiz" size={22} color={palette.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 232,
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
  },
  actionsRow: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
