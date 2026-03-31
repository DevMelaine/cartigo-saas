import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type OrganizationProductCardProps = {
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  quantity: number;
  onPress: () => void;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value);
}

function OrganizationProductCardComponent({
  name,
  description,
  price,
  image,
  quantity,
  onPress,
}: OrganizationProductCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View style={styles.content}>
        <Text numberOfLines={1} style={[styles.name, { color: palette.text }]}>
          {name}
        </Text>

        {description ? (
          <Text numberOfLines={2} style={[styles.description, { color: palette.icon }]}>
            {description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <Text style={[styles.price, { color: palette.text }]}>{formatCurrency(price)}</Text>
          <View
            style={[
              styles.stockPill,
              {
                backgroundColor: quantity > 0 ? palette.successSurface : palette.surfaceSoft,
              },
            ]}>
            <Text
              style={[
                styles.stockText,
                { color: quantity > 0 ? palette.accentStrong : palette.icon },
              ]}>
              {quantity > 0 ? `${quantity} dispo` : 'Rupture'}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.mediaWrap, { backgroundColor: palette.surfaceSoft }]}>
        {image ? (
          <Image source={{ uri: image }} contentFit="cover" transition={120} style={styles.image} />
        ) : (
          <View style={[styles.fallback, { backgroundColor: palette.surfaceSoft }]}>
            <MaterialIcons name="inventory-2" size={24} color={palette.text} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

export const OrganizationProductCard = memo(OrganizationProductCardComponent);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 14,
  },
  content: {
    flex: 1,
    gap: 8,
  },
  name: {
    fontFamily: Fonts.rounded,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
  },
  stockPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '700',
  },
  mediaWrap: {
    width: 92,
    height: 92,
    borderRadius: 22,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
