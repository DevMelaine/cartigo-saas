import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AppNotification } from '@/types/notification';

type NotificationListItemProps = {
  notification: AppNotification;
  onPress: () => void;
};

function formatNotificationDate(date: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function NotificationListItemComponent({
  notification,
  onPress,
}: NotificationListItemProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const createdAtLabel = useMemo(() => formatNotificationDate(notification.createdAt), [notification.createdAt]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: notification.isRead ? palette.surface : palette.surfaceMuted,
          borderColor: notification.isRead ? palette.border : palette.tint,
        },
      ]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.title, { color: palette.text }]} numberOfLines={2}>
          {notification.title}
        </Text>
        <Text style={[styles.date, { color: palette.icon }]}>{createdAtLabel}</Text>
      </View>

      <Text style={[styles.message, { color: palette.text }]} numberOfLines={3}>
        {notification.message}
      </Text>

      {!notification.isRead ? (
        <View style={styles.footer}>
          <View style={[styles.unreadDot, { backgroundColor: palette.tint }]} />
          <Text style={[styles.unreadLabel, { color: palette.tint }]}>Non lue</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export const NotificationListItem = memo(NotificationListItemComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    gap: 4,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  date: {
    fontSize: 12,
    fontWeight: '500',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  unreadLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
});
