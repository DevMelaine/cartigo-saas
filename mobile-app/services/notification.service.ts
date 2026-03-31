import { APP_CONFIG } from '@/constants/app';
import { apiClient } from '@/services/api';
import type {
  NotificationFilter,
  NotificationMutationResponse,
  NotificationsBulkMutationResponse,
  NotificationsListResponse,
  NotificationUnreadCountResponse,
  RegisterDevicePayload,
  RegisterDeviceResponse,
} from '@/types/notification';

type ListNotificationsOptions = {
  filter?: NotificationFilter;
  page?: number;
  limit?: number;
};

function buildQueryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export const notificationService = {
  listNotifications(options: ListNotificationsOptions = {}) {
    const query = buildQueryString({
      page: options.page ?? APP_CONFIG.defaultPage,
      limit: options.limit ?? APP_CONFIG.defaultLimit,
      unread: options.filter === 'unread' ? 'true' : undefined,
    });

    return apiClient.get<NotificationsListResponse>(`/notifications${query}`);
  },

  getUnreadCount() {
    return apiClient.get<NotificationUnreadCountResponse>('/notifications/unread-count');
  },

  markAsRead(notificationId: string) {
    return apiClient.patch<NotificationMutationResponse>(`/notifications/${notificationId}/read`);
  },

  markAllAsRead() {
    return apiClient.patch<NotificationsBulkMutationResponse>('/notifications/read-all');
  },

  registerDevice(payload: RegisterDevicePayload) {
    return apiClient.post<RegisterDeviceResponse>('/notifications/register-device', payload);
  },
};
