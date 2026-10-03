"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBillingInfo } from "@/hooks/useSettings";

type BillingSettingsProps = {
  canAccess: boolean;
};

export function BillingSettingsSection({ canAccess }: BillingSettingsProps) {
  const { data, isLoading, error } = useBillingInfo(canAccess);

  if (!canAccess) {
    return (
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Acces restreint</CardTitle>
          <CardDescription>La facturation est reservee au role `ADMIN`.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Les informations de facturation ne sont pas chargees pour les autres roles.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-border/70">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-10 w-28" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle>Erreur</CardTitle>
          <CardDescription>Impossible de charger la facturation.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : String(error)}
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const renewalDate = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(new Date(data.renewalDate));

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Facturation</CardTitle>
        <CardDescription>Informations de plan et statut de facturation.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm text-muted-foreground">
        <div className="flex items-center justify-between gap-4">
          <span>Plan actuel</span>
          <span className="font-medium text-foreground">{data.plan}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Statut</span>
          <span className="font-medium text-foreground">{data.status}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Prochain renouvellement</span>
          <span className="font-medium text-foreground">{renewalDate}</span>
        </div>
        <Button type="button" className="w-full sm:w-auto" disabled>
          Upgrade (bientot)
        </Button>
      </CardContent>
    </Card>
  );
}
