import { apiClient } from '@/services/api';
import type { OrderResponse, OrdersResponse } from '@/types/order';

type AuthenticatedOptions = {
  accessToken: string;
};

export const orderService = {
  checkout({ accessToken }: AuthenticatedOptions) {
    return apiClient.post<OrderResponse>('/orders/checkout', undefined, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },

  getMyOrders({ accessToken }: AuthenticatedOptions) {
    return apiClient.get<OrdersResponse>('/orders/my-orders', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },

  getOrder({ accessToken, orderId }: AuthenticatedOptions & { orderId: string }) {
    return apiClient.get<OrderResponse>(`/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
};
