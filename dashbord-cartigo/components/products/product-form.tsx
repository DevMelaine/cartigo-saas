"use client";

import { ImagePlus, LoaderCircle, PackagePlus, Save, Sparkles } from "lucide-react";

import { ImageUpload, ImageUploaderGallery } from "@/components/upload";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useProductForm } from "@/hooks/useProductForm";
import type { ProductCategoryOption } from "@/types/product";

type ProductFormProps = {
  open: boolean;
  productId?: string | null;
  onOpenChange: (open: boolean) => void;
  canCreateProduct?: boolean;
  canUpdateProduct?: boolean;
  categories: ProductCategoryOption[];
  isCategoriesLoading?: boolean;
};

function renderFieldError(message?: string) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

export function ProductForm({
  open,
  productId,
  onOpenChange,
  canCreateProduct = true,
  canUpdateProduct = true,
  categories,
  isCategoriesLoading = false,
}: ProductFormProps) {
  const {
    values,
    errors,
    submitError,
    activeProductId,
    canSubmitProduct,
    canUpload,
    isSaving,
    isHydratingProduct,
    loadError,
    refetchProduct,
    updateField,
    updateMainImage,
    updateGalleryImages,
    submit,
    mainImageUploadHandler,
    galleryUploadHandler,
  } = useProductForm({
    open,
    productId,
    canCreateProduct,
    canUpdateProduct,
  });

  if (productId && isHydratingProduct && open) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full border-l border-border/70 sm:max-w-3xl">
          <SheetHeader className="sr-only">
            <SheetTitle>Chargement du produit</SheetTitle>
            <SheetDescription>
              Chargement des informations du produit avant edition.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-6 py-6">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-72 w-full rounded-[1.5rem]" />
            <Skeleton className="h-72 w-full rounded-[1.5rem]" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full border-l border-border/70 sm:max-w-3xl">
        <SheetHeader className="border-b border-border/70 pb-5">
          <SheetTitle className="flex items-center gap-2 text-2xl">
            {activeProductId ? (
              <Sparkles className="h-5 w-5 text-primary" />
            ) : (
              <PackagePlus className="h-5 w-5 text-primary" />
            )}
            {activeProductId ? "Edition du produit" : "Nouveau produit"}
          </SheetTitle>
          <SheetDescription>
            Completez les informations du produit, ajoutez les images, puis enregistrez.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {loadError ? (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Impossible de charger ce produit
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
                </div>
                <Button variant="outline" onClick={() => void refetchProduct()}>
                  Reessayer
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Informations essentielles</CardTitle>
              <CardDescription>
                Renseignez le coeur du produit puis ajoutez les medias si besoin.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Nom du produit</label>
                <Input
                  value={values.name}
                  onChange={(event) => updateField("name", event.target.value)}
                />
                {renderFieldError(errors.name)}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Description</label>
                <Textarea
                  value={values.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  className="min-h-28"
                />
                {renderFieldError(errors.description)}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Categorie</label>
                <Select
                  value={values.categoryId}
                  onValueChange={(value) => updateField("categoryId", value)}
                  disabled={isCategoriesLoading || categories.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionnez une categorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {renderFieldError(errors.categoryId)}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Code-barres</label>
                <Input
                  value={values.barcode}
                  onChange={(event) => updateField("barcode", event.target.value)}
                />
                {renderFieldError(errors.barcode)}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">SKU</label>
                <Input
                  value={values.sku}
                  onChange={(event) => updateField("sku", event.target.value)}
                />
                {renderFieldError(errors.sku)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Tarification et stock</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Input
                  value={values.price}
                  onChange={(event) => updateField("price", event.target.value)}
                  placeholder="Prix de vente"
                  inputMode="decimal"
                />
                {renderFieldError(errors.price)}
              </div>

              <div className="space-y-2">
                <Input
                  value={values.costPrice}
                  onChange={(event) => updateField("costPrice", event.target.value)}
                  placeholder="Prix d'achat"
                  inputMode="decimal"
                />
                {renderFieldError(errors.costPrice)}
              </div>

              <div className="space-y-2">
                <Input
                  value={values.stock}
                  onChange={(event) => updateField("stock", event.target.value)}
                  placeholder="Stock actuel"
                  inputMode="numeric"
                />
                {renderFieldError(errors.stock)}
              </div>

              <div className="space-y-2">
                <Input
                  value={values.lowStockThreshold}
                  onChange={(event) => updateField("lowStockThreshold", event.target.value)}
                  placeholder="Seuil de stock bas"
                  inputMode="numeric"
                />
                {renderFieldError(errors.lowStockThreshold)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImagePlus className="h-5 w-5 text-primary" />
                Image principale
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImageUpload
                value={values.imageUrl}
                onChange={updateMainImage}
                onRemove={() => updateMainImage(null)}
                onUpload={mainImageUploadHandler}
                disabled={!canUpload || isSaving}
              />
              {!canUpload ? (
                <p className="text-sm text-muted-foreground">
                  {canSubmitProduct
                    ? "Connectez-vous avec une organisation active pour envoyer des images."
                    : "Votre role ne permet pas de gerer les images de ce produit."}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Galerie produit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImageUploaderGallery
                value={values.galleryImages}
                onChange={updateGalleryImages}
                onUpload={galleryUploadHandler}
                maxImages={8}
                disabled={!canUpload || isSaving}
              />
            </CardContent>
          </Card>
        </div>

        <SheetFooter className="border-t border-border/70 bg-background/95">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {canUpload
                  ? "Les URLs d'images restent dans le formulaire jusqu'a l'enregistrement du produit."
                  : canSubmitProduct
                    ? "Connectez-vous avec une organisation active pour activer l'upload d'images."
                    : "Votre role ne permet pas de modifier ce produit."}
              </p>
              {submitError ? (
                <p className="text-sm text-destructive">{submitError}</p>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
              <Button onClick={() => void submit()} disabled={!canSubmitProduct || isSaving}>
                {isSaving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {activeProductId ? "Enregistrer les changements" : "Creer le produit"}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
