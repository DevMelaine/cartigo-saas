"use client";

import { memo } from "react";
import { Boxes, ShoppingCart, TrendingUp, Users, Wallet } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardStats } from "@/types/analytics";

type AnalyticsKpiCardsProps = {
  stats: DashboardStats;
  isLoading?: boolean;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatGrowthRate(value: number) {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString("fr-FR")} %`;
}

function AnalyticsKpiCardsComponent({
  stats,
  isLoading = false,
}: AnalyticsKpiCardsProps) {
  const growthTone =
    stats.growthRate > 0
      ? "text-emerald-700"
      : stats.growthRate < 0
        ? "text-rose-700"
        : "text-muted-foreground";

  const cards = [
    {
      title: "Revenue total",
      value: formatCurrency(stats.totalRevenue),
      description: "Chiffre d'affaires consolide depuis les commandes monetisees.",
      icon: Wallet,
    },
    {
      title: "Commandes",
      value: formatNumber(stats.totalOrders),
      description: "Volume de commandes rattachees a votre organisation.",
      icon: ShoppingCart,
    },
    {
      title: "Utilisateurs",
      value: formatNumber(stats.totalUsers),
      description: "Utilisateurs dashboard rattaches a votre organisation.",
      icon: Users,
    },
    {
      title: "Produits",
      value: formatNumber(stats.totalProducts),
      description: "Produits actuellement suivis dans votre catalogue.",
      icon: Boxes,
    },
    {
      title: "Variation",
      value: formatGrowthRate(stats.growthRate),
      description: "Evolution du revenu recent compare a la periode precedente.",
      icon: TrendingUp,
      valueClassName: growthTone,
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.title} className="min-w-0 border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="space-y-3 pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardDescription className="line-clamp-2 text-xs leading-5">
                {card.title}
              </CardDescription>
              <div className="rounded-2xl border border-border/70 bg-secondary/60 p-2">
                <card.icon className="h-4 w-4 text-primary" />
              </div>
            </div>
            <CardTitle className={card.valueClassName ?? "text-xl leading-none xl:text-2xl"}>
              {isLoading ? "..." : card.value}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs leading-5 text-muted-foreground">
            {card.description}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

export const AnalyticsKpiCards = memo(AnalyticsKpiCardsComponent);
AnalyticsKpiCards.displayName = "AnalyticsKpiCards";
