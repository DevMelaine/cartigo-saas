'use client'

import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface InsightCardProps {
  icon: LucideIcon
  title: string
  description: string
  type?: 'alert' | 'trend' | 'recommendation'
}

const surfaceByType = {
  alert: 'border-destructive/20 bg-destructive/5',
  trend: 'border-primary/15 bg-primary/5',
  recommendation: 'border-accent bg-accent/70',
} as const

const iconByType = {
  alert: 'bg-destructive/10 text-destructive',
  trend: 'bg-primary/10 text-primary',
  recommendation: 'bg-secondary text-secondary-foreground',
} as const

export function InsightCard({
  icon: Icon,
  title,
  description,
  type = 'trend',
}: InsightCardProps) {
  return (
    <Card className={cn('gap-4 border p-5', surfaceByType[type])}>
      <div className="flex items-start gap-4">
        <div className={cn('rounded-2xl p-2.5', iconByType[type])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
    </Card>
  )
}
