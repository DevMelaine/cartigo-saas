import type { UserRole } from "@/types/auth";

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "READY_FOR_DELIVERY"
  | "IN_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type OrderStatusFilter = OrderStatus | "all";

export type OrderCustomer = {
  id: string;
  name: string;
  email: string;
};

export type OrderItemProduct = {
  id: string;
  name: string;
  imageUrl: string | null;
  imagePreviewUrl?: string | null;
  inventory?: {
    quantity: number;
  } | null;
};

export type OrderItem = {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: OrderItemProduct | null;
};

export type OrderAuditLog = {
  id: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  changedByUserId: string | null;
  changedByRole: UserRole | null;
  action: string;
  createdAt: string;
};

export type OrderListItem = {
  id: string;
  customer: OrderCustomer;
  total: number;
  status: OrderStatus;
  readyForDelivery: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrderDetail = OrderListItem & {
  items: OrderItem[];
  auditLogs: OrderAuditLog[];
};

export type OrderPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type OrderListResponse = {
  data: OrderListItem[];
  pagination: OrderPagination;
};

export type OrderOverview = {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  inProgressOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
};

export type OrderFilters = {
  search?: string;
  status?: OrderStatusFilter;
  dateFrom?: string;
  dateTo?: string;
  minTotal?: string;
  maxTotal?: string;
};

export type OrderListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: Exclude<OrderStatusFilter, "all">;
  dateFrom?: string;
  dateTo?: string;
  minTotal?: number;
  maxTotal?: number;
};

export type OrderStatusAction = {
  label: string;
  nextStatus: OrderStatus;
  tone?: "default" | "destructive";
  description: string;
};
