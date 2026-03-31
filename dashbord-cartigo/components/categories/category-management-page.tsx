"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  FolderKanban,
  Layers3,
  LoaderCircle,
  Search,
  Tags,
} from "lucide-react";
import { toast } from "sonner";

import { CategoryFormSheet } from "@/components/categories/category-form-sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { ProductCategory } from "@/types/category";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function CategoryManagementPage() {
  const { organization, hasPermission } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);

  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const {
    categories,
    total,
    isLoading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    isCreating,
    isUpdating,
    isDeleting,
    deletingCategoryId,
  } = useCategories(debouncedSearch, Boolean(organization?.id) && hasPermission("category.read"));

  const canReadCategories = Boolean(organization?.id) && hasPermission("category.read");
  const canCreateCategory = Boolean(organization?.id) && hasPermission("category.create");
  const canUpdateCategory = Boolean(organization?.id) && hasPermission("category.update");
  const canDeleteCategory = Boolean(organization?.id) && hasPermission("category.delete");

  const usedCategories = useMemo(
    () => categories.filter((category) => category.productCount > 0).length,
    [categories]
  );
  const emptyCategories = total - usedCategories;

  function openCreateSheet() {
    setEditingCategory(null);
    setIsSheetOpen(true);
  }

  function openEditSheet(category: ProductCategory) {
    setEditingCategory(category);
    setIsSheetOpen(true);
  }

  async function handleDeleteCategory(category: ProductCategory) {
    try {
      await deleteCategory(category.id);
      toast.success("Categorie supprimee avec succes.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer cette categorie."
      );
    }
  }

  if (!canReadCategories) {
    return (
      <div className="space-y-8 p-6 md:p-8">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Acces restreint</CardTitle>
            <CardDescription>
              Cette vue requiert la permission `category.read`.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Le frontend n&apos;envoie plus de requete categories quand la session reste en lecture
            insuffisante.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 p-6 md:p-8">
        <section className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/70 bg-background/80 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardDescription>Total categories</CardDescription>
                  <div className="rounded-2xl border border-border/70 bg-secondary/60 p-2">
                    <Tags className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-2xl">
                  {isLoading ? "..." : new Intl.NumberFormat("fr-FR").format(total)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                Categories produit disponibles dans l&apos;organisation.
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-background/80 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardDescription>Categories utilisees</CardDescription>
                  <div className="rounded-2xl border border-border/70 bg-secondary/60 p-2">
                    <Layers3 className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-2xl">
                  {isLoading ? "..." : new Intl.NumberFormat("fr-FR").format(usedCategories)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                Categories rattachees a au moins un produit actif.
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-background/80 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardDescription>Categories vides</CardDescription>
                  <div className="rounded-2xl border border-border/70 bg-secondary/60 p-2">
                    <AlertTriangle className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-2xl">
                  {isLoading ? "..." : new Intl.NumberFormat("fr-FR").format(emptyCategories)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                Categories encore libres ou a rationaliser.
              </CardContent>
            </Card>
        </section>

        <Card className="border-border/70">
          <CardHeader className="flex flex-col gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle>Catalogue des categories</CardTitle>
              <CardDescription>
                Liste centralisee des categories utilisables dans les formulaires produit.
              </CardDescription>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:max-w-2xl">
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Rechercher une categorie"
                  className="pl-9"
                />
              </div>

              <Button
                onClick={openCreateSheet}
                disabled={!canCreateCategory}
                className="shrink-0 rounded-full"
              >
                <FolderKanban className="h-4 w-4" />
                Nouvelle categorie
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full rounded-[1.25rem]" />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-[1.25rem] border border-destructive/20 bg-destructive/5 p-6">
                <p className="text-sm font-medium text-foreground">
                  Impossible de charger les categories.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-secondary/30 px-6 text-center">
                <FolderKanban className="h-8 w-8 text-primary" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  Aucune categorie pour le moment
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Creez votre premiere categorie pour structurer le catalogue et alimenter la
                  liste deroulante des produits.
                </p>
                <Button
                  onClick={openCreateSheet}
                  disabled={!canCreateCategory}
                  className="mt-5 rounded-full"
                >
                  <FolderKanban className="h-4 w-4" />
                  Creer une categorie
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categorie</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Produits relies</TableHead>
                    <TableHead>Creee le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{category.name}</p>
                          <p className="text-xs text-muted-foreground">{category.id.slice(0, 8)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-sm text-muted-foreground">
                        {category.description || "Aucune description"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{category.productCount}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(category.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditSheet(category)}
                            disabled={!canUpdateCategory}
                          >
                            Modifier
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!canDeleteCategory || isDeleting}
                              >
                                Supprimer
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer cette categorie ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irreversible. Si des produits sont encore relies,
                                  la suppression sera refusee par le backend.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => void handleDeleteCategory(category)}
                                  disabled={deletingCategoryId === category.id}
                                >
                                  {deletingCategoryId === category.id ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                  ) : null}
                                  Confirmer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <CategoryFormSheet
        open={isSheetOpen}
        category={editingCategory}
        onOpenChange={setIsSheetOpen}
        onCreate={createCategory}
        onUpdate={updateCategory}
        canCreateCategory={canCreateCategory}
        canUpdateCategory={canUpdateCategory}
        isSubmitting={isCreating || isUpdating}
      />
    </>
  );
}
