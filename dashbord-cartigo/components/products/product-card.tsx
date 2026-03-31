"use client";

import Image from "next/image";
import { memo } from "react";
import { Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Product } from "@/types/product";

import {
  formatProductCurrency,
  getProductImageUrl,
  isLowStock,
} from "./product-utils";

type ProductCardProps = {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  isDeleting: boolean;
  canEditProduct: boolean;
  canDeleteProduct: boolean;
};

export const ProductCard = memo(function ProductCard({
  product,
  onEdit,
  onDelete,
  isDeleting,
  canEditProduct,
  canDeleteProduct,
}: ProductCardProps) {
  const previewUrl = getProductImageUrl(
    product.imagePreviewUrl,
    product.imageUrl,
    product.name
  );
  const hasLowStock = isLowStock(product);

  return (
    <Card className="overflow-hidden border-border/70 py-0 shadow-sm">
      <button
        type="button"
        onClick={() => {
          if (canEditProduct) {
            onEdit(product);
          }
        }}
        className="block w-full text-left"
        disabled={!canEditProduct}
      >
      <div className="relative aspect-[4/3] border-b border-border/60 bg-muted">
        <Image
          src={previewUrl}
          alt={product.name}
          fill
          unoptimized
          loading="eager"
          priority={false}
          placeholder="empty"
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover"
        />
        </div>
      </button>
      <CardContent className="space-y-4 px-5 py-5">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">{product.name}</p>
              <p className="text-sm text-muted-foreground">{product.sku}</p>
            </div>
            <Badge variant={hasLowStock ? "destructive" : "secondary"} className="rounded-full">
              {hasLowStock ? "Critique" : "Stable"}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              {formatProductCurrency(product.price)}
            </span>
            <span className="text-muted-foreground">{product.stock} unites</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span>{product.category ?? "Sans categorie"}</span>
          <span>
            {product.galleryImages.length} image{product.galleryImages.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(product)}
            disabled={!canDeleteProduct || isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
