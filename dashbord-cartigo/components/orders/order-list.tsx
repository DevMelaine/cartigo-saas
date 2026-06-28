"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PackageSearchIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SearchIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OrderFilters, OrderListItem, OrderPagination } from "@/types/order";

import { getOrderStatusLabel, getOrderStatusTone } from "./order-status-utils";

type OrderListProps = {
  orders: OrderListItem[];
  pagination: OrderPagination;
  filters: OrderFilters;
  isLoading: boolean;
  isRefreshing?: boolean;
  error?: string | null;
  onFiltersChange: (filters: OrderFilters) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => Promise<void>;
};

const DEFAULT_FILTERS: OrderFilters = {
  search: "",
  status: "all",
  dateFrom: "",
  dateTo: "",
  minTotal: "",
  maxTotal: "",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatOrderDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatOrderReference(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

export function OrderList({
  orders,
  pagination,
  filters,
  isLoading,
  isRefreshing = false,
  error,
  onFiltersChange,
  onPageChange,
  onRefresh,
}: OrderListProps) {
  const hasActiveFilters = useMemo(
    () =>
      Boolean(filters.search?.trim()) ||
      Boolean(filters.dateFrom) ||
      Boolean(filters.dateTo) ||
      Boolean(filters.minTotal?.trim()) ||
      Boolean(filters.maxTotal?.trim()) ||
      (filters.status ?? "all") !== "all",
    [filters]
  );

  const handleFilterPatch = useCallback(
    (patch: Partial<OrderFilters>) => {
      onFiltersChange({
        ...filters,
        ...patch,
      });
      onPageChange(1);
    },
    [filters, onFiltersChange, onPageChange]
  );

  const handleReset = useCallback(() => {
    onFiltersChange(DEFAULT_FILTERS);
    onPageChange(1);
  }, [onFiltersChange, onPageChange]);

  if (error) {
    return (
      <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6">
        <p className="text-sm font-medium text-destructive">Impossible de charger les commandes.</p>
        <p className="mt-2 text-sm text-destructive/80">{error}</p>
      </div>
    );
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-4 border-b border-border/70 pb-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <CardTitle>Catalogue des commandes</CardTitle>
            <CardDescription>
              Suivez les commandes, filtrez les periodes critiques et ouvrez le detail pour agir.
            </CardDescription>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => void onRefresh()}
              className="shrink-0"
              disabled={isRefreshing}
            >
              <RefreshCwIcon className={isRefreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              {isRefreshing ? "Actualisation..." : "Actualiser"}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_180px_180px_160px_160px_auto]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher une commande ou un client"
              value={filters.search ?? ""}
              onChange={(event) => handleFilterPatch({ search: event.target.value })}
              className="pl-9"
            />
          </div>

          <Select
            value={filters.status ?? "all"}
            onValueChange={(value) =>
              handleFilterPatch({
                status: value as OrderFilters["status"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="PENDING_PAYMENT">En attente</SelectItem>
              <SelectItem value="PAID">Payees</SelectItem>
              <SelectItem value="PROCESSING">En preparation</SelectItem>
              <SelectItem value="READY_FOR_DELIVERY">Pretes</SelectItem>
              <SelectItem value="IN_DELIVERY">Expediees</SelectItem>
              <SelectItem value="DELIVERED">Livrees</SelectItem>
              <SelectItem value="CANCELLED">Annulees</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(event) => handleFilterPatch({ dateFrom: event.target.value })}
          />

          <Input
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(event) => handleFilterPatch({ dateTo: event.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Montant min"
              inputMode="decimal"
              value={filters.minTotal ?? ""}
              onChange={(event) => handleFilterPatch({ minTotal: event.target.value })}
            />
            <Input
              placeholder="Montant max"
              inputMode="decimal"
              value={filters.maxTotal ?? ""}
              onChange={(event) => handleFilterPatch({ maxTotal: event.target.value })}
            />
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!hasActiveFilters}
              className="rounded-full"
            >
              <RotateCcwIcon className="h-4 w-4" />
              Reinitialiser
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-[1.25rem]" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Empty className="border-0 bg-transparent py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackageSearchIcon className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>Aucune commande correspondante</EmptyTitle>
              <EmptyDescription>
                Ajustez les filtres ou attendez de nouvelles commandes pour alimenter la vue.
              </EmptyDescription>
            </EmptyHeader>
            {hasActiveFilters ? (
              <EmptyContent>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcwIcon className="h-4 w-4" />
                  Reinitialiser les filtres
                </Button>
              </EmptyContent>
            ) : null}
          </Empty>
        ) : (
          <>
            <div className="overflow-hidden rounded-[1.5rem] border border-border/70">
              <div className="max-h-[42rem] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                        Commande
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                        Client
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 bg-card/95 text-right backdrop-blur">
                        Total
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                        Statut
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                        Date
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 bg-card/95 text-right backdrop-blur" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id} className="group">
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{formatOrderReference(order.id)}</p>
                            <p className="text-xs text-muted-foreground">{order.id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{order.customer.name}</p>
                            <p className="text-xs text-muted-foreground">{order.customer.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {formatCurrency(order.total)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getOrderStatusTone(order.status)}
                          >
                            {getOrderStatusLabel(order.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatOrderDate(order.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm" className="gap-2">
                            <Link href={`/dashboard/orders/${order.id}`}>
                              Voir
                              <ArrowRightIcon className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} sur {Math.max(1, pagination.totalPages)} | {pagination.total} commande
                {pagination.total > 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Precedent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Suivant
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
