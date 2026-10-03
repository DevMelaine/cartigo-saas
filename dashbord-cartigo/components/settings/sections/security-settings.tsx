"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangePassword } from "@/hooks/useSettings";

type SecuritySettingsProps = {
  canAccess: boolean;
};

const DEFAULT_STATE = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function SecuritySettingsSection({ canAccess }: SecuritySettingsProps) {
  const { mutateAsync: changePassword, isPending } = useChangePassword();
  const [formState, setFormState] = useState(DEFAULT_STATE);

  function updateField(field: keyof typeof DEFAULT_STATE, value: string) {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canAccess || isPending) {
      return;
    }

    if (formState.newPassword !== formState.confirmPassword) {
      toast.error("La confirmation du mot de passe ne correspond pas.");
      return;
    }

    try {
      await changePassword({
        currentPassword: formState.currentPassword,
        newPassword: formState.newPassword,
      });
      setFormState(DEFAULT_STATE);
      toast.success("Mot de passe modifie.");
    } catch (submitError) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : "Impossible de modifier le mot de passe."
      );
    }
  }

  if (!canAccess) {
    return (
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Acces restreint</CardTitle>
          <CardDescription>
            La modification du mot de passe est reservee au role `ADMIN`.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Cette section reste en lecture seule tant que le backend ne propose pas de
          fonctionnalite dediee.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Securite</CardTitle>
        <CardDescription>Mettez a jour votre mot de passe.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="current-password">Mot de passe actuel</Label>
            <Input
              id="current-password"
              type="password"
              value={formState.currentPassword}
              onChange={(event) => updateField("currentPassword", event.target.value)}
              disabled={isPending}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <Input
              id="new-password"
              type="password"
              value={formState.newPassword}
              onChange={(event) => updateField("newPassword", event.target.value)}
              disabled={isPending}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
            <Input
              id="confirm-password"
              type="password"
              value={formState.confirmPassword}
              onChange={(event) => updateField("confirmPassword", event.target.value)}
              disabled={isPending}
              required
            />
          </div>

          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending ? "Enregistrement..." : "Mettre a jour"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
