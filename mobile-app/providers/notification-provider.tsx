import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform } from 'react-native';

import { useCustomerSession } from '@/providers/customer-session-provider';
import { notificationNavigationService } from '@/services/notification-navigation.service';
import { notificationService } from '@/services/notification.service';
import type {
  AppNotification,
  NotificationFilter,
  NotificationsPagination,
} from '@/types/notification';

const NOTIFICATION_PAGE_SIZE = 20;
const REGISTERED_DEVICE_TOKEN_KEY = 'cartigo.notifications.registered-device-token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type NotificationContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  activeFilter: NotificationFilter;
  isLoading: boolean;
  isRefreshing: boolean;
  isFetchingMore: boolean;
  hasLoaded: boolean;
  error: string | null;
  pagination: NotificationsPagination;
  fetchNotifications: (options?: {
    filter?: NotificationFilter;
    page?: number;
    append?: boolean;
    silent?: boolean;
  }) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  fetchMoreNotifications: () => Promise<void>;
  setFilter: (filter: NotificationFilter) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotificationRealtime: (notification: AppNotification) => void;
  openNotification: (notification: AppNotification) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

function createEmptyPagination(): NotificationsPagination {
  return {
    page: 1,
    limit: NOTIFICATION_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  };
}

function sortNotifications(notifications: AppNotification[]) {
  return [...notifications].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

function mergeNotifications(current: AppNotification[], incoming: AppNotification[]) {
  const notificationsById = new Map(current.map((notification) => [notification.id, notification]));

  incoming.forEach((notification) => {
    notificationsById.set(notification.id, {
      ...notificationsById.get(notification.id),
      ...notification,
    });
  });

  return sortNotifications(Array.from(notificationsById.values()));
}

function parseNotificationMetadata(input: Record<string, unknown>) {
  return Object.entries(input).reduce<Record<string, unknown>>((accumulator, [key, value]) => {
    if (typeof value !== 'string') {
      accumulator[key] = value;
      return accumulator;
    }

    const trimmed = value.trim();

    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        accumulator[key] = JSON.parse(trimmed);
        return accumulator;
      } catch {
        accumulator[key] = value;
        return accumulator;
      }
    }

    accumulator[key] = value;
    return accumulator;
  }, {});
}

function normalizeRealtimeNotification(notification: Notifications.Notification): AppNotification | null {
  const data = notification.request.content.data ?? {};
  const notificationId =
    typeof data.notificationId === 'string' ? data.notificationId : notification.request.identifier;

  if (!notificationId) {
    return null;
  }

  const metadataEntries = Object.entries(data).filter(([key]) => !['notificationId', 'type'].includes(key));
  const metadata = metadataEntries.length
    ? parseNotificationMetadata(Object.fromEntries(metadataEntries))
    : null;

  return {
    id: notificationId,
    type: typeof data.type === 'string' ? data.type : 'UNKNOWN',
    title: notification.request.content.title ?? 'Cartigo',
    message: notification.request.content.body ?? '',
    isRead: false,
    metadata,
    createdAt: new Date().toISOString(),
  };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { customer, isAuthenticated } = useCustomerSession();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [pagination, setPagination] = useState<NotificationsPagination>(createEmptyPagination);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeFilterRef = useRef<NotificationFilter>('all');
  const listenersReadyRef = useRef(false);
  const lastHandledNotificationIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeFilterRef.current = activeFilter;
  }, [activeFilter]);

  const applyNotifications = useCallback(
    ({
      nextNotifications,
      nextUnreadCount,
      nextPagination,
      append,
      filter,
    }: {
      nextNotifications: AppNotification[];
      nextUnreadCount: number;
      nextPagination: NotificationsPagination;
      append: boolean;
      filter: NotificationFilter;
    }) => {
      startTransition(() => {
        setActiveFilter(filter);
        setNotifications((current) =>
          append ? mergeNotifications(current, nextNotifications) : sortNotifications(nextNotifications)
        );
        setUnreadCount(nextUnreadCount);
        setPagination(nextPagination);
        setError(null);
        setHasLoaded(true);
      });
    },
    []
  );

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      startTransition(() => {
        setUnreadCount(0);
      });
      return;
    }

    try {
      const response = await notificationService.getUnreadCount();

      startTransition(() => {
        setUnreadCount(response.data.unreadCount);
      });
    } catch {
      return;
    }
  }, [isAuthenticated]);

  const fetchNotifications = useCallback(
    async ({
      filter = activeFilterRef.current,
      page = 1,
      append = false,
      silent = false,
    }: {
      filter?: NotificationFilter;
      page?: number;
      append?: boolean;
      silent?: boolean;
    } = {}) => {
      if (!isAuthenticated) {
        startTransition(() => {
          setNotifications([]);
          setUnreadCount(0);
          setPagination(createEmptyPagination());
          setHasLoaded(false);
          setError(null);
        });
        return;
      }

      if (append) {
        setIsFetchingMore(true);
      } else if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const response = await notificationService.listNotifications({
          filter,
          page,
          limit: NOTIFICATION_PAGE_SIZE,
        });

        applyNotifications({
          nextNotifications: response.data,
          nextUnreadCount: response.unreadCount,
          nextPagination: response.pagination,
          append,
          filter,
        });
      } catch (fetchError) {
        const message =
          fetchError instanceof Error ? fetchError.message : 'Impossible de charger les notifications.';

        startTransition(() => {
          setError(message);
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsFetchingMore(false);
      }
    },
    [applyNotifications, isAuthenticated]
  );

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications({
      filter: activeFilterRef.current,
      page: 1,
      append: false,
      silent: true,
    });
  }, [fetchNotifications]);

  const fetchMoreNotifications = useCallback(async () => {
    if (isFetchingMore || isLoading || pagination.page >= pagination.totalPages) {
      return;
    }

    await fetchNotifications({
      filter: activeFilterRef.current,
      page: pagination.page + 1,
      append: true,
      silent: true,
    });
  }, [fetchNotifications, isFetchingMore, isLoading, pagination.page, pagination.totalPages]);

  const setFilter = useCallback(
    async (filter: NotificationFilter) => {
      if (filter === activeFilterRef.current && hasLoaded) {
        return;
      }

      await fetchNotifications({
        filter,
        page: 1,
        append: false,
        silent: false,
      });
    },
    [fetchNotifications, hasLoaded]
  );

  const addNotificationRealtime = useCallback((notification: AppNotification) => {
    startTransition(() => {
      setNotifications((current) => {
        const merged = mergeNotifications(current, [{ ...notification, isRead: false }]);

        if (activeFilterRef.current === 'unread') {
          return merged.filter((item) => !item.isRead);
        }

        return merged;
      });
      setUnreadCount((current) => current + 1);
    });
  }, []);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      const previousNotifications = notifications;
      const hasUnreadTarget = notifications.some(
        (notification) => notification.id === notificationId && !notification.isRead
      );
      const previousUnreadCount = unreadCount;

      startTransition(() => {
        setNotifications((current) => {
          const updated = current.map((notification) =>
            notification.id === notificationId ? { ...notification, isRead: true } : notification
          );

          return activeFilterRef.current === 'unread'
            ? updated.filter((notification) => !notification.isRead)
            : updated;
        });
        setUnreadCount(hasUnreadTarget ? Math.max(0, unreadCount - 1) : unreadCount);
      });

      try {
        await notificationService.markAsRead(notificationId);
      } catch (markError) {
        const message =
          markError instanceof Error ? markError.message : 'Impossible de marquer la notification comme lue.';

        startTransition(() => {
          setNotifications(previousNotifications);
          setUnreadCount(previousUnreadCount);
          setError(message);
        });

        throw markError;
      }
    },
    [notifications, unreadCount]
  );

  const markAllAsRead = useCallback(async () => {
    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;

    startTransition(() => {
      setNotifications((current) =>
        activeFilterRef.current === 'unread'
          ? []
          : current.map((notification) => ({ ...notification, isRead: true }))
      );
      setUnreadCount(0);
    });

    try {
      await notificationService.markAllAsRead();
    } catch (markError) {
      const message =
        markError instanceof Error
          ? markError.message
          : 'Impossible de marquer toutes les notifications comme lues.';

      startTransition(() => {
        setNotifications(previousNotifications);
        setUnreadCount(previousUnreadCount);
        setError(message);
      });

      throw markError;
    }
  }, [notifications, unreadCount]);

  const openNotification = useCallback(
    async (notification: AppNotification) => {
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }

      notificationNavigationService.navigate(notification);
    },
    [markAsRead]
  );

  const registerDeviceToken = useCallback(async () => {
    if (!isAuthenticated || Platform.OS === 'web') {
      return;
    }

    try {
      const existingPermissions = await Notifications.getPermissionsAsync();
      let finalStatus = existingPermissions.status;

      if (finalStatus !== 'granted') {
        const requestedPermissions = await Notifications.requestPermissionsAsync();
        finalStatus = requestedPermissions.status;
      }

      if (finalStatus !== 'granted') {
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      const devicePushToken = await Notifications.getDevicePushTokenAsync();
      const token = typeof devicePushToken.data === 'string' ? devicePushToken.data : '';
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';

      if (!token) {
        throw new Error('Unable to retrieve a native push token for this device.');
      }

      const registrationKey = `${customer?.id ?? 'anonymous'}:${platform}:${token}`;
      const storedRegistrationKey = await AsyncStorage.getItem(REGISTERED_DEVICE_TOKEN_KEY);

      if (storedRegistrationKey === registrationKey) {
        return;
      }

      await notificationService.registerDevice({
        token,
        platform,
      });

      await AsyncStorage.setItem(REGISTERED_DEVICE_TOKEN_KEY, registrationKey);
    } catch (registrationError) {
      const message =
        registrationError instanceof Error
          ? registrationError.message
          : 'Unable to register the device for notifications.';

      startTransition(() => {
        setError(message);
      });
    }
  }, [customer?.id, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      startTransition(() => {
        setNotifications([]);
        setUnreadCount(0);
        setPagination(createEmptyPagination());
        setIsLoading(false);
        setIsRefreshing(false);
        setIsFetchingMore(false);
        setHasLoaded(false);
        setError(null);
      });
      return;
    }

    fetchNotifications({ filter: 'all', page: 1, append: false, silent: false });
    registerDeviceToken();
  }, [fetchNotifications, isAuthenticated, registerDeviceToken]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' || !isAuthenticated) {
        return;
      }

      fetchUnreadCount();
      refreshNotifications();
      registerDeviceToken();
    });

    return () => {
      subscription.remove();
    };
  }, [fetchUnreadCount, isAuthenticated, refreshNotifications, registerDeviceToken]);

  useEffect(() => {
    if (listenersReadyRef.current || Platform.OS === 'web') {
      return;
    }

    listenersReadyRef.current = true;

    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      const normalizedNotification = normalizeRealtimeNotification(notification);

      if (!normalizedNotification) {
        return;
      }

      addNotificationRealtime(normalizedNotification);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const normalizedNotification = normalizeRealtimeNotification(response.notification);

      if (!normalizedNotification || lastHandledNotificationIdRef.current === normalizedNotification.id) {
        return;
      }

      lastHandledNotificationIdRef.current = normalizedNotification.id;
      openNotification(normalizedNotification).catch(() => null);
    });

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) {
          return;
        }

        const normalizedNotification = normalizeRealtimeNotification(response.notification);

        if (!normalizedNotification || lastHandledNotificationIdRef.current === normalizedNotification.id) {
          return;
        }

        lastHandledNotificationIdRef.current = normalizedNotification.id;
        openNotification(normalizedNotification).catch(() => null);
      })
      .catch(() => null);

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [addNotificationRealtime, openNotification]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      activeFilter,
      isLoading,
      isRefreshing,
      isFetchingMore,
      hasLoaded,
      error,
      pagination,
      fetchNotifications,
      fetchUnreadCount,
      fetchMoreNotifications,
      setFilter,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
      addNotificationRealtime,
      openNotification,
    }),
    [
      activeFilter,
      addNotificationRealtime,
      error,
      fetchMoreNotifications,
      fetchNotifications,
      fetchUnreadCount,
      hasLoaded,
      isFetchingMore,
      isLoading,
      isRefreshing,
      markAllAsRead,
      markAsRead,
      notifications,
      openNotification,
      pagination,
      refreshNotifications,
      setFilter,
      unreadCount,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationContext);

  if (!value) {
    throw new Error('useNotifications must be used within a NotificationProvider.');
  }

  return value;
}
