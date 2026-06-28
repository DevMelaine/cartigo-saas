export type CartItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
};

export type Cart = {
  cartId?: string;
  items: CartItem[];
  total: number;
};

export type CartResponse = {
  success: boolean;
  data: Cart;
};

export type CartItemMutationResponse = {
  success: boolean;
  data: {
    id: string;
    productId: string;
    quantity: number;
    priceSnapshot: number;
  };
};
