'use client'

import { ArrowDown as ArrowDownIcon, ArrowUp as ArrowUpIcon } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  title: string
  value: string
  change?: number | null
  caption?: string
  trend?: number[]
}

export function KpiCard({ title, value, change, caption, trend = [] }: KpiCardProps) {
  const hasChange = typeof change === 'number' && Number.isFinite(change)
  const isPositive = hasChange ? change >= 0 : true

  return (
    <Card className="group p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</h3>

          {hasChange ? (
            <div className="mt-4 flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                  isPositive ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                )}
              >
                {isPositive ? (
                  <ArrowUpIcon className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownIcon className="h-3.5 w-3.5" />
                )}
                {Math.abs(change)}%
              </span>
              <span className="text-xs text-muted-foreground">vs periode precedente</span>
            </div>
          ) : caption ? (
            <p className="mt-4 text-xs leading-5 text-muted-foreground">{caption}</p>
          ) : null}
        </div>

        {trend.length > 0 ? (
          <div className="rounded-2xl bg-secondary/80 p-2">
            <MiniChart data={trend} isPositive={isPositive} />
          </div>
        ) : null}
      </div>
    </Card>
  )
}

function MiniChart({ data, isPositive }: { data: number[]; isPositive: boolean }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data
    .map((value, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 72
      const y = 34 - ((value - min) / range) * 30
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width="72" height="36" className="opacity-85">
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? 'var(--color-chart-1)' : 'var(--color-chart-5)'}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
