"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useOrganizationSettings,
  useUpdateOrganizationSettings,
} from "@/hooks/useSettings";
import type { OrganizationSettings } from "@/types/settings";

type OrganizationSettingsProps = {
  canEdit: boolean;
};

const DEFAULT_SETTINGS: OrganizationSettings = {
  name: "",
  email: "",
  phone: "",
  address: "",
  currency: "XOF",
  timezone: "Africa/Lome",
  logoUrl: null,
};

export function OrganizationSettingsSection({ canEdit }: OrganizationSettingsProps) {
  const { data, isLoading, error } = useOrganizationSettings(true);
  const { mutateAsync: updateSettings, isPending } = useUpdateOrganizationSettings();
  const [formState, setFormState] = useState<OrganizationSettings>(DEFAULT_SETTINGS);
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

  function updateField<Key extends keyof OrganizationSettings>(
    field: Key,
    value: OrganizationSettings[Key]
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
      toast.success("Parametres d'organisation enregistres.");
    } catch (submitError) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : "Impossible d'enregistrer l'organisation."
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
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle>Erreur</CardTitle>
          <CardDescription>Impossible de charger l'organisation.</CardDescription>
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
        <CardTitle>Organisation</CardTitle>
        <CardDescription>
          Informations principales rattachees a votre organisation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="org-name">Nom</Label>
            <Input
              id="org-name"
              value={formState.name}
              onChange={(event) => updateField("name", event.target.value)}
              disabled={!canEdit || isPending}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="org-email">Email</Label>
            <Input
              id="org-email"
              type="email"
              value={formState.email}
              onChange={(event) => updateField("email", event.target.value)}
              disabled={!canEdit || isPending}
              placeholder="contact@organisation.com"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="org-phone">Telephone</Label>
            <Input
              id="org-phone"
              value={formState.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              disabled={!canEdit || isPending}
              placeholder="+228 90 00 00 00"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="org-address">Adresse</Label>
            <Textarea
              id="org-address"
              value={formState.address}
              onChange={(event) => updateField("address", event.target.value)}
              disabled={!canEdit || isPending}
              placeholder="Quartier, ville, pays"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="org-currency">Devise</Label>
              <Input
                id="org-currency"
                value={formState.currency}
                onChange={(event) => updateField("currency", event.target.value)}
                disabled={!canEdit || isPending}
                placeholder="XOF"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="org-timezone">Timezone</Label>
              <Input
                id="org-timezone"
                value={formState.timezone}
                onChange={(event) => updateField("timezone", event.target.value)}
                disabled={!canEdit || isPending}
                placeholder="Africa/Lome"
              />
            </div>
          </div>

          <Button type="submit" disabled={!canEdit || isPending} className="w-full sm:w-auto">
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
