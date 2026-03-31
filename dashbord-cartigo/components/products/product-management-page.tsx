"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Boxes,
  FolderKanban,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { ProductForm } from "@/components/products/product-form";
import { ProductList } from "@/components/products/product-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useProductMutations, useProducts } from "@/hooks/useProducts";
import type {
  Product,
  ProductFilters,
  ProductListParams,
  ProductSortField,
  ProductStatusFilter,
  ProductStockFilter,
  SortOrder,
} from "@/types/product";

import { formatProductCurrency } from "./product-utils";

const PAGE_SIZE = 10;
const DEFAULT_FILTERS: ProductFilters = {
  search: "",
  categoryId: undefined,
  minPrice: "",
  maxPrice: "",
  stockState: "all",
  status: "active",
  sortBy: "updatedAt",
  sortOrder: "desc",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function normalizeNumberFilter(value?: string) {
  if (typeof value !== "string") {
    return undefined;
  }

  const parsedValue = Number.parseFloat(value.trim());
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function parsePage(rawValue: string | null) {
  if (!rawValue) {
    return 1;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;
}

function parseSortField(rawValue: string | null): ProductSortField {
  if (rawValue === "createdAt" || rawValue === "name" || rawValue === "price" || rawValue === "stock") {
    return rawValue;
  }

  return "updatedAt";
}

function parseSortOrder(rawValue: string | null): SortOrder {
  return rawValue === "asc" ? "asc" : "desc";
}

function parseStatus(rawValue: string | null): ProductStatusFilter {
  if (
    rawValue === "all" ||
    rawValue === "draft" ||
    rawValue === "paused" ||
    rawValue === "archived"
  ) {
    return rawValue;
  }

  return "active";
}

function parseStockState(rawValue: string | null): ProductStockFilter {
  if (rawValue === "in_stock" || rawValue === "out_of_stock" || rawValue === "low_stock") {
    return rawValue;
  }

  return "all";
}

function parseFiltersFromSearchParams(searchParams: URLSearchParams): {
  page: number;
  filters: ProductFilters;
} {
  return {
    page: parsePage(searchParams.get("page")),
    filters: {
      search: searchParams.get("search") ?? "",
      categoryId: searchParams.get("categoryId") || undefined,
      minPrice: searchParams.get("minPrice") ?? "",
      maxPrice: searchParams.get("maxPrice") ?? "",
      stockState: parseStockState(searchParams.get("stockState")),
      status: parseStatus(searchParams.get("status")),
      sortBy: parseSortField(searchParams.get("sort")),
      sortOrder: parseSortOrder(searchParams.get("order")),
    },
  };
}

function areFiltersEqual(left: ProductFilters, right: ProductFilters) {
  return (
    (left.search ?? "") === (right.search ?? "") &&
    (left.categoryId ?? "") === (right.categoryId ?? "") &&
    (left.minPrice ?? "") === (right.minPrice ?? "") &&
    (left.maxPrice ?? "") === (right.maxPrice ?? "") &&
    (left.stockState ?? "all") === (right.stockState ?? "all") &&
    (left.status ?? "active") === (right.status ?? "active") &&
    (left.sortBy ?? "updatedAt") === (right.sortBy ?? "updatedAt") &&
    (left.sortOrder ?? "desc") === (right.sortOrder ?? "desc")
  );
}

function buildProductSearchParams(page: number, filters: ProductFilters) {
  const searchParams = new URLSearchParams();

  if (page > 1) {
    searchParams.set("page", String(page));
  }

  if (filters.search?.trim()) {
    searchParams.set("search", filters.search.trim());
  }

  if (filters.categoryId) {
    searchParams.set("categoryId", filters.categoryId);
  }

  if (filters.minPrice?.trim()) {
    searchParams.set("minPrice", filters.minPrice.trim());
  }

  if (filters.maxPrice?.trim()) {
    searchParams.set("maxPrice", filters.maxPrice.trim());
  }

  if ((filters.stockState ?? "all") !== "all") {
    searchParams.set("stockState", filters.stockState as string);
  }

  if ((filters.status ?? "active") !== "active") {
    searchParams.set("status", filters.status as string);
  }

  if ((filters.sortBy ?? "updatedAt") !== "updatedAt") {
    searchParams.set("sort", filters.sortBy as string);
  }

  if ((filters.sortOrder ?? "desc") !== "desc") {
    searchParams.set("order", filters.sortOrder as string);
  }

  return searchParams;
}

function buildQueryFilters(page: number, filters: ProductFilters): ProductListParams {
  return {
    page,
    limit: PAGE_SIZE,
    search: filters.search?.trim() || undefined,
    categoryId: filters.categoryId || undefined,
    minPrice: normalizeNumberFilter(filters.minPrice),
    maxPrice: normalizeNumberFilter(filters.maxPrice),
    stockState:
      filters.stockState && filters.stockState !== "all" ? filters.stockState : undefined,
    status: filters.status && filters.status !== "active" ? filters.status : undefined,
    sort: filters.sortBy,
    order: filters.sortOrder,
  };
}

export function ProductManagementPage() {
  const { organization, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [page, setPage] = useState(() =>
    parseFiltersFromSearchParams(new URLSearchParams(searchParams.toString())).page
  );
  const [filters, setFilters] = useState<ProductFilters>(() => ({
    ...DEFAULT_FILTERS,
    ...parseFiltersFromSearchParams(new URLSearchParams(searchParams.toString())).filters,
  }));
  const [searchInput, setSearchInput] = useState(
    () =>
      parseFiltersFromSearchParams(new URLSearchParams(searchParams.toString())).filters.search ?? ""
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

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

    const nextSearchParams = buildProductSearchParams(page, committedFilters);
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

  const {
    products,
    pagination,
    stats,
    categories,
    isCategoriesLoading,
    isLoading,
    isFetching,
    isStatsLoading,
    error,
    deleteProduct,
    refetch,
  } = useProducts(queryFilters, Boolean(organization?.id) && hasPermission("product.read"));

  const {
    updateProductStatus,
    updatingStatusProductId,
    permanentlyDeleteProduct,
    permanentlyDeletingProductId,
  } = useProductMutations();

  const canReadProducts = Boolean(organization?.id) && hasPermission("product.read");
  const canCreateProduct = Boolean(organization?.id) && hasPermission("product.create");
  const canEditProduct = Boolean(organization?.id) && hasPermission("product.update");
  const canDeleteProduct = Boolean(organization?.id) && hasPermission("product.delete");

  const metricCards = useMemo(
    () => [
      {
        title: "Catalogue actif",
        value: isStatsLoading ? "..." : formatNumber(stats.totalProducts),
        description: "Produits actifs actuellement exposes dans votre catalogue.",
        icon: Boxes,
      },
      {
        title: "Ventes cumulees",
        value: isStatsLoading ? "..." : formatNumber(stats.totalSales),
        description: "Volume de ventes calcule depuis les commandes monetisees.",
        icon: ShoppingBag,
      },
      {
        title: "Revenus generes",
        value: isStatsLoading ? "..." : formatProductCurrency(stats.revenueGenerated),
        description: "Chiffre d'affaires consolide par produit sur l'organisation.",
        icon: Wallet,
      },
      {
        title: "Produits moteurs",
        value: isStatsLoading ? "..." : formatNumber(stats.topPerformers),
        description: "References qui surperforment actuellement le benchmark catalogue.",
        icon: TrendingUp,
      },
      {
        title: "Stock cumule",
        value: isStatsLoading ? "..." : formatNumber(stats.totalStock),
        description: "Volume disponible trace par l'inventaire backend.",
        icon: FolderKanban,
      },
      {
        title: "Stock critique",
        value: isStatsLoading ? "..." : formatNumber(stats.lowStockCount),
        description: "Produits sous le seuil de securite dans le catalogue actif.",
        icon: AlertTriangle,
      },
    ],
    [
      isStatsLoading,
      stats.lowStockCount,
      stats.revenueGenerated,
      stats.topPerformers,
      stats.totalProducts,
      stats.totalSales,
      stats.totalStock,
    ]
  );

  const handleFiltersChange = useCallback((nextFilters: ProductFilters) => {
    const { search, ...rest } = nextFilters;

    setSearchInput(search ?? "");
    setFilters((currentFilters) => ({
      ...currentFilters,
      ...rest,
    }));
  }, []);

  const handleCreate = useCallback(() => {
    if (!canCreateProduct) {
      return;
    }

    setEditingProductId(null);
    setIsFormOpen(true);
  }, [canCreateProduct]);

  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
      toast.success("La liste produits et les indicateurs ont ete actualises.");
    } catch (refreshError) {
      toast.error(
        refreshError instanceof Error
          ? refreshError.message
          : "Impossible d'actualiser les donnees produits."
      );
    }
  }, [refetch]);

  const handleEdit = useCallback(
    (product: Product) => {
      if (!canEditProduct) {
        return;
      }

      setEditingProductId(product.id);
      setIsFormOpen(true);
    },
    [canEditProduct]
  );

  const handleFormOpenChange = useCallback((open: boolean) => {
    setIsFormOpen(open);

    if (!open) {
      setEditingProductId(null);
    }
  }, []);

  const handleDelete = useCallback(
    async (product: Product) => {
      try {
        await deleteProduct(product.id);

        if (products.length === 1 && page > 1) {
          setPage(page - 1);
        }

        toast.success("Produit archive hors du catalogue actif.");
      } catch (deleteError) {
        toast.error(
          deleteError instanceof Error
            ? deleteError.message
            : "Impossible de supprimer ce produit."
        );
        throw deleteError;
      }
    },
    [deleteProduct, page, products.length]
  );

  const handleChangeStatus = useCallback(
    async (product: Product, status: Product["status"]) => {
      try {
        await updateProductStatus({
          productId: product.id,
          status,
        });

        const statusMessages: Record<Product["status"], string> = {
          ACTIVE: "Produit publie dans le catalogue.",
          DRAFT: "Produit repasse en brouillon pour revision.",
          PAUSED: "Produit masque temporairement du catalogue.",
          ARCHIVED: "Produit archive hors du catalogue actif.",
        };

        toast.success(statusMessages[status]);
      } catch (statusError) {
        toast.error(
          statusError instanceof Error
            ? statusError.message
            : "Impossible de changer le statut du produit."
        );
        throw statusError;
      }
    },
    [updateProductStatus]
  );

  const handlePermanentDelete = useCallback(
    async (product: Product) => {
      try {
        await permanentlyDeleteProduct(product.id);

        if (products.length === 1 && page > 1) {
          setPage(page - 1);
        }

        toast.success("Produit supprime definitivement.");
      } catch (deleteError) {
        toast.error(
          deleteError instanceof Error
            ? deleteError.message
            : "Impossible de supprimer definitivement ce produit."
        );
        throw deleteError;
      }
    },
    [page, permanentlyDeleteProduct, products.length]
  );

  const displayFilters = useMemo(
    () => ({
      ...filters,
      search: searchInput,
    }),
    [filters, searchInput]
  );

  if (!canReadProducts) {
    return (
      <div className="space-y-8 p-6 md:p-8">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Acces restreint</CardTitle>
            <CardDescription>
              Cette vue est reservee aux sessions disposant de `product.read`.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Le frontend n&apos;essaie plus d&apos;interroger les endpoints catalogue si la permission
            n&apos;est pas accordee.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 p-6 md:p-8">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {metricCards.map((card) => (
              <Card
                key={card.title}
                className="min-w-0 border-border/70 bg-card/95 shadow-sm"
              >
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

        <ProductList
          products={products}
          categories={categories}
          pagination={pagination}
          isLoading={isLoading}
          isRefreshing={isFetching}
          error={error}
          filters={displayFilters}
          onFiltersChange={handleFiltersChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPermanentDelete={handlePermanentDelete}
          onCreateNew={handleCreate}
          onChangeStatus={handleChangeStatus}
          onRefresh={handleRefresh}
          onPageChange={setPage}
          canCreateProduct={canCreateProduct}
          canEditProduct={canEditProduct}
          canDeleteProduct={canDeleteProduct}
          updatingStatusProductId={updatingStatusProductId}
          deletingPermanentProductId={permanentlyDeletingProductId}
        />
      </div>

      <ProductForm
        open={isFormOpen}
        productId={editingProductId}
        onOpenChange={handleFormOpenChange}
        canCreateProduct={canCreateProduct}
        canUpdateProduct={canEditProduct}
        categories={categories}
        isCategoriesLoading={isCategoriesLoading}
      />
    </>
  );
}
