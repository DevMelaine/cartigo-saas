export type NotificationFilter = 'all' | 'unread';

export type NotificationMetadata = Record<string, unknown> | null;

export type AppNotification = {
  id: string;
  userId?: string | null;
  customerId?: string | null;
  organizationId?: string | null;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata: NotificationMetadata;
  createdAt: string;
};

export type NotificationsPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type NotificationsListResponse = {
  success: boolean;
  data: AppNotification[];
  unreadCount: number;
  pagination: NotificationsPagination;
};

export type NotificationUnreadCountResponse = {
  success: boolean;
  data: {
    unreadCount: number;
  };
};

export type NotificationMutationResponse = {
  success: boolean;
  data: AppNotification;
};

export type NotificationsBulkMutationResponse = {
  success: boolean;
  data: {
    updatedCount: number;
  };
};

export type RegisterDevicePayload = {
  token: string;
  platform: 'ios' | 'android' | 'web';
};

export type RegisterDeviceResponse = {
  success: boolean;
  data: {
    id: string;
    token: string;
    platform: string;
    userId?: string | null;
    customerId?: string | null;
  };
};
