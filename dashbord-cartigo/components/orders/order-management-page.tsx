"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CreditCard, PackageCheck, ShoppingCart, Truck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useOrders } from "@/hooks/useOrders";
import type { OrderFilters, OrderListParams, OrderStatusFilter } from "@/types/order";

import { OrderList } from "./order-list";

const PAGE_SIZE = 20;

const DEFAULT_FILTERS: OrderFilters = {
  search: "",
  status: "all",
  dateFrom: "",
  dateTo: "",
  minTotal: "",
  maxTotal: "",
};

function parsePage(rawValue: string | null) {
  if (!rawValue) {
    return 1;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parseStatus(rawValue: string | null): OrderStatusFilter {
  if (
    rawValue === "PENDING_PAYMENT" ||
    rawValue === "PAID" ||
    rawValue === "PROCESSING" ||
    rawValue === "READY_FOR_DELIVERY" ||
    rawValue === "IN_DELIVERY" ||
    rawValue === "DELIVERED" ||
    rawValue === "CANCELLED"
  ) {
    return rawValue;
  }

  return "all";
}

function parseFiltersFromSearchParams(searchParams: URLSearchParams): {
  page: number;
  filters: OrderFilters;
} {
  return {
    page: parsePage(searchParams.get("page")),
    filters: {
      search: searchParams.get("search") ?? "",
      status: parseStatus(searchParams.get("status")),
      dateFrom: searchParams.get("dateFrom") ?? "",
      dateTo: searchParams.get("dateTo") ?? "",
      minTotal: searchParams.get("minTotal") ?? "",
      maxTotal: searchParams.get("maxTotal") ?? "",
    },
  };
}

function areFiltersEqual(left: OrderFilters, right: OrderFilters) {
  return (
    (left.search ?? "") === (right.search ?? "") &&
    (left.status ?? "all") === (right.status ?? "all") &&
    (left.dateFrom ?? "") === (right.dateFrom ?? "") &&
    (left.dateTo ?? "") === (right.dateTo ?? "") &&
    (left.minTotal ?? "") === (right.minTotal ?? "") &&
    (left.maxTotal ?? "") === (right.maxTotal ?? "")
  );
}

function buildOrderSearchParams(page: number, filters: OrderFilters) {
  const searchParams = new URLSearchParams();

  if (page > 1) {
    searchParams.set("page", String(page));
  }

  if (filters.search?.trim()) {
    searchParams.set("search", filters.search.trim());
  }

  if ((filters.status ?? "all") !== "all") {
    searchParams.set("status", filters.status as string);
  }

  if (filters.dateFrom) {
    searchParams.set("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    searchParams.set("dateTo", filters.dateTo);
  }

  if (filters.minTotal?.trim()) {
    searchParams.set("minTotal", filters.minTotal.trim());
  }

  if (filters.maxTotal?.trim()) {
    searchParams.set("maxTotal", filters.maxTotal.trim());
  }

  return searchParams;
}

function buildQueryFilters(page: number, filters: OrderFilters): OrderListParams {
  const normalizeNumber = (value?: string) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const parsedValue = Number.parseFloat(value.trim());
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  };

  return {
    page,
    limit: PAGE_SIZE,
    search: filters.search?.trim() || undefined,
    status: filters.status && filters.status !== "all" ? filters.status : undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    minTotal: normalizeNumber(filters.minTotal),
    maxTotal: normalizeNumber(filters.maxTotal),
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export function OrderManagementPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [page, setPage] = useState(() =>
    parseFiltersFromSearchParams(new URLSearchParams(searchParams.toString())).page
  );
  const [filters, setFilters] = useState<OrderFilters>(() => ({
    ...DEFAULT_FILTERS,
    ...parseFiltersFromSearchParams(new URLSearchParams(searchParams.toString())).filters,
  }));
  const [searchInput, setSearchInput] = useState(
    () =>
      parseFiltersFromSearchParams(new URLSearchParams(searchParams.toString())).filters.search ?? ""
  );

  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const effectiveSearch = searchInput.trim() === "" ? "" : debouncedSearch.trim();

  useEffect(() => {
    const currentUrlState = parseFiltersFromSearchParams(new URLSearchParams(searchParams.toString()));
    const committedFilters = {
      ...filters,
      search: effectiveSearch,
    };

    if (page === currentUrlState.page && areFiltersEqual(committedFilters, currentUrlState.filters)) {
      return;
    }

    const nextSearchParams = buildOrderSearchParams(page, committedFilters);
    const nextQueryString = nextSearchParams.toString();

    router.replace(nextQueryString ? `${pathname}?${nextQueryString}` : pathname, {
      scroll: false,
    });
  }, [effectiveSearch, filters, page, pathname, router, searchParams]);

  const queryFilters = useMemo(
    () =>
      buildQueryFilters(page, {
        ...filters,
        search: effectiveSearch,
      }),
    [effectiveSearch, filters, page]
  );

  const { orders, pagination, overview, isLoading, isFetching, isOverviewLoading, error, refetch } =
    useOrders(queryFilters);

  const metricCards = useMemo(
    () => [
      {
        title: "Commandes totales",
        value: isOverviewLoading ? "..." : formatNumber(overview.totalOrders),
        description: "Volume total traite par l'organisation.",
        icon: ShoppingCart,
      },
      {
        title: "Revenus commandes",
        value: isOverviewLoading ? "..." : formatCurrency(overview.totalRevenue),
        description: "Montant cumule des commandes monetisees.",
        icon: CreditCard,
      },
      {
        title: "En cours",
        value: isOverviewLoading ? "..." : formatNumber(overview.inProgressOrders),
        description: "Commandes en preparation, pretes ou en livraison.",
        icon: Truck,
      },
      {
        title: "Livrees",
        value: isOverviewLoading ? "..." : formatNumber(overview.deliveredOrders),
        description: "Commandes totalement finalisees.",
        icon: PackageCheck,
      },
    ],
    [isOverviewLoading, overview.deliveredOrders, overview.inProgressOrders, overview.totalOrders, overview.totalRevenue]
  );

  const handleFiltersChange = useCallback((nextFilters: OrderFilters) => {
    const { search, ...rest } = nextFilters;

    setSearchInput(search ?? "");
    setFilters((currentFilters) => ({
      ...currentFilters,
      ...rest,
    }));
  }, []);

  const displayFilters = useMemo(
    () => ({
      ...filters,
      search: searchInput,
    }),
    [filters, searchInput]
  );

  return (
    <div className="space-y-8 p-6 md:p-8">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <Card key={card.title} className="min-w-0 border-border/70 bg-card/95 shadow-sm">
            <CardHeader className="space-y-3 pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardDescription className="line-clamp-2 text-xs leading-5">
                  {card.title}
                </CardDescription>
                <div className="rounded-2xl border border-border/70 bg-secondary/60 p-2">
                  <card.icon className="h-4 w-4 text-primary" />
                </div>
              </div>
              <CardTitle className="text-xl leading-none xl:text-2xl">{card.value}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-xs leading-5 text-muted-foreground">
              {card.description}
            </CardContent>
          </Card>
        ))}
      </section>

      <OrderList
        orders={orders}
        pagination={pagination}
        filters={displayFilters}
        isLoading={isLoading}
        isRefreshing={isFetching}
        error={error}
        onFiltersChange={handleFiltersChange}
        onPageChange={setPage}
        onRefresh={refetch}
      />
    </div>
  );
}
