'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardPerformanceDistributionItem } from '@/types/dashboard'
import { cn } from '@/lib/utils'

interface PerformanceDistributionProps {
  data: DashboardPerformanceDistributionItem[]
}

const toneClasses = {
  primary: 'bg-primary',
  muted: 'bg-foreground/60',
  alert: 'bg-destructive',
} as const

export function PerformanceDistribution({ data }: PerformanceDistributionProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className="col-span-1 md:col-span-3">
      <CardHeader className="border-b border-border/60 pb-5">
        <CardTitle>Distribution des performances</CardTitle>
        <CardDescription>
          Repartition du catalogue selon le niveau de traction commerciale.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 pt-6">
        {data.length === 0 || total === 0 ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-[1.25rem] border border-dashed border-border/70 bg-secondary/30 text-sm text-muted-foreground">
            Les indicateurs de performance apparaitront apres les premieres ventes.
          </div>
        ) : (
          data.map((item) => {
            const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0

            return (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={cn('h-2.5 w-2.5 rounded-full', toneClasses[item.tone])} />
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{percentage}% du catalogue</p>
                  </div>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn('h-full rounded-full transition-all duration-300', toneClasses[item.tone])}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
