import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type OrganizationCardProps = {
  name: string;
  category: string | null;
  description?: string | null;
  logo?: string | null;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

const cardShadow = Platform.select({
  web: {
    boxShadow: '0px 10px 24px rgba(17, 24, 39, 0.08)',
  },
  default: {
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
});

export function OrganizationCard({
  name,
  category,
  description,
  logo,
  onPress,
  style,
}: OrganizationCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  const subtitle = description?.trim() || 'Organisation locale disponible sur Cartigo.';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: '#FFFFFF',
          borderColor: '#EEF1F4',
        },
        cardShadow,
        style,
      ]}>
      <View style={[styles.media, { backgroundColor: '#EEF6F1' }]}>
        {logo ? (
          <Image contentFit="cover" source={{ uri: logo }} style={StyleSheet.absoluteFillObject} transition={120} />
        ) : (
          <View style={styles.placeholder}>
            <View style={styles.placeholderGlow} />
            <View style={styles.placeholderBadge}>
              <MaterialIcons name="storefront" size={30} color={palette.text} />
            </View>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text numberOfLines={1} style={[styles.name, { color: palette.text }]}>
          {name}
        </Text>

        <Text numberOfLines={3} style={[styles.description, { color: '#111111' }]}>
          {subtitle}
        </Text>

        {category ? (
          <View style={styles.footerRow}>
            <View style={[styles.categoryBadge, { backgroundColor: '#E8F5EC' }]}>
              <Text numberOfLines={1} style={[styles.categoryLabel, { color: palette.accentStrong }]}>
                {category}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color="#111111" />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 234,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  media: {
    height: 116,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderGlow: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  placeholderBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EBF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 6,
  },
  name: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
  },
  footerRow: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  categoryBadge: {
    maxWidth: '88%',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
