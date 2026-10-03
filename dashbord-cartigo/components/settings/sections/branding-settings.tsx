"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ImageUpload } from "@/components/upload/image-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpload } from "@/hooks/useUpload";
import {
  useBrandingSettings,
  useUpdateBrandingSettings,
} from "@/hooks/useSettings";
import type { BrandingSettings } from "@/types/settings";

type BrandingSettingsProps = {
  canEdit: boolean;
};

const DEFAULT_SETTINGS: BrandingSettings = {
  primaryColor: "#0f766e",
  logoUrl: null,
  displayName: "",
};

export function BrandingSettingsSection({ canEdit }: BrandingSettingsProps) {
  const { data, isLoading, error } = useBrandingSettings(true);
  const { mutateAsync: updateSettings, isPending } = useUpdateBrandingSettings();
  const { createUploadHandler, error: uploadError, clearError } = useUpload();
  const [formState, setFormState] = useState<BrandingSettings>(DEFAULT_SETTINGS);
  const [isDirty, setIsDirty] = useState(false);

  const normalizedData = useMemo(
    () => data ?? DEFAULT_SETTINGS,
    [data]
  );

  useEffect(() => {
    if (!isDirty) {
      setFormState(normalizedData);
    }
  }, [isDirty, normalizedData]);

  function updateField<Key extends keyof BrandingSettings>(
    field: Key,
    value: BrandingSettings[Key]
  ) {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canEdit || isPending) {
      return;
    }

    try {
      const updated = await updateSettings(formState);
      setFormState(updated);
      setIsDirty(false);
      toast.success("Branding mis a jour.");
    } catch (submitError) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : "Impossible d'enregistrer le branding."
      );
    }
  }

  if (isLoading) {
    return (
      <Card className="border-border/70">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle>Erreur</CardTitle>
          <CardDescription>Impossible de charger le branding.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : String(error)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>
          Logo, couleur principale et nom d&apos;affichage de votre organisation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-6" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label>Logo</Label>
            <ImageUpload
              value={formState.logoUrl}
              onChange={(value) => updateField("logoUrl", value)}
              onUpload={createUploadHandler("logo")}
              disabled={!canEdit || isPending}
            />
            {uploadError ? (
              <p className="text-sm text-destructive" onClick={clearError}>
                {uploadError}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="branding-color">Couleur principale</Label>
              <Input
                id="branding-color"
                type="color"
                value={formState.primaryColor}
                onChange={(event) => updateField("primaryColor", event.target.value)}
                disabled={!canEdit || isPending}
                className="h-12"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="branding-name">Nom d&apos;affichage</Label>
              <Input
                id="branding-name"
                value={formState.displayName}
                onChange={(event) => updateField("displayName", event.target.value)}
                disabled={!canEdit || isPending}
                placeholder="Cartigo Store"
              />
            </div>
          </div>

          <Card className="border-border/70 bg-secondary/30">
            <CardContent className="grid gap-2 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Apercu rapide</p>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: formState.primaryColor }}
                />
                <span className="text-sm">{formState.displayName || "Nom de marque"}</span>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={!canEdit || isPending} className="w-full sm:w-auto">
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
