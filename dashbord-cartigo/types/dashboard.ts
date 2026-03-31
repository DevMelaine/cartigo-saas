export type DashboardLowStockProduct = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  lowStockThreshold: number | null;
};

export type DashboardSalesTrendPoint = {
  date: string;
  revenue: number;
  orders: number;
};

export type DashboardOrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "READY_FOR_DELIVERY"
  | "IN_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type DashboardRecentOrder = {
  id: string;
  customerName: string;
  total: number;
  status: DashboardOrderStatus;
  createdAt: string;
};

export type DashboardPerformanceDistributionItem = {
  label: string;
  value: number;
  tone: "primary" | "muted" | "alert";
};
