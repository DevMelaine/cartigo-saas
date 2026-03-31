'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface FunnelStep {
  label: string
  value: number
  percentage: number
}

interface ConversionFunnelProps {
  data: FunnelStep[]
}

export function ConversionFunnel({ data }: ConversionFunnelProps) {
  const maxValue = data[0]?.value || 1

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Entonnoir de conversion</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((step, index) => {
            const width = Math.max((step.value / maxValue) * 100, 10)
            const previousValue = data[index - 1]?.value ?? step.value
            const dropValue =
              index === 0 ? null : Math.max(Math.round(((previousValue - step.value) / previousValue) * 100), 0)

            return (
              <div key={step.label} className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-foreground">{step.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {step.value.toLocaleString()}
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                      {step.percentage}%
                    </span>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/60 bg-secondary/70">
                  <div
                    className={cn(
                      'flex h-12 items-center rounded-r-2xl bg-gradient-to-r from-primary via-primary/85 to-primary/65 px-4 text-primary-foreground transition-all duration-500',
                      index === 0 && 'to-primary'
                    )}
                    style={{ width: `${width}%` }}
                  >
                    {dropValue !== null ? (
                      <span className="text-xs font-medium text-primary-foreground/80">
                        -{dropValue}% de perte
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-primary-foreground/80">
                        Point d’entrée
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
