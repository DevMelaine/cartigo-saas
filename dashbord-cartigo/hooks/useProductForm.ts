"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useProduct, useProductMutations } from "@/hooks/useProducts";
import { useUpload } from "@/hooks/useUpload";
import type { Product } from "@/types/product";

const productFormSchema = z.object({
  name: z.string().trim().min(2, "Le nom du produit est obligatoire."),
  description: z.string().trim().optional(),
  categoryId: z.string().uuid("Selectionnez une categorie valide."),
  sku: z.string().trim().min(1, "Le SKU est obligatoire."),
  barcode: z.string().trim().optional(),
  price: z.string().trim().min(1, "Le prix est obligatoire."),
  costPrice: z.string().trim().optional(),
  stock: z.string().trim().min(1, "Le stock est obligatoire."),
  lowStockThreshold: z.string().trim().optional(),
});

type ProductFormField =
  | "name"
  | "description"
  | "categoryId"
  | "sku"
  | "barcode"
  | "price"
  | "costPrice"
  | "stock"
  | "lowStockThreshold";

export type ProductFormValues = {
  name: string;
  description: string;
  categoryId: string;
  sku: string;
  barcode: string;
  price: string;
  costPrice: string;
  stock: string;
  lowStockThreshold: string;
  imageUrl: string | null;
  galleryImages: string[];
};

export type ProductFieldErrors = Partial<Record<ProductFormField, string>>;

type UseProductFormOptions = {
  open: boolean;
  productId?: string | null;
  canCreateProduct?: boolean;
  canUpdateProduct?: boolean;
};

function emptyValues(): ProductFormValues {
  return {
    name: "",
    description: "",
    categoryId: "",
    sku: "",
    barcode: "",
    price: "",
    costPrice: "",
    stock: "",
    lowStockThreshold: "",
    imageUrl: null,
    galleryImages: [],
  };
}

function mapProductToForm(product: Product): ProductFormValues {
  return {
    name: product.name,
    description: product.description ?? "",
    categoryId: product.categoryId ?? "",
    sku: product.sku,
    barcode: product.barcode ?? "",
    price: String(product.price),
    costPrice: product.costPrice == null ? "" : String(product.costPrice),
    stock: String(product.stock),
    lowStockThreshold:
      product.lowStockThreshold == null ? "" : String(product.lowStockThreshold),
    imageUrl: product.imageUrl,
    galleryImages: product.galleryImages,
  };
}

function mapErrors(error: z.ZodError): ProductFieldErrors {
  return error.issues.reduce<ProductFieldErrors>((accumulator, issue) => {
    const field = issue.path[0];

    if (typeof field === "string" && !(field in accumulator)) {
      accumulator[field as ProductFormField] = issue.message;
    }

    return accumulator;
  }, {});
}

function normalizeSubmitPayload(values: ProductFormValues) {
  return {
    name: values.name.trim(),
    description: values.description.trim() || undefined,
    categoryId: values.categoryId,
    sku: values.sku.trim().toUpperCase(),
    barcode: values.barcode.trim() || undefined,
    price: values.price.trim(),
    costPrice: values.costPrice.trim() || undefined,
    stock: values.stock.trim(),
    lowStockThreshold: values.lowStockThreshold.trim() || undefined,
    imageUrl: values.imageUrl,
    galleryImages: values.galleryImages,
  };
}

export function useProductForm({
  open,
  productId,
  canCreateProduct = true,
  canUpdateProduct = true,
}: UseProductFormOptions) {
  const { organizationId } = useAuth();
  const { createProduct, updateProduct, isCreating, isUpdating } = useProductMutations();
  const productQuery = useProduct(productId, open && Boolean(productId));
  const [values, setValues] = useState<ProductFormValues>(emptyValues);
  const [errors, setErrors] = useState<ProductFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftProductId, setDraftProductId] = useState<string | null>(null);
  const initializedSessionRef = useRef<string | null>(null);

  const activeProductId = draftProductId ?? productId ?? null;
  const isSaving = isCreating || isUpdating;
  const canSubmitProduct = activeProductId ? canUpdateProduct : canCreateProduct;
  const canUpload = Boolean(organizationId) && (canCreateProduct || canUpdateProduct);
  const isHydratingProduct = Boolean(open && productId && productQuery.isLoading && !productQuery.data);
  const loadError =
    productQuery.error instanceof Error ? productQuery.error.message : null;

  useEffect(() => {
    if (!open) {
      initializedSessionRef.current = null;
      return;
    }

    const sessionKey = productId ? `edit:${productId}` : "create";

    if (initializedSessionRef.current === sessionKey) {
      return;
    }

    if (!productId) {
      startTransition(() => {
        setDraftProductId(null);
        setValues(emptyValues());
        setErrors({});
        setSubmitError(null);
      });
      initializedSessionRef.current = sessionKey;
      return;
    }

    if (!productQuery.data) {
      return;
    }

    startTransition(() => {
      setDraftProductId(productQuery.data.id);
      setValues(mapProductToForm(productQuery.data));
      setErrors({});
      setSubmitError(null);
    });
    initializedSessionRef.current = sessionKey;
  }, [open, productId, productQuery.data]);

  const { createUploadHandler } = useUpload();

  const updateField = useCallback((field: ProductFormField, value: string) => {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));
    setSubmitError(null);
  }, []);

  const updateMainImage = useCallback((imageUrl: string | null) => {
    setValues((currentValues) => ({
      ...currentValues,
      imageUrl,
    }));
    setSubmitError(null);
  }, []);

  const updateGalleryImages = useCallback((galleryImages: string[]) => {
    setValues((currentValues) => ({
      ...currentValues,
      galleryImages,
    }));
    setSubmitError(null);
  }, []);

  const submit = useCallback(async () => {
    if (!canSubmitProduct) {
      const message = activeProductId
        ? "Votre role ne permet pas de modifier ce produit."
        : "Votre role ne permet pas de creer ce produit.";
      setSubmitError(message);
      toast.error(message);
      return null;
    }

    const parsedValues = productFormSchema.safeParse(values);

    if (!parsedValues.success) {
      setErrors(mapErrors(parsedValues.error));
      setSubmitError("Corrigez les champs invalides avant d'enregistrer.");
      toast.error("Corrigez les champs invalides avant d'enregistrer.");
      return null;
    }

    setSubmitError(null);

    try {
      const payload = normalizeSubmitPayload(values);
      const savedProduct = activeProductId
        ? await updateProduct({
            productId: activeProductId,
            payload,
          })
        : await createProduct(payload);

      setDraftProductId(savedProduct.id);
      setValues(mapProductToForm(savedProduct));
      setErrors({});
      setSubmitError(null);
      toast.success(activeProductId ? "Produit mis a jour." : "Produit cree.");

      return savedProduct;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer le produit.";

      setSubmitError(message);
      toast.error(message);
      return null;
    }
  }, [activeProductId, canSubmitProduct, createProduct, updateProduct, values]);

  const mainImageUploadHandler = useMemo(
    () => createUploadHandler("product"),
    [createUploadHandler]
  );
  const galleryUploadHandler = useMemo(
    () => createUploadHandler("product"),
    [createUploadHandler]
  );

  return {
    values,
    errors,
    submitError,
    activeProductId,
    canSubmitProduct,
    canUpload,
    isSaving,
    isHydratingProduct,
    loadError,
    refetchProduct: productQuery.refetch,
    updateField,
    updateMainImage,
    updateGalleryImages,
    submit,
    mainImageUploadHandler,
    galleryUploadHandler,
  };
}
