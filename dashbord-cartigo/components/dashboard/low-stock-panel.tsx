'use client'

import { AlertTriangle, Package2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DashboardLowStockProduct } from '@/types/dashboard'

interface LowStockPanelProps {
  data: DashboardLowStockProduct[]
}

export function LowStockPanel({ data }: LowStockPanelProps) {
  return (
    <Card className="col-span-1 md:col-span-3">
      <CardHeader className="border-b border-border/60 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle>Stock critique</CardTitle>
            <CardDescription>
              References a traiter avant rupture pour proteger les ventes.
            </CardDescription>
          </div>
          <div className="rounded-2xl bg-destructive/10 p-3 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        {data.length === 0 ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-[1.25rem] border border-dashed border-border/70 bg-secondary/30 text-sm text-muted-foreground">
            Aucun produit n&apos;est actuellement sous son seuil de securite.
          </div>
        ) : (
          data.map((product) => (
            <article
              key={product.id}
              className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-border/70 bg-background/80 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-2xl bg-secondary p-3 text-foreground">
                  <Package2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">SKU {product.sku}</p>
                </div>
              </div>

              <div className="text-right">
                <Badge variant="destructive">
                  {product.stock} restant{product.stock > 1 ? 's' : ''}
                </Badge>
                <p className="mt-2 text-xs text-muted-foreground">
                  Seuil {product.lowStockThreshold ?? 0}
                </p>
              </div>
            </article>
          ))
        )}
      </CardContent>
    </Card>
  )
}
