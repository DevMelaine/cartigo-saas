"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from "@/hooks/useSettings";
import type { NotificationSettings } from "@/types/settings";

type NotificationSettingsProps = {
  canEdit: boolean;
};

const DEFAULT_SETTINGS: NotificationSettings = {
  emailNotifications: true,
  lowStockAlerts: true,
  salesAlerts: true,
};

export function NotificationSettingsSection({ canEdit }: NotificationSettingsProps) {
  const { data, isLoading, error } = useNotificationSettings(true);
  const { mutateAsync: updateSettings, isPending } = useUpdateNotificationSettings();
  const [formState, setFormState] = useState<NotificationSettings>(DEFAULT_SETTINGS);
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

  function updateField<Key extends keyof NotificationSettings>(
    field: Key,
    value: NotificationSettings[Key]
  ) {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);
  }

  async function handleSave() {
    if (!canEdit || isPending) {
      return;
    }

    try {
      const updated = await updateSettings(formState);
      setFormState(updated);
      setIsDirty(false);
      toast.success("Notifications mises a jour.");
    } catch (submitError) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : "Impossible d'enregistrer les notifications."
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
          {Array.from({ length: 3 }).map((_, index) => (
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
          <CardDescription>Impossible de charger les notifications.</CardDescription>
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
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Configurez les alertes emails et operations.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="email-notifications">Notifications email</Label>
            <p className="text-xs text-muted-foreground">
              Recevoir les messages critiques par email.
            </p>
          </div>
          <Switch
            id="email-notifications"
            checked={formState.emailNotifications}
            onCheckedChange={(value) => updateField("emailNotifications", value)}
            disabled={!canEdit || isPending}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="low-stock-alerts">Alertes stock faible</Label>
            <p className="text-xs text-muted-foreground">
              Notification quand un produit approche du seuil minimum.
            </p>
          </div>
          <Switch
            id="low-stock-alerts"
            checked={formState.lowStockAlerts}
            onCheckedChange={(value) => updateField("lowStockAlerts", value)}
            disabled={!canEdit || isPending}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="sales-alerts">Alertes ventes</Label>
            <p className="text-xs text-muted-foreground">
              Signaux en temps reel pour les ventes importantes.
            </p>
          </div>
          <Switch
            id="sales-alerts"
            checked={formState.salesAlerts}
            onCheckedChange={(value) => updateField("salesAlerts", value)}
            disabled={!canEdit || isPending}
          />
        </div>

        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canEdit || isPending}
          className="w-full sm:w-auto"
        >
          {isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </CardContent>
    </Card>
  );
}
