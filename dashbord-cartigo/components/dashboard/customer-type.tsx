'use client'

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { dashboardAxisColor, dashboardChartPalette } from '@/components/dashboard/chart-theme'

interface CustomerTypeProps {
  data: Array<{
    type: string
    count: number
  }>
}

export function CustomerType({ data }: CustomerTypeProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Typologie des clients</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="type"
              stroke={dashboardAxisColor}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) {
                  return null
                }

                return (
                  <div className="rounded-2xl border border-border/70 bg-popover/95 p-3 shadow-sm backdrop-blur">
                    <div className="flex flex-col">
                      <span className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
                        {payload[0].payload.type}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {payload[0].value}
                      </span>
                    </div>
                  </div>
                )
              }}
            />
            <Bar dataKey="count" fill={dashboardChartPalette[0]} radius={[0, 10, 10, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
