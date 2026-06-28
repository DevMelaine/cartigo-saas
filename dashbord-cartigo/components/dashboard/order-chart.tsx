'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { dashboardAxisColor, dashboardChartPalette } from '@/components/dashboard/chart-theme'

interface OrdersChartProps {
  data: Array<{
    date: string
    orders: number
  }>
}

export function OrdersChart({ data }: OrdersChartProps) {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Commandes</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
            <XAxis
              dataKey="date"
              stroke={dashboardAxisColor}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={dashboardAxisColor}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: 'var(--color-secondary)', opacity: 0.55 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) {
                  return null
                }

                return (
                  <div className="rounded-2xl border border-border/70 bg-popover/95 p-3 shadow-sm backdrop-blur">
                    <div className="flex flex-col">
                      <span className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
                        Commandes
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {payload[0].value}
                      </span>
                    </div>
                  </div>
                )
              }}
            />
            <Bar dataKey="orders" fill={dashboardChartPalette[0]} radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
