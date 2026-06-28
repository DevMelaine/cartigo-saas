import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type OrderCardProps = {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  itemCount: number;
  onPress: () => void;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function OrderCard({ id, total, status, createdAt, itemCount, onPress }: OrderCardProps) {
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
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: palette.surfaceMuted }]}>
          <MaterialIcons name="receipt-long" size={24} color={palette.tint} />
        </View>
        <View style={styles.content}>
          <Text numberOfLines={1} style={[styles.id, { color: palette.text }]}>
            Order {id.slice(0, 8)}
          </Text>
          <Text style={[styles.meta, { color: palette.icon }]}>
            {itemCount} item{itemCount > 1 ? 's' : ''} • {formatDate(createdAt)}
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={[styles.status, { color: palette.accentStrong }]}>{status.replaceAll('_', ' ')}</Text>
        <Text style={[styles.total, { color: palette.text }]}>{formatCurrency(total)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  id: {
    fontFamily: Fonts.rounded,
    fontSize: 17,
    fontWeight: '700',
  },
  meta: {
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  status: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
    flex: 1,
  },
  total: {
    fontSize: 16,
    fontWeight: '800',
  },
});
