'use client'

import { useMemo } from 'react'
import { LoaderCircle, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react'

import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton'
import { InsightCard } from '@/components/dashboard/insight-card'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { LowStockPanel } from '@/components/dashboard/low-stock-panel'
import { PerformanceDistribution } from '@/components/dashboard/performance-distribution'
import { RecentOrders } from '@/components/dashboard/recent-order'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { TopProducts } from '@/components/dashboard/top-product'
import { formatProductCurrency } from '@/components/products/product-utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics'

function computePercentageDelta(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0
  }

  return Number((((current - previous) / previous) * 100).toFixed(1))
}

function buildRevenueDelta(trend: Array<{ revenue: number }>) {
  if (trend.length === 0) {
    return null
  }

  const currentPeriod = trend.slice(-7).reduce((sum, point) => sum + point.revenue, 0)
  const previousPeriod = trend.slice(-14, -7).reduce((sum, point) => sum + point.revenue, 0)

  if (currentPeriod === 0 && previousPeriod === 0) {
    return null
  }

  return computePercentageDelta(currentPeriod, previousPeriod)
}

export default function DashboardPage() {
  const { hasPermission } = useAuth()
  const canReadAnalytics = hasPermission('analytics.read')
  const {
    overview,
    topProducts,
    lowStockProducts,
    salesTrend,
    recentOrders,
    performanceDistribution,
    insights,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useDashboardAnalytics(canReadAnalytics)

  const revenueDelta = useMemo(() => buildRevenueDelta(salesTrend), [salesTrend])
  const revenueSparkline = useMemo(
    () => salesTrend.slice(-12).map((point) => point.revenue),
    [salesTrend]
  )

  const kpiCards = useMemo(() => {
    if (!overview) {
      return []
    }

    return [
      {
        title: 'Total revenue',
        value: formatProductCurrency(overview.revenueGenerated),
        change: revenueDelta,
        caption: 'Ventes confirmees sur le catalogue.',
        trend: revenueSparkline,
      },
      {
        title: 'Active products',
        value: String(overview.activeSellingProducts),
        caption: `${overview.totalProducts} references actives dans le catalogue.`,
      },
      {
        title: 'Low stock count',
        value: String(overview.lowStockCount),
        caption:
          overview.lowStockCount > 0
            ? 'Des actions de reapprovisionnement sont recommandees.'
            : 'Aucune reference sous le seuil de securite.',
      },
      {
        title: 'Idle products',
        value: String(overview.idleProducts),
        caption:
          overview.idleProducts > 0
            ? 'Produits sans ventes confirmees a reanimer.'
            : 'Aucun produit inactif sur la periode analysee.',
      },
    ]
  }, [overview, revenueDelta, revenueSparkline])

  const resolvedInsights = insights.length
    ? insights
    : [
        {
          icon: Sparkles,
          title: 'Catalogue stable',
          description:
            "Les insights apparaitront ici automatiquement a mesure que l'activite commerciale se structure.",
          type: 'recommendation' as const,
        },
      ]

  if (!canReadAnalytics) {
    return (
      <div className="space-y-8 p-8">
        <Card className="border-border/70">
          <CardContent className="p-8 text-sm text-muted-foreground">
            Cette vue de synthese requiert la permission `analytics.read`.
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error || !overview) {
    return (
      <div className="space-y-8 p-8">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col gap-4 p-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-destructive/10 p-3 text-destructive">
                <TriangleAlert className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">
                  Impossible de charger le dashboard analytique
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  {error ??
                    "Une erreur est survenue pendant la synchronisation des donnees metier."}
                </p>
              </div>
            </div>

            <Button onClick={() => void refetch()} variant="outline">
              <RefreshCw className="h-4 w-4" />
              Reessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((kpi) => (
          <KpiCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            change={kpi.change}
            caption={kpi.caption}
            trend={kpi.trend}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
        <RevenueChart data={salesTrend} />
        <PerformanceDistribution data={performanceDistribution} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
        <TopProducts data={topProducts} />
        <LowStockPanel data={lowStockProducts} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
        <RecentOrders data={recentOrders} />

        <Card className="col-span-1 md:col-span-4">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Insights intelligents
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Signaux cles detectes en temps reel a partir des performances produits.
                </p>
              </div>

              <Button
                onClick={() => void refetch()}
                variant="outline"
                size="sm"
                disabled={isFetching}
              >
                {isFetching ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Actualiser
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {resolvedInsights.map((insight) => (
                <InsightCard
                  key={insight.title}
                  icon={insight.icon}
                  title={insight.title}
                  description={insight.description}
                  type={insight.type}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
