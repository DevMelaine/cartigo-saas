import { router } from 'expo-router';

import type { AppNotification } from '@/types/notification';

function readMetadataString(notification: AppNotification, key: string) {
  const value = notification.metadata?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export const notificationNavigationService = {
  navigate(notification: AppNotification) {
    const orderId = readMetadataString(notification, 'orderId');
    const productId = readMetadataString(notification, 'productId');
    const organizationId = readMetadataString(notification, 'organizationId');

    switch (notification.type) {
      case 'ORDER_PAID':
      case 'ORDER_READY':
        if (orderId) {
          router.push({
            pathname: '/orders/[orderId]',
            params: { orderId },
          });
          return true;
        }
        break;
      case 'LOW_STOCK':
        if (productId) {
          router.push({
            pathname: '/products/[productId]',
            params: { productId },
          });
          return true;
        }

        if (organizationId) {
          router.push({
            pathname: '/organizations/[organizationId]',
            params: { organizationId },
          });
          return true;
        }
        break;
      default:
        break;
    }

    router.push('/notifications');
    return false;
  },
};
