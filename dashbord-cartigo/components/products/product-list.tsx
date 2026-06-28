"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ImageIcon,
  MoreHorizontalIcon,
  PackageIcon,
  PlusIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import type {
  Product,
  ProductCategoryOption,
  ProductFilters,
  ProductOperationalStatus,
  ProductPagination,
} from "@/types/product";

import {
  formatProductCurrency,
  getPerformanceLabel,
  getPerformanceTone,
  getProductImageUrl,
  getProductStatusDescription,
  getProductStatusLabel,
  getProductStatusTone,
  isLowStock,
} from "./product-utils";

type ProductListProps = {
  products: Product[];
  categories: ProductCategoryOption[];
  pagination: ProductPagination;
  isLoading: boolean;
  isRefreshing?: boolean;
  error?: string | null;
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => Promise<void>;
  onPermanentDelete: (product: Product) => Promise<void>;
  onCreateNew: () => void;
  onChangeStatus: (product: Product, status: ProductOperationalStatus) => Promise<void>;
  onRefresh: () => Promise<void>;
  onPageChange: (page: number) => void;
  canCreateProduct: boolean;
  canEditProduct: boolean;
  canDeleteProduct: boolean;
  updatingStatusProductId?: string | null;
  deletingPermanentProductId?: string | null;
};

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

export function ProductList({
  products,
  categories,
  pagination,
  isLoading,
  isRefreshing = false,
  error,
  filters,
  onFiltersChange,
  onEdit,
  onDelete,
  onPermanentDelete,
  onCreateNew,
  onChangeStatus,
  onRefresh,
  onPageChange,
  canCreateProduct,
  canEditProduct,
  canDeleteProduct,
  updatingStatusProductId,
  deletingPermanentProductId,
}: ProductListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleteMode, setDeleteMode] = useState<"archive" | "permanent">("archive");
  const [isDeleting, setIsDeleting] = useState(false);

  const sortValue = useMemo(
    () => `${filters.sortBy || "updatedAt"}-${filters.sortOrder || "desc"}`,
    [filters.sortBy, filters.sortOrder]
  );

  const hasActiveFilters = useMemo(
    () =>
      Boolean(filters.search?.trim()) ||
      Boolean(filters.categoryId) ||
      Boolean(filters.minPrice?.trim()) ||
      Boolean(filters.maxPrice?.trim()) ||
      (filters.stockState ?? "all") !== "all" ||
      (filters.status ?? "active") !== "active" ||
      sortValue !== "updatedAt-desc",
    [
      filters.categoryId,
      filters.maxPrice,
      filters.minPrice,
      filters.search,
      filters.status,
      filters.stockState,
      sortValue,
    ]
  );

  const handleFilterPatch = useCallback(
    (patch: Partial<ProductFilters>) => {
      onFiltersChange({
        ...filters,
        ...patch,
      });
      onPageChange(1);
    },
    [filters, onFiltersChange, onPageChange]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      handleFilterPatch({ search: value });
    },
    [handleFilterPatch]
  );

  const handleCategoryChange = useCallback(
    (value: string) => {
      handleFilterPatch({
        categoryId: value === "all" ? undefined : value,
      });
    },
    [handleFilterPatch]
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      handleFilterPatch({
        status: value as ProductFilters["status"],
      });
    },
    [handleFilterPatch]
  );

  const handleStockChange = useCallback(
    (value: string) => {
      handleFilterPatch({
        stockState: value as ProductFilters["stockState"],
      });
    },
    [handleFilterPatch]
  );

  const handleSortChange = useCallback(
    (value: string) => {
      const [sortBy, sortOrder] = value.split("-") as [
        ProductFilters["sortBy"],
        ProductFilters["sortOrder"],
      ];

      handleFilterPatch({
        sortBy,
        sortOrder,
      });
    },
    [handleFilterPatch]
  );

  const handleDeleteClick = useCallback((product: Product, mode: "archive" | "permanent") => {
    setProductToDelete(product);
    setDeleteMode(mode);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!productToDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      if (deleteMode === "permanent") {
        await onPermanentDelete(productToDelete);
      } else {
        await onDelete(productToDelete);
      }
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteMode, onDelete, onPermanentDelete, productToDelete]);

  const handleResetFilters = useCallback(() => {
    onFiltersChange(DEFAULT_FILTERS);
    onPageChange(1);
  }, [onFiltersChange, onPageChange]);

  const getStatusActions = useCallback((status: ProductOperationalStatus) => {
    switch (status) {
      case "DRAFT":
        return [{ label: "Publier", nextStatus: "ACTIVE" as const }];
      case "ACTIVE":
        return [{ label: "Mettre en pause", nextStatus: "PAUSED" as const }];
      case "PAUSED":
        return [{ label: "Reprendre", nextStatus: "ACTIVE" as const }];
      case "ARCHIVED":
      default:
        return [{ label: "Remettre en brouillon", nextStatus: "DRAFT" as const }];
    }
  }, []);

  const hasPreviousPage = pagination.page > 1;
  const hasNextPage = pagination.page < pagination.totalPages;

  if (error) {
    return (
      <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
          <AlertTriangleIcon className="h-3.5 w-3.5" />
          Echec de chargement
        </div>
        <p className="mt-3 text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[1.75rem] border border-border/70 bg-card/95 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit, un SKU ou un code-barres"
              value={filters.search || ""}
              onChange={(event) => handleSearchChange(event.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={sortValue} onValueChange={handleSortChange}>
              <SelectTrigger className="w-full sm:w-[190px]">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updatedAt-desc">Plus recents</SelectItem>
                <SelectItem value="createdAt-desc">Creation recente</SelectItem>
                <SelectItem value="name-asc">Nom A-Z</SelectItem>
                <SelectItem value="name-desc">Nom Z-A</SelectItem>
                <SelectItem value="price-asc">Prix croissant</SelectItem>
                <SelectItem value="price-desc">Prix decroissant</SelectItem>
                <SelectItem value="stock-asc">Stock croissant</SelectItem>
                <SelectItem value="stock-desc">Stock decroissant</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => void onRefresh()}
              className="shrink-0"
              disabled={isRefreshing}
            >
              <RefreshCwIcon className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              <span className="hidden sm:inline">
                {isRefreshing ? "Actualisation..." : "Actualiser"}
              </span>
            </Button>

            <Button onClick={onCreateNew} className="shrink-0" disabled={!canCreateProduct}>
              <PlusIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Nouveau produit</span>
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_180px_180px_auto]">
          <Select value={filters.categoryId || "all"} onValueChange={handleCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Categorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Prix min"
              inputMode="decimal"
              value={filters.minPrice || ""}
              onChange={(event) => handleFilterPatch({ minPrice: event.target.value })}
            />
            <Input
              placeholder="Prix max"
              inputMode="decimal"
              value={filters.maxPrice || ""}
              onChange={(event) => handleFilterPatch({ maxPrice: event.target.value })}
            />
          </div>

          <Select value={filters.status || "active"} onValueChange={handleStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="draft">Brouillons</SelectItem>
              <SelectItem value="paused">En pause</SelectItem>
              <SelectItem value="archived">Archives</SelectItem>
              <SelectItem value="all">Tous</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.stockState || "all"} onValueChange={handleStockChange}>
            <SelectTrigger>
              <SelectValue placeholder="Stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les stocks</SelectItem>
              <SelectItem value="in_stock">En stock</SelectItem>
              <SelectItem value="out_of_stock">Rupture</SelectItem>
              <SelectItem value="low_stock">Stock critique</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center text-sm text-muted-foreground">
            {pagination.total} resultat{pagination.total > 1 ? "s" : ""}
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              className="rounded-full"
            >
              <RotateCcwIcon className="h-4 w-4" />
              Reinitialiser
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-sm">
        <div className="max-h-[42rem] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky top-0 z-10 w-[88px] bg-card/95 backdrop-blur">
                  Image
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                  Produit
                </TableHead>
                <TableHead className="sticky top-0 z-10 text-right bg-card/95 backdrop-blur">
                  Prix
                </TableHead>
                <TableHead className="sticky top-0 z-10 text-right bg-card/95 backdrop-blur">
                  Stock
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                  Etat
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                  Galerie
                </TableHead>
                <TableHead className="sticky top-0 z-10 w-[70px] bg-card/95 backdrop-blur" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell>
                        <Skeleton className="h-12 w-12 rounded-2xl" />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-36" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-4 w-14" />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <Skeleton className="h-6 w-20 rounded-full" />
                          <Skeleton className="h-6 w-24 rounded-full" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8 rounded-lg" />
                      </TableCell>
                    </TableRow>
                  ))
                : null}

              {!isLoading && products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-[22rem]">
                    <Empty className="border-0 bg-transparent">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <PackageIcon className="h-6 w-6" />
                        </EmptyMedia>
                        <EmptyTitle>Aucun produit trouve</EmptyTitle>
                        <EmptyDescription>
                          {hasActiveFilters
                            ? "Essayez d'ajuster la recherche ou les filtres."
                            : "Commencez par creer votre premier produit."}
                        </EmptyDescription>
                      </EmptyHeader>
                      {!hasActiveFilters ? (
                        <EmptyContent>
                          <Button onClick={onCreateNew} disabled={!canCreateProduct}>
                            <PlusIcon className="h-4 w-4" />
                            Nouveau produit
                          </Button>
                        </EmptyContent>
                      ) : null}
                    </Empty>
                  </TableCell>
                </TableRow>
              ) : null}

              {!isLoading
                ? products.map((product) => {
                    const previewUrl = getProductImageUrl(
                      product.imagePreviewUrl,
                      product.imageUrl,
                      product.name
                    );
                    const stockIsLow = isLowStock(product);
                    const isUpdatingCurrentStatus = updatingStatusProductId === product.id;
                    const isDeletingPermanently = deletingPermanentProductId === product.id;
                    const statusActions = getStatusActions(product.status);

                    return (
                      <TableRow
                        key={product.id}
                        className={cn(canEditProduct && "cursor-pointer")}
                        onClick={() => {
                          if (canEditProduct) {
                            onEdit(product);
                          }
                        }}
                      >
                        <TableCell>
                          <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-border/70 bg-muted">
                            {product.imageUrl ? (
                              <Image
                                src={previewUrl}
                                alt={product.name}
                                fill
                                unoptimized
                                loading="eager"
                                priority={false}
                                placeholder="empty"
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <ImageIcon className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1.5">
                            <p className="line-clamp-1 font-medium text-foreground">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              SKU: {product.sku}
                              {product.category ? ` | ${product.category}` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {product.totalSales} vente{product.totalSales > 1 ? "s" : ""} |{" "}
                              {formatProductCurrency(product.revenueGenerated)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {formatProductCurrency(product.price)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div
                              className={cn(
                                "font-medium",
                                stockIsLow ? "text-destructive" : "text-foreground"
                              )}
                            >
                              {product.stock}
                              {stockIsLow ? (
                                <AlertTriangleIcon className="ml-1 inline-block h-3.5 w-3.5 text-destructive" />
                              ) : null}
                            </div>
                            {stockIsLow ? (
                              <div className="text-xs text-destructive">Stock critique</div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-2">
                            <Badge
                              variant="outline"
                              className={cn("capitalize", getProductStatusTone(product.status))}
                            >
                              {getProductStatusLabel(product.status)}
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              {getProductStatusDescription(product.status)}
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "border text-xs",
                                getPerformanceTone(product.performanceIndicator)
                              )}
                            >
                              {getPerformanceLabel(product.performanceIndicator)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div>{product.galleryImages.length} image{product.galleryImages.length > 1 ? "s" : ""}</div>
                          <div className="text-xs text-muted-foreground/80">
                            Mis a jour {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(new Date(product.updatedAt))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontalIcon className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {statusActions.map((action) => (
                                <DropdownMenuItem
                                  key={`${product.id}-${action.nextStatus}`}
                                  onClick={async (event) => {
                                    event.stopPropagation();
                                    await onChangeStatus(product, action.nextStatus);
                                  }}
                                  disabled={
                                    !canEditProduct ||
                                    isUpdatingCurrentStatus ||
                                    isDeletingPermanently
                                  }
                                >
                                  <PackageIcon className="h-4 w-4" />
                                  {isUpdatingCurrentStatus
                                    ? "Mise a jour..."
                                    : action.label}
                                </DropdownMenuItem>
                              ))}
                              {product.status === "ARCHIVED" ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleDeleteClick(product, "permanent");
                                    }}
                                    disabled={!canDeleteProduct || isDeletingPermanently}
                                  >
                                    <Trash2Icon className="h-4 w-4" />
                                    {isDeletingPermanently
                                      ? "Suppression..."
                                      : "Supprimer"}
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleDeleteClick(product, "archive");
                                    }}
                                    disabled={!canDeleteProduct}
                                  >
                                    <Trash2Icon className="h-4 w-4" />
                                    Archiver
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                : null}
            </TableBody>
          </Table>
        </div>

        {!isLoading && products.length > 0 ? (
          <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} sur {pagination.totalPages || 1} | {pagination.total} produit
              {pagination.total > 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={!hasPreviousPage}
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Precedent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={!hasNextPage}
              >
                Suivant
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteMode === "permanent" ? "Supprimer le produit" : "Archiver le produit"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMode === "permanent"
                ? `Confirmez la suppression definitive de "${productToDelete?.name}". Cette action est irreversible.`
                : `Confirmez l'archivage de "${productToDelete?.name}". Le produit sera retire du catalogue actif, non commandable, mais restera restaurable.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmDelete()}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting
                ? deleteMode === "permanent"
                  ? "Suppression..."
                  : "Archivage..."
                : deleteMode === "permanent"
                  ? "Supprimer"
                  : "Archiver"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
