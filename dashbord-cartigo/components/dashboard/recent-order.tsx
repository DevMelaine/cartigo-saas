'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatProductCurrency } from '@/components/products/product-utils'
import type { DashboardOrderStatus, DashboardRecentOrder } from '@/types/dashboard'

interface RecentOrdersProps {
  data: DashboardRecentOrder[]
}

const statusConfig: Record<
  DashboardOrderStatus,
  { label: string; className: string }
> = {
  PENDING_PAYMENT: {
    label: 'Paiement en attente',
    className: 'bg-secondary text-secondary-foreground hover:bg-secondary',
  },
  PAID: {
    label: 'Payee',
    className: 'bg-primary/10 text-primary hover:bg-primary/10',
  },
  PROCESSING: {
    label: 'Preparation',
    className: 'bg-primary/10 text-primary hover:bg-primary/10',
  },
  READY_FOR_DELIVERY: {
    label: 'Pret a livrer',
    className: 'bg-primary/10 text-primary hover:bg-primary/10',
  },
  IN_DELIVERY: {
    label: 'En livraison',
    className: 'bg-secondary text-secondary-foreground hover:bg-secondary',
  },
  DELIVERED: {
    label: 'Livree',
    className: 'bg-primary/10 text-primary hover:bg-primary/10',
  },
  CANCELLED: {
    label: 'Annulee',
    className: 'bg-destructive/10 text-destructive hover:bg-destructive/10',
  },
}

function formatOrderDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function RecentOrders({ data }: RecentOrdersProps) {
  return (
    <Card className="col-span-1 md:col-span-3">
      <CardHeader className="border-b border-border/60 pb-5">
        <CardTitle>Commandes recentes</CardTitle>
        <CardDescription>
          Dernieres commandes synchronisees avec l&apos;activite de l&apos;organisation.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Commande</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Etat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatOrderDate(order.createdAt)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell className="font-medium">
                    {formatProductCurrency(order.total)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusConfig[order.status].className}>
                      {statusConfig[order.status].label}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  Aucune commande recente disponible.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
