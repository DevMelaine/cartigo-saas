'use client'

import Image from 'next/image'
import { Crown, Sparkles } from 'lucide-react'

import {
  formatProductCurrency,
  getPerformanceLabel,
  getPerformanceTone,
  getProductImageUrl,
} from '@/components/products/product-utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Product } from '@/types/product'

interface TopProductsProps {
  data: Product[]
}

export function TopProducts({ data }: TopProductsProps) {
  return (
    <Card className="col-span-1 md:col-span-4">
      <CardHeader className="border-b border-border/60 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle>Top performers</CardTitle>
            <CardDescription>
              Les references qui portent actuellement le plus de chiffre d&apos;affaires.
            </CardDescription>
          </div>
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <Crown className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        {data.length === 0 ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-[1.25rem] border border-dashed border-border/70 bg-secondary/30 text-sm text-muted-foreground">
            Aucune performance mesurable disponible pour le moment.
          </div>
        ) : (
          data.map((product, index) => (
            <article
              key={product.id}
              className="flex items-center gap-4 rounded-[1.25rem] border border-border/70 bg-background/80 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-sm font-semibold text-foreground">
                {index === 0 ? <Sparkles className="h-4 w-4 text-primary" /> : index + 1}
              </div>

              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-secondary">
                <Image
                  src={getProductImageUrl(
                    product.imagePreviewUrl,
                    product.imageUrl,
                    product.name
                  )}
                  alt={product.name}
                  fill
                  loading="eager"
                  priority={false}
                  placeholder="empty"
                  className="object-cover"
                  sizes="64px"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
                  <Badge
                    variant="outline"
                    className={getPerformanceTone(product.performanceIndicator)}
                  >
                    {getPerformanceLabel(product.performanceIndicator)}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>{product.totalSales} ventes</span>
                  <span>{product.stock} en stock</span>
                  {product.category ? <span>{product.category}</span> : null}
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-muted-foreground">CA genere</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formatProductCurrency(product.revenueGenerated)}
                </p>
              </div>
            </article>
          ))
        )}
      </CardContent>
    </Card>
  )
}
