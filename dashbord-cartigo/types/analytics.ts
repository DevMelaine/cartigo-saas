export type AnalyticsPeriod = "7d" | "30d" | "12m";

export type DashboardStats = {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  growthRate: number;
};

export type SalesAnalytics = {
  date: string;
  revenue: number;
  orders: number;
};

export type ProductAnalytics = {
  productId: string;
  name: string;
  sales: number;
  revenue: number;
};

export type UserAnalytics = {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
};

export type SalesAnalyticsFilters = {
  period?: AnalyticsPeriod;
};
