import { apiClient } from '@/services/api';
import type { CartItemMutationResponse, CartResponse } from '@/types/cart';

type AuthenticatedOptions = {
  accessToken: string;
};

export const cartService = {
  getCart({ accessToken }: AuthenticatedOptions) {
    return apiClient.get<CartResponse>('/cart', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },

  addItem({
    accessToken,
    productId,
    quantity,
  }: AuthenticatedOptions & {
    productId: string;
    quantity: number;
  }) {
    return apiClient.post<CartItemMutationResponse>(
      '/cart/items',
      { productId, quantity },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  },

  removeItem({ accessToken, itemId }: AuthenticatedOptions & { itemId: string }) {
    return apiClient.delete<{ success: boolean; message: string }>(`/cart/items/${itemId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
};
