'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { dashboardChartPalette } from '@/components/dashboard/chart-theme'

interface TrafficData {
  source: string
  value: number
}

interface TrafficSourceProps {
  data: TrafficData[]
}

export function TrafficSource({ data }: TrafficSourceProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sources d’acquisition</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={82}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={dashboardChartPalette[index % dashboardChartPalette.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) {
                  return null
                }

                return (
                  <div className="rounded-2xl border border-border/70 bg-popover/95 p-3 shadow-sm backdrop-blur">
                    <div className="flex flex-col">
                      <span className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
                        {payload[0].name}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {payload[0].value}
                      </span>
                    </div>
                  </div>
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {data.map((item, index) => (
            <div key={item.source} className="flex items-center gap-2 rounded-2xl bg-secondary/70 px-3 py-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: dashboardChartPalette[index % dashboardChartPalette.length] }}
              />
              <span className="text-sm text-foreground">{item.source}</span>
              <span className="ml-auto text-sm font-medium text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
