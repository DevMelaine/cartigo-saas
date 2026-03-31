"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Clock3, PackageSearch, ShieldAlert, TrendingUp } from "lucide-react";

import { useAuthGuard } from "@/hooks/useAuthGuard";
import * as orderService from "@/services/orders";
import * as productService from "@/services/products";
import type { DashboardPerformanceDistributionItem } from "@/types/dashboard";

export const dashboardAnalyticsKeys = {
  all: ["dashboard-analytics"] as const,
  overview: () => [...dashboardAnalyticsKeys.all, "overview"] as const,
  topProducts: (limit: number) =>
    [...dashboardAnalyticsKeys.all, "top-products", limit] as const,
  lowStock: (limit: number) =>
    [...dashboardAnalyticsKeys.all, "low-stock", limit] as const,
  salesTrend: (days: number) =>
    [...dashboardAnalyticsKeys.all, "sales-trend", days] as const,
  recentOrders: (limit: number) =>
    [...dashboardAnalyticsKeys.all, "recent-orders", limit] as const,
};

function formatProductLabel(count: number) {
  return `${count} produit${count > 1 ? "s" : ""}`;
}

function buildInsights({
  topProductName,
  topProductRevenue,
  lowStockCount,
  lowStockProductName,
  idleProducts,
  sellingProducts,
  salesTrend,
}: {
  topProductName?: string;
  topProductRevenue?: number;
  lowStockCount: number;
  lowStockProductName?: string;
  idleProducts: number;
  sellingProducts: number;
  salesTrend: Array<{ revenue: number }>;
}) {
  const insights = [];

  if (topProductName && typeof topProductRevenue === "number" && topProductRevenue > 0) {
    insights.push({
      icon: TrendingUp,
      title: "Produit locomotive",
      description: `${topProductName} porte actuellement le plus gros chiffre d'affaires catalogue.`,
      type: "trend" as const,
    });
  }

  if (lowStockCount > 0) {
    insights.push({
      icon: ShieldAlert,
      title: "Alerte stock",
      description: lowStockProductName
        ? lowStockCount > 1
          ? `${lowStockProductName} et ${lowStockCount - 1} autre(s) reference(s) exigent une action rapide.`
          : `${lowStockProductName} exige une action rapide avant rupture.`
        : `${lowStockCount} reference(s) sont sous le seuil de securite.`,
      type: "alert" as const,
    });
  }

  if (idleProducts > 0) {
    insights.push({
      icon: PackageSearch,
      title: "Produits inactifs",
      description: `${formatProductLabel(idleProducts)} n'ont encore genere aucune vente et meritent un repositionnement.`,
      type: "recommendation" as const,
    });
  }

  if (sellingProducts > 0) {
    const lastSevenDaysRevenue = salesTrend.slice(-7).reduce((sum, point) => sum + point.revenue, 0);
    const previousSevenDaysRevenue = salesTrend
      .slice(-14, -7)
      .reduce((sum, point) => sum + point.revenue, 0);

    if (lastSevenDaysRevenue > 0 || previousSevenDaysRevenue > 0) {
      const improving = lastSevenDaysRevenue >= previousSevenDaysRevenue;
      insights.push({
        icon: improving ? BarChart3 : Clock3,
        title: improving ? "Momentum recent" : "Activite a relancer",
        description: improving
          ? `Les 7 derniers jours depassent ou egalent la periode precedente sur le chiffre d'affaires.`
          : `Les 7 derniers jours sont en retrait par rapport a la semaine precedente.`,
        type: improving ? ("trend" as const) : ("recommendation" as const),
      });
    }
  }

  return insights.slice(0, 4);
}

export function useDashboardAnalytics(enabled = true) {
  const { authLoading, canQuery } = useAuthGuard();

  const overviewQuery = useQuery({
    queryKey: dashboardAnalyticsKeys.overview(),
    queryFn: productService.getProductStats,
    enabled: enabled && canQuery,
    staleTime: 60_000,
  });

  const topProductsQuery = useQuery({
    queryKey: dashboardAnalyticsKeys.topProducts(5),
    queryFn: () => productService.getTopPerformingProducts(5),
    enabled: enabled && canQuery,
    staleTime: 60_000,
  });

  const lowStockQuery = useQuery({
    queryKey: dashboardAnalyticsKeys.lowStock(6),
    queryFn: () => productService.getLowStockProducts(6),
    enabled: enabled && canQuery,
    staleTime: 30_000,
  });

  const salesTrendQuery = useQuery({
    queryKey: dashboardAnalyticsKeys.salesTrend(30),
    queryFn: () => orderService.getSalesTrend(30),
    enabled: enabled && canQuery,
    staleTime: 60_000,
  });

  const recentOrdersQuery = useQuery({
    queryKey: dashboardAnalyticsKeys.recentOrders(5),
    queryFn: () => orderService.getRecentOrders(5),
    enabled: enabled && canQuery,
    staleTime: 30_000,
  });

  const performanceDistribution = useMemo<DashboardPerformanceDistributionItem[]>(() => {
    const overview = overviewQuery.data;

    if (!overview) {
      return [];
    }

    return [
      {
        label: "High",
        value: overview.topPerformers,
        tone: "primary",
      },
      {
        label: "Medium",
        value: Math.max(overview.activeSellingProducts - overview.topPerformers, 0),
        tone: "muted",
      },
      {
        label: "Low",
        value: overview.idleProducts,
        tone: "alert",
      },
    ];
  }, [overviewQuery.data]);

  const insights = useMemo(
    () =>
      buildInsights({
        topProductName: topProductsQuery.data?.[0]?.name,
        topProductRevenue: topProductsQuery.data?.[0]?.revenueGenerated,
        lowStockCount: overviewQuery.data?.lowStockCount ?? 0,
        lowStockProductName: lowStockQuery.data?.[0]?.name,
        idleProducts: overviewQuery.data?.idleProducts ?? 0,
        sellingProducts: overviewQuery.data?.activeSellingProducts ?? 0,
        salesTrend: salesTrendQuery.data ?? [],
      }),
    [lowStockQuery.data, overviewQuery.data, salesTrendQuery.data, topProductsQuery.data]
  );

  return {
    overview: overviewQuery.data,
    topProducts: topProductsQuery.data ?? [],
    lowStockProducts: lowStockQuery.data ?? [],
    salesTrend: salesTrendQuery.data ?? [],
    recentOrders: recentOrdersQuery.data ?? [],
    performanceDistribution,
    insights,
    isLoading:
      authLoading ||
      overviewQuery.isLoading ||
      topProductsQuery.isLoading ||
      lowStockQuery.isLoading ||
      salesTrendQuery.isLoading ||
      recentOrdersQuery.isLoading,
    isFetching:
      overviewQuery.isFetching ||
      topProductsQuery.isFetching ||
      lowStockQuery.isFetching ||
      salesTrendQuery.isFetching ||
      recentOrdersQuery.isFetching,
    error:
      overviewQuery.error instanceof Error
        ? overviewQuery.error.message
        : topProductsQuery.error instanceof Error
          ? topProductsQuery.error.message
          : lowStockQuery.error instanceof Error
            ? lowStockQuery.error.message
            : salesTrendQuery.error instanceof Error
              ? salesTrendQuery.error.message
              : recentOrdersQuery.error instanceof Error
                ? recentOrdersQuery.error.message
                : null,
    refetch: async () => {
      if (!enabled || !canQuery) {
        return;
      }

      await Promise.all([
        overviewQuery.refetch(),
        topProductsQuery.refetch(),
        lowStockQuery.refetch(),
        salesTrendQuery.refetch(),
        recentOrdersQuery.refetch(),
      ]);
    },
  };
}
