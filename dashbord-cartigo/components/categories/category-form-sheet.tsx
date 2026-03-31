"use client";

import { useMemo, useState } from "react";
import { FolderKanban, LoaderCircle, Save } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type {
  CreateProductCategoryInput,
  ProductCategory,
  UpdateProductCategoryInput,
} from "@/types/category";

type CategoryFormSheetProps = {
  open: boolean;
  category: ProductCategory | null;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: CreateProductCategoryInput) => Promise<unknown>;
  onUpdate: (args: { categoryId: string; payload: UpdateProductCategoryInput }) => Promise<unknown>;
  canCreateCategory: boolean;
  canUpdateCategory: boolean;
  isSubmitting: boolean;
};

const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Le nom de la categorie est obligatoire.")
    .max(100, "Le nom de la categorie ne doit pas depasser 100 caracteres."),
  description: z
    .string()
    .trim()
    .max(500, "La description ne doit pas depasser 500 caracteres.")
    .optional(),
});

type CategoryFormValues = {
  name: string;
  description: string;
};

function buildInitialValues(category: ProductCategory | null): CategoryFormValues {
  return {
    name: category?.name ?? "",
    description: category?.description ?? "",
  };
}

export function CategoryFormSheet({
  open,
  category,
  onOpenChange,
  onCreate,
  onUpdate,
  canCreateCategory,
  canUpdateCategory,
  isSubmitting,
}: CategoryFormSheetProps) {
  const formInstanceKey = `${category?.id ?? "new"}:${open ? "open" : "closed"}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <CategoryFormSheetBody
        key={formInstanceKey}
        category={category}
        onOpenChange={onOpenChange}
        onCreate={onCreate}
        onUpdate={onUpdate}
        canCreateCategory={canCreateCategory}
        canUpdateCategory={canUpdateCategory}
        isSubmitting={isSubmitting}
      />
    </Sheet>
  );
}

type CategoryFormSheetBodyProps = Omit<CategoryFormSheetProps, "open">;

function CategoryFormSheetBody({
  category,
  onOpenChange,
  onCreate,
  onUpdate,
  canCreateCategory,
  canUpdateCategory,
  isSubmitting,
}: CategoryFormSheetBodyProps) {
  const [values, setValues] = useState<CategoryFormValues>(buildInitialValues(category));
  const [errors, setErrors] = useState<Partial<Record<keyof CategoryFormValues, string>>>({});

  const isEditing = Boolean(category?.id);
  const canSubmitCategory = isEditing ? canUpdateCategory : canCreateCategory;
  const helperText = useMemo(() => {
    if (!canSubmitCategory) {
      return "Votre role est en lecture seule sur les categories.";
    }

    return isEditing
      ? "Mettez a jour le libelle et la description sans casser les produits relies."
      : "Creez une categorie produit reutilisable dans tout le catalogue.";
  }, [canSubmitCategory, isEditing]);

  async function handleSubmit() {
    if (!canSubmitCategory) {
      toast.error("Votre role ne permet pas de modifier les categories.");
      return;
    }

    const parsed = categoryFormSchema.safeParse(values);
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof CategoryFormValues, string>> = {};

      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (typeof key === "string" && !(key in nextErrors)) {
          nextErrors[key as keyof CategoryFormValues] = issue.message;
        }
      });

      setErrors(nextErrors);
      toast.error("Corrigez les champs invalides avant d'enregistrer.");
      return;
    }

    try {
      if (category?.id) {
        await onUpdate({
          categoryId: category.id,
          payload: {
            name: parsed.data.name,
            description: parsed.data.description || undefined,
          },
        });
        toast.success("Categorie mise a jour avec succes.");
      } else {
        await onCreate({
          name: parsed.data.name,
          description: parsed.data.description || undefined,
        });
        toast.success("Categorie creee avec succes.");
      }

      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer cette categorie."
      );
    }
  }

  return (
    <SheetContent side="right" className="w-full border-l border-border/70 sm:max-w-xl">
      <SheetHeader className="border-b border-border/70 pb-5">
        <SheetTitle className="flex items-center gap-2 text-2xl">
          <FolderKanban className="h-5 w-5 text-primary" />
          {isEditing ? "Modifier la categorie" : "Nouvelle categorie"}
        </SheetTitle>
        <SheetDescription>{helperText}</SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Definition de la categorie</CardTitle>
            <CardDescription>
              Les produits selectionneront cette categorie depuis une liste fermee.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nom</label>
              <Input
                value={values.name}
                onChange={(event) =>
                  setValues((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Ex: Epicerie premium"
                disabled={!canSubmitCategory}
              />
              {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                value={values.description}
                onChange={(event) =>
                  setValues((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Precisez le role de cette categorie dans le catalogue."
                className="min-h-28"
                disabled={!canSubmitCategory}
              />
              {errors.description ? (
                <p className="text-sm text-destructive">{errors.description}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <SheetFooter className="border-t border-border/70 bg-background/95">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{helperText}</p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={!canSubmitCategory || isSubmitting}>
              {isSubmitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEditing ? "Enregistrer" : "Creer la categorie"}
            </Button>
          </div>
        </div>
      </SheetFooter>
    </SheetContent>
  );
}
