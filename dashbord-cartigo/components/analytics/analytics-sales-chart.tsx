"use client";

import { memo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { dashboardAxisColor, dashboardChartPalette } from "@/components/dashboard/chart-theme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsPeriod, SalesAnalytics } from "@/types/analytics";

type AnalyticsSalesChartProps = {
  data: SalesAnalytics[];
  period: AnalyticsPeriod;
  isLoading?: boolean;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatChartDate(value: string) {
  if (/^\d{4}-\d{2}$/.test(value)) {
    const date = new Date(`${value}-01T00:00:00Z`);
    return new Intl.DateTimeFormat("fr-FR", {
      month: "short",
      year: "2-digit",
    }).format(date);
  }

  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function getPeriodLabel(period: AnalyticsPeriod) {
  switch (period) {
    case "7d":
      return "7 jours";
    case "12m":
      return "12 mois";
    case "30d":
    default:
      return "30 jours";
  }
}

function AnalyticsSalesChartComponent({
  data,
  period,
  isLoading = false,
}: AnalyticsSalesChartProps) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Ventes</CardTitle>
        <CardDescription>
          Evolution du revenu et du volume de commandes sur {getPeriodLabel(period)}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[320px] w-full rounded-[1.5rem]" />
        ) : data.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-secondary/30 text-sm text-muted-foreground">
            Aucune donnee de vente disponible sur cette periode.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatChartDate}
                stroke={dashboardAxisColor}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="revenue"
                stroke={dashboardAxisColor}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(Number(value))}
                width={90}
              />
              <YAxis
                yAxisId="orders"
                orientation="right"
                stroke={dashboardAxisColor}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) {
                    return null;
                  }

                  const revenue = Number(
                    payload.find((item) => item.dataKey === "revenue")?.value ?? 0
                  );
                  const orders = Number(
                    payload.find((item) => item.dataKey === "orders")?.value ?? 0
                  );

                  return (
                    <div className="rounded-2xl border border-border/70 bg-popover/95 p-4 shadow-sm backdrop-blur">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        {formatChartDate(String(label))}
                      </p>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between gap-6">
                          <span className="text-sm text-muted-foreground">Revenu</span>
                          <span className="text-sm font-semibold text-foreground">
                            {formatCurrency(revenue)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-6">
                          <span className="text-sm text-muted-foreground">Commandes</span>
                          <span className="text-sm font-semibold text-foreground">{orders}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                stroke={dashboardChartPalette[0]}
                strokeWidth={2.75}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Line
                yAxisId="orders"
                type="monotone"
                dataKey="orders"
                stroke={dashboardChartPalette[2]}
                strokeWidth={2.25}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export const AnalyticsSalesChart = memo(AnalyticsSalesChartComponent);
AnalyticsSalesChart.displayName = "AnalyticsSalesChart";
