import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ProductCardProps = {
  name: string;
  price: number;
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

export function ProductCard({ name, price, quantity, onPress }: ProductCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
        },
      ]}>
      <View style={[styles.iconWrap, { backgroundColor: palette.surfaceMuted }]}>
        <MaterialIcons name="inventory-2" size={24} color={palette.accentStrong} />
      </View>

      <View style={styles.content}>
        <Text numberOfLines={1} style={[styles.name, { color: palette.text }]}>
          {name}
        </Text>
        <Text style={[styles.price, { color: palette.tint }]}>{formatCurrency(price)}</Text>
        <Text style={[styles.stock, { color: palette.icon }]}>
          {quantity > 0 ? `${quantity} in stock` : 'Out of stock'}
        </Text>
      </View>

      <MaterialIcons name="chevron-right" size={22} color={palette.icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontFamily: Fonts.rounded,
    fontSize: 17,
    fontWeight: '700',
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
  },
  stock: {
    fontSize: 13,
  },
});
