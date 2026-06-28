import { apiClient } from '@/services/api';
import type { OrderResponse, OrdersResponse } from '@/types/order';

type AuthenticatedOptions = {
  accessToken: string;
};

export const orderService = {
  checkout(_options: AuthenticatedOptions) {
    return apiClient.post<OrderResponse>('/orders/checkout');
  },

  getMyOrders(_options: AuthenticatedOptions) {
    return apiClient.get<OrdersResponse>('/orders/my-orders');
  },

  getOrder({ orderId }: AuthenticatedOptions & { orderId: string }) {
    return apiClient.get<OrderResponse>(`/orders/${orderId}`);
  },
};
