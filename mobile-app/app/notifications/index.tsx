import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NotificationFilterChip } from '@/components/notifications/notification-filter-chip';
import { NotificationListItem } from '@/components/notifications/notification-list-item';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNotifications } from '@/providers/notification-provider';
import type { NotificationFilter } from '@/types/notification';

const FILTER_OPTIONS: { label: string; value: NotificationFilter }[] = [
  { label: 'Toutes', value: 'all' },
  { label: 'Non lues', value: 'unread' },
];

export default function NotificationsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    activeFilter,
    isLoading,
    isRefreshing,
    isFetchingMore,
    hasLoaded,
    error,
    pagination,
    setFilter,
    refreshNotifications,
    fetchMoreNotifications,
    markAllAsRead,
    openNotification,
  } = useNotifications();

  useEffect(() => {
    if (!hasLoaded) {
      refreshNotifications().catch(() => null);
    }
  }, [hasLoaded, refreshNotifications]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.background }]}>
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.iconButton}>
            <MaterialIcons name="arrow-back" size={22} color={palette.text} />
          </Pressable>

          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: palette.text }]}>Notifications</Text>
            <Text style={[styles.subtitle, { color: palette.icon }]}>
              {unreadCount > 0
                ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
                : 'Tout est a jour'}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={unreadCount === 0}
            onPress={() => {
              markAllAsRead().catch(() => null);
            }}
            style={[
              styles.markAllButton,
              {
                borderColor: unreadCount > 0 ? palette.border : palette.surfaceMuted,
                backgroundColor: palette.surface,
              },
            ]}>
            <Text
              style={[
                styles.markAllLabel,
                { color: unreadCount > 0 ? palette.text : palette.icon },
              ]}>
              Tout lire
            </Text>
          </Pressable>
        </View>

        <View style={styles.filtersRow}>
          {FILTER_OPTIONS.map((option) => (
            <NotificationFilterChip
              key={option.value}
              active={activeFilter === option.value}
              label={option.label}
              onPress={() => {
                setFilter(option.value).catch(() => null);
              }}
            />
          ))}
        </View>
      </View>

      {isLoading && !notifications.length ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={palette.text} />
          <Text style={[styles.feedbackText, { color: palette.icon }]}>Chargement des notifications...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={notifications}
          keyExtractor={(item) => item.id}
          onEndReached={() => {
            fetchMoreNotifications().catch(() => null);
          }}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              tintColor={palette.text}
              onRefresh={() => {
                refreshNotifications().catch(() => null);
              }}
            />
          }
          renderItem={({ item }) => (
            <NotificationListItem
              notification={item}
              onPress={() => {
                openNotification(item).catch(() => null);
              }}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={[styles.emptyTitle, { color: palette.text }]}>Aucune notification</Text>
              <Text style={[styles.feedbackText, { color: palette.icon }]}>
                {activeFilter === 'unread'
                  ? 'Tu as deja tout consulte.'
                  : 'Les nouvelles notifications apparaitront ici des qu elles arrivent.'}
              </Text>
            </View>
          }
          ListFooterComponent={
            isFetchingMore ? (
              <View style={styles.footerState}>
                <ActivityIndicator color={palette.text} />
              </View>
            ) : error ? (
              <View style={styles.footerState}>
                <Text style={[styles.feedbackText, { color: palette.danger }]}>{error}</Text>
              </View>
            ) : pagination.page < pagination.totalPages ? (
              <View style={styles.footerState}>
                <Text style={[styles.feedbackText, { color: palette.icon }]}>
                  Charge plus pour voir la suite.
                </Text>
              </View>
            ) : (
              <View style={styles.footerSpacer} />
            )
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
  },
  markAllButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    flexGrow: 1,
  },
  separator: {
    height: 12,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 22,
    fontWeight: '700',
  },
  feedbackText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  footerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  footerSpacer: {
    height: 24,
  },
});
