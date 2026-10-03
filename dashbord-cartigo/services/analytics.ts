import * as orderService from "@/services/orders";
import * as productService from "@/services/products";
import * as userService from "@/services/users";
import type {
  AnalyticsPeriod,
  DashboardStats,
  ProductAnalytics,
  SalesAnalytics,
  SalesAnalyticsFilters,
  UserAnalytics,
} from "@/types/analytics";
import type { OrderListParams, OrderListResponse, OrderStatus } from "@/types/order";
import type { OrganizationUser } from "@/types/user";

const USER_PAGE_SIZE = 100;
const ORDER_PAGE_SIZE = 100;
const SALES_STATUSES = new Set<OrderStatus>([
  "PAID",
  "PROCESSING",
  "READY_FOR_DELIVERY",
  "IN_DELIVERY",
  "DELIVERED",
]);

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function endOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(23, 59, 59, 999);
  return nextDate;
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatIsoMonth(date: Date) {
  return date.toISOString().slice(0, 7);
}

function resolveSalesTrendDays(period: AnalyticsPeriod) {
  switch (period) {
    case "7d":
      return 7;
    case "12m":
      return 90;
    case "30d":
    default:
      return 30;
  }
}

function computeGrowthRate(points: SalesAnalytics[]) {
  if (points.length === 0) {
    return 0;
  }

  const midpoint = Math.floor(points.length / 2);
  const previousPeriodRevenue = points
    .slice(0, midpoint)
    .reduce((sum, point) => sum + point.revenue, 0);
  const currentPeriodRevenue = points
    .slice(midpoint)
    .reduce((sum, point) => sum + point.revenue, 0);

  if (previousPeriodRevenue === 0) {
    return currentPeriodRevenue > 0 ? 100 : 0;
  }

  return ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100;
}

async function getAllUsers(): Promise<OrganizationUser[]> {
  const firstPage = await userService.getUsers({
    page: 1,
    limit: USER_PAGE_SIZE,
    sort: "createdAt",
    order: "desc",
  });

  if (firstPage.pagination.totalPages <= 1) {
    return firstPage.data;
  }

  const pages = await Promise.all(
    Array.from({ length: firstPage.pagination.totalPages - 1 }, (_, index) =>
      userService.getUsers({
        page: index + 2,
        limit: USER_PAGE_SIZE,
        sort: "createdAt",
        order: "desc",
      })
    )
  );

  return [firstPage, ...pages].flatMap((page) => page.data);
}

async function getOrdersPage(params: OrderListParams): Promise<OrderListResponse> {
  return orderService.getOrders(params);
}

async function getOrdersWithinRange(dateFrom: Date, dateTo: Date) {
  const firstPage = await getOrdersPage({
    page: 1,
    limit: ORDER_PAGE_SIZE,
    dateFrom: formatIsoDate(dateFrom),
    dateTo: formatIsoDate(dateTo),
  });

  if (firstPage.pagination.totalPages <= 1) {
    return firstPage.data;
  }

  const pages = await Promise.all(
    Array.from({ length: firstPage.pagination.totalPages - 1 }, (_, index) =>
      getOrdersPage({
        page: index + 2,
        limit: ORDER_PAGE_SIZE,
        dateFrom: formatIsoDate(dateFrom),
        dateTo: formatIsoDate(dateTo),
      })
    )
  );

  return [firstPage, ...pages].flatMap((page) => page.data);
}

function buildMonthlySalesAnalytics(orders: OrderListResponse["data"]): SalesAnalytics[] {
  const now = new Date();
  const firstMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const monthlyMap = new Map<string, SalesAnalytics>();

  for (let index = 0; index < 12; index += 1) {
    const currentMonth = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
    const key = formatIsoMonth(currentMonth);

    monthlyMap.set(key, {
      date: key,
      revenue: 0,
      orders: 0,
    });
  }

  orders
    .filter((order) => SALES_STATUSES.has(order.status))
    .forEach((order) => {
      const key = formatIsoMonth(new Date(order.createdAt));
      const bucket = monthlyMap.get(key);

      if (!bucket) {
        return;
      }

      bucket.orders += 1;
      bucket.revenue += order.total;
    });

  return Array.from(monthlyMap.values());
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [orderOverview, productOverview, userAnalytics, salesTrend] = await Promise.all([
    orderService.getOrderOverview(),
    productService.getProductStats(),
    getUserAnalytics(),
    orderService.getSalesTrend(60),
  ]);

  return {
    totalRevenue: orderOverview.totalRevenue,
    totalOrders: orderOverview.totalOrders,
    totalUsers: userAnalytics.totalUsers,
    totalProducts: productOverview.totalProducts,
    growthRate: computeGrowthRate(salesTrend),
  };
}

export async function getSalesAnalytics(
  params: SalesAnalyticsFilters = {}
): Promise<SalesAnalytics[]> {
  const period = params.period ?? "30d";

  if (period === "12m") {
    const now = new Date();
    const dateTo = endOfDay(now);
    const dateFrom = startOfDay(new Date(now.getFullYear(), now.getMonth() - 11, 1));
    const orders = await getOrdersWithinRange(dateFrom, dateTo);

    return buildMonthlySalesAnalytics(orders);
  }

  return orderService.getSalesTrend(resolveSalesTrendDays(period));
}

export async function getUserAnalytics(): Promise<UserAnalytics> {
  const users = await getAllUsers();
  const thirtyDaysAgo = startOfDay(new Date());
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return {
    totalUsers: users.length,
    activeUsers: users.filter((user) => user.isActive).length,
    newUsers: users.filter((user) => {
      const createdAt = new Date(user.createdAt);
      return !Number.isNaN(createdAt.getTime()) && createdAt >= thirtyDaysAgo;
    }).length,
  };
}

export async function getProductAnalytics(): Promise<ProductAnalytics[]> {
  const topProducts = await productService.getTopPerformingProducts(6);

  return topProducts.map((product) => ({
    productId: product.id,
    name: product.name,
    sales: product.totalSales,
    revenue: product.revenueGenerated,
  }));
}
