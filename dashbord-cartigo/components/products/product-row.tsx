"use client";

import Image from "next/image";
import { memo } from "react";
import { Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Product } from "@/types/product";

import {
  formatProductCurrency,
  getProductImageUrl,
  isLowStock,
} from "./product-utils";

type ProductRowProps = {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  isDeleting: boolean;
  canEditProduct: boolean;
  canDeleteProduct: boolean;
};

export const ProductRow = memo(function ProductRow({
  product,
  onEdit,
  onDelete,
  isDeleting,
  canEditProduct,
  canDeleteProduct,
}: ProductRowProps) {
  const previewUrl = getProductImageUrl(
    product.imagePreviewUrl,
    product.imageUrl,
    product.name
  );
  const hasLowStock = isLowStock(product);

  return (
    <TableRow
      className="border-border/60"
      onClick={() => {
        if (canEditProduct) {
          onEdit(product);
        }
      }}
    >
      <TableCell className="min-w-[20rem] py-4">
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-border/70 bg-muted">
            <Image
              src={previewUrl}
              alt={product.name}
              fill
              unoptimized
              loading="eager"
              priority={false}
              placeholder="empty"
              sizes="56px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{product.sku}</span>
              {product.category ? (
                <>
                  <span className="text-border">|</span>
                  <span>{product.category}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-4 text-sm font-medium text-foreground">
        {formatProductCurrency(product.price)}
      </TableCell>
      <TableCell className="py-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">{product.stock} unites</span>
          <Badge variant={hasLowStock ? "destructive" : "secondary"} className="rounded-full">
            {hasLowStock ? "Stock critique" : "Stock stable"}
          </Badge>
        </div>
      </TableCell>
      <TableCell className="py-4 text-sm text-muted-foreground">
        {product.galleryImages.length} image{product.galleryImages.length > 1 ? "s" : ""}
      </TableCell>
      <TableCell className="py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(product);
            }}
            disabled={!canDeleteProduct || isDeleting}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});
