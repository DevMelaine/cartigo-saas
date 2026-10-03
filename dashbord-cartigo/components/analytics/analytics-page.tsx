"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { BarChart3, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AnalyticsKpiCards } from "@/components/analytics/analytics-kpi-cards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDashboardStats,
  useProductAnalytics,
  useSalesAnalytics,
} from "@/hooks/useAnalytics";
import { useAuth } from "@/hooks/useAuth";
import type { AnalyticsPeriod } from "@/types/analytics";
import { canAccessAnalytics } from "@/utils/analytics-permissions";

const DynamicSalesChart = dynamic(
  () =>
    import("@/components/analytics/analytics-sales-chart").then(
      (module) => module.AnalyticsSalesChart
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[420px] w-full rounded-[1.75rem]" />,
  }
);

const DynamicProductChart = dynamic(
  () =>
    import("@/components/analytics/analytics-product-chart").then(
      (module) => module.AnalyticsProductChart
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[420px] w-full rounded-[1.75rem]" />,
  }
);

const PERIOD_OPTIONS: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "12m", label: "12 mois" },
];

function buildAnalyticsError(errors: Array<string | null>) {
  return errors.find(Boolean) ?? null;
}

export function AnalyticsPage() {
  const { role } = useAuth();
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");

  const canReadAnalytics = canAccessAnalytics(role);

  const dashboardStatsQuery = useDashboardStats(canReadAnalytics);
  const salesAnalyticsQuery = useSalesAnalytics({ period }, canReadAnalytics);
  const productAnalyticsQuery = useProductAnalytics(canReadAnalytics);

  const isLoading =
    dashboardStatsQuery.isLoading ||
    salesAnalyticsQuery.isLoading ||
    productAnalyticsQuery.isLoading;

  const isFetching =
    dashboardStatsQuery.isFetching ||
    salesAnalyticsQuery.isFetching ||
    productAnalyticsQuery.isFetching;

  const error = buildAnalyticsError([
    dashboardStatsQuery.error,
    salesAnalyticsQuery.error,
    productAnalyticsQuery.error,
  ]);

  const hasAnyData = useMemo(
    () =>
      dashboardStatsQuery.data.totalRevenue > 0 ||
      dashboardStatsQuery.data.totalOrders > 0 ||
      dashboardStatsQuery.data.totalProducts > 0 ||
      dashboardStatsQuery.data.totalUsers > 0 ||
      salesAnalyticsQuery.data.length > 0 ||
      productAnalyticsQuery.data.length > 0,
    [
      dashboardStatsQuery.data.totalOrders,
      dashboardStatsQuery.data.totalProducts,
      dashboardStatsQuery.data.totalRevenue,
      dashboardStatsQuery.data.totalUsers,
      productAnalyticsQuery.data.length,
      salesAnalyticsQuery.data.length,
    ]
  );

  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([
        dashboardStatsQuery.refetch(),
        salesAnalyticsQuery.refetch(),
        productAnalyticsQuery.refetch(),
      ]);
      toast.success("Les analytics ont ete actualisees.");
    } catch (refreshError) {
      toast.error(
        refreshError instanceof Error
          ? refreshError.message
          : "Impossible d'actualiser les analytics."
      );
    }
  }, [dashboardStatsQuery, productAnalyticsQuery, salesAnalyticsQuery]);

  if (!canReadAnalytics) {
    return (
      <div className="space-y-8 p-6 md:p-8">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Acces refuse</CardTitle>
            <CardDescription>
              Le module Analytics est reserve aux roles `ADMIN` et `MANAGER`.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Aucune requete analytics n&apos;est declenchee pour les autres roles.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 md:p-8">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/95 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/80 px-4 py-2 text-sm text-secondary-foreground">
              <BarChart3 className="h-4 w-4 text-primary" />
              Lecture analytics
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Analytics</h1>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                Vue consolidee des ventes, utilisateurs et produits pour votre organisation,
                alimentee uniquement par les endpoints backend deja exposes.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Select value={period} onValueChange={(value) => setPeriod(value as AnalyticsPeriod)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Periode" />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isFetching}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              {isFetching ? "Actualisation..." : "Actualiser"}
            </button>
          </div>
        </div>
      </section>

      <AnalyticsKpiCards
        stats={dashboardStatsQuery.data}
        isLoading={isLoading}
      />

      {error ? (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-6 text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      ) : !isLoading && !hasAnyData ? (
        <Card className="border-border/70">
          <CardContent className="p-6">
            <Empty className="border-0 bg-transparent">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BarChart3 className="h-6 w-6" />
                </EmptyMedia>
                <EmptyTitle>Aucune donnee analytique</EmptyTitle>
                <EmptyDescription>
                  Les graphiques apparaitront automatiquement des que votre organisation aura de
                  l&apos;activite exploitable.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-6 xl:grid-cols-2">
          <DynamicSalesChart
            data={salesAnalyticsQuery.data}
            period={period}
            isLoading={salesAnalyticsQuery.isLoading}
          />
          <DynamicProductChart
            data={productAnalyticsQuery.data}
            isLoading={productAnalyticsQuery.isLoading}
          />
        </section>
      )}
    </div>
  );
}
