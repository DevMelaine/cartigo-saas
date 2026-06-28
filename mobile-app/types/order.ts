export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  product?: {
    name: string;
    imageUrl?: string | null;
  };
};

export type Order = {
  id: string;
  customerId: string;
  organizationId: string;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
};

export type OrderResponse = {
  success: boolean;
  data: Order;
};

export type OrdersResponse = {
  success: boolean;
  data: Order[];
};
