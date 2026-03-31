import { apiClient } from '@/services/api';
import type { CartItemMutationResponse, CartResponse } from '@/types/cart';

type AuthenticatedOptions = {
  accessToken: string;
};

export const cartService = {
  getCart(_options: AuthenticatedOptions) {
    return apiClient.get<CartResponse>('/cart');
  },

  addItem({
    productId,
    quantity,
  }: AuthenticatedOptions & {
    productId: string;
    quantity: number;
  }) {
    return apiClient.post<CartItemMutationResponse>('/cart/items', { productId, quantity });
  },

  removeItem({ itemId }: AuthenticatedOptions & { itemId: string }) {
    return apiClient.delete<{ success: boolean; message: string }>(`/cart/items/${itemId}`);
  },
};
