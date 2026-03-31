'use client'

import { useMemo } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { dashboardAxisColor, dashboardChartPalette } from '@/components/dashboard/chart-theme'
import { formatProductCurrency } from '@/components/products/product-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface RevenueChartProps {
  data: Array<{
    date: string
    revenue: number
    orders: number
  }>
}

function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
  }).format(date)
}

export function RevenueChart({ data }: RevenueChartProps) {
  const summary = useMemo(() => {
    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0)
    const totalOrders = data.reduce((sum, item) => sum + item.orders, 0)
    const activeDays = data.filter((item) => item.orders > 0 || item.revenue > 0).length

    return {
      totalRevenue,
      totalOrders,
      activeDays,
    }
  }, [data])

  return (
    <Card className="col-span-1 md:col-span-4">
      <CardHeader className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <CardTitle>Ventes sur 30 jours</CardTitle>
          <CardDescription>
            Evolution du chiffre d&apos;affaires et du volume de commandes confirmes.
          </CardDescription>
        </div>

        <div className="grid min-w-[220px] grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border/70 bg-secondary/50 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              CA
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {formatProductCurrency(summary.totalRevenue)}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-secondary/50 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Commandes
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {summary.totalOrders}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-secondary/50 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Jours actifs
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {summary.activeDays}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {data.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center rounded-[1.25rem] border border-dashed border-border/70 bg-secondary/30 text-sm text-muted-foreground">
            Aucune vente confirmee sur la periode analysee.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
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
                tickFormatter={(value) => formatProductCurrency(Number(value))}
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
                cursor={{ stroke: 'var(--color-border)', strokeWidth: 1.5 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) {
                    return null
                  }

                  const revenueValue =
                    payload.find((item) => item.dataKey === 'revenue')?.value ?? 0
                  const orderValue =
                    payload.find((item) => item.dataKey === 'orders')?.value ?? 0

                  return (
                    <div className="rounded-2xl border border-border/70 bg-popover/95 p-4 shadow-sm backdrop-blur">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        {formatShortDate(String(label))}
                      </p>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between gap-6">
                          <span className="text-sm text-muted-foreground">Chiffre d&apos;affaires</span>
                          <span className="text-sm font-semibold text-foreground">
                            {formatProductCurrency(Number(revenueValue))}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-6">
                          <span className="text-sm text-muted-foreground">Commandes</span>
                          <span className="text-sm font-semibold text-foreground">
                            {Number(orderValue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }}
              />
              <Bar
                yAxisId="orders"
                dataKey="orders"
                fill={dashboardChartPalette[2]}
                radius={[8, 8, 0, 0]}
                barSize={18}
              />
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                stroke={dashboardChartPalette[0]}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
