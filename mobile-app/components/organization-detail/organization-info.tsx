import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type OrganizationInfoProps = {
  name: string;
  address?: string | null;
  description?: string | null;
  logo?: string | null;
  category?: string | null;
  statusLabel: string;
  isOpen: boolean | null;
  openingHoursLabel: string;
  onPressSchedule: () => void;
};

export function OrganizationInfo({
  name,
  address,
  description,
  logo,
  category,
  statusLabel,
  isOpen,
  openingHoursLabel,
  onPressSchedule,
}: OrganizationInfoProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  return (
    <View style={styles.wrapper}>
      <View style={[styles.logoWrap, { backgroundColor: palette.surface, shadowColor: palette.text }]}>
        {logo ? (
          <Image source={{ uri: logo }} contentFit="cover" transition={120} style={styles.logo} />
        ) : (
          <View style={[styles.logoFallback, { backgroundColor: palette.surfaceSoft }]}>
            <MaterialIcons name="storefront" size={28} color={palette.text} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={[styles.name, { color: palette.text }]}>{name}</Text>

        {address ? (
          <View style={styles.infoRow}>
            <MaterialIcons name="place" size={16} color={palette.icon} />
            <Text numberOfLines={2} style={[styles.metaText, { color: palette.text }]}>
              {address}
            </Text>
          </View>
        ) : null}

        <View style={styles.metaCluster}>
          {category ? (
            <View style={[styles.categoryPill, { backgroundColor: palette.successSurface }]}>
              <Text style={[styles.categoryText, { color: palette.accentStrong }]}>{category}</Text>
            </View>
          ) : null}

          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isOpen === false ? palette.dangerSurface : palette.successSurface,
              },
            ]}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isOpen === false ? palette.danger : palette.success },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: isOpen === false ? palette.danger : palette.accentStrong },
              ]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {description ? (
          <Text numberOfLines={3} style={[styles.description, { color: palette.text }]}>
            {description}
          </Text>
        ) : null}

        <Pressable accessibilityRole="button" onPress={onPressSchedule} style={styles.scheduleRow}>
          <MaterialIcons name="schedule" size={17} color={palette.text} />
          <Text style={[styles.scheduleText, { color: palette.text }]}>{openingHoursLabel}</Text>
          <MaterialIcons name="keyboard-arrow-right" size={18} color={palette.icon} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: -42,
    paddingHorizontal: 20,
  },
  logoWrap: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 4,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 18,
    elevation: 5,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  logoFallback: {
    flex: 1,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingTop: 18,
    paddingBottom: 12,
    gap: 12,
    alignItems: 'center',
  },
  name: {
    fontFamily: Fonts.rounded,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  metaCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
