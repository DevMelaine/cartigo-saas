"use client";

import { memo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { dashboardAxisColor, dashboardChartPalette } from "@/components/dashboard/chart-theme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductAnalytics } from "@/types/analytics";

type AnalyticsProductChartProps = {
  data: ProductAnalytics[];
  isLoading?: boolean;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(value);
}

function truncateLabel(value: string) {
  return value.length > 16 ? `${value.slice(0, 16)}...` : value;
}

function AnalyticsProductChartComponent({
  data,
  isLoading = false,
}: AnalyticsProductChartProps) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Top produits</CardTitle>
        <CardDescription>
          Produits les plus performants classes par revenu genere.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[320px] w-full rounded-[1.5rem]" />
        ) : data.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-secondary/30 text-sm text-muted-foreground">
            Aucun produit performant a afficher pour le moment.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" horizontal={false} />
              <XAxis
                type="number"
                stroke={dashboardAxisColor}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(Number(value))}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke={dashboardAxisColor}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={120}
                tickFormatter={truncateLabel}
              />
              <Tooltip
                cursor={{ fill: "var(--color-secondary)", opacity: 0.55 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) {
                    return null;
                  }

                  const point = payload[0]?.payload as ProductAnalytics | undefined;

                  if (!point) {
                    return null;
                  }

                  return (
                    <div className="rounded-2xl border border-border/70 bg-popover/95 p-4 shadow-sm backdrop-blur">
                      <p className="text-sm font-semibold text-foreground">{point.name}</p>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between gap-6">
                          <span className="text-sm text-muted-foreground">Revenu</span>
                          <span className="text-sm font-semibold text-foreground">
                            {formatCurrency(point.revenue)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-6">
                          <span className="text-sm text-muted-foreground">Ventes</span>
                          <span className="text-sm font-semibold text-foreground">
                            {point.sales}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="revenue" fill={dashboardChartPalette[1]} radius={[0, 10, 10, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export const AnalyticsProductChart = memo(AnalyticsProductChartComponent);
AnalyticsProductChart.displayName = "AnalyticsProductChart";
