"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { OrganizationUser, UserFormValues } from "@/types/user";

const EMPTY_VALUES: UserFormValues = {
  email: "",
  password: "",
  name: "",
  role: "",
  isActive: true,
};

function buildInitialValues(user: OrganizationUser | null): UserFormValues {
  if (!user) {
    return EMPTY_VALUES;
  }

  return {
    email: user.email,
    password: "",
    name: user.name,
    role: user.role,
    isActive: user.isActive,
  };
}

type UserFormDialogProps = {
  open: boolean;
  user: OrganizationUser | null;
  canCreateUser: boolean;
  canUpdateUser: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: UserFormValues) => Promise<void>;
};

export function UserFormDialog({
  open,
  user,
  canCreateUser,
  canUpdateUser,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: UserFormDialogProps) {
  const isEditing = Boolean(user);
  const [values, setValues] = useState<UserFormValues>(() => buildInitialValues(user));
  const canSubmitUser = isEditing ? canUpdateUser : canCreateUser;

  function updateValue<Key extends keyof UserFormValues>(key: Key, value: UserFormValues[Key]) {
    setValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
  }

  async function handleSubmit() {
    if (!canSubmitUser || isSubmitting) {
      return;
    }

    await onSubmit(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier un utilisateur" : "Ajouter un utilisateur"}
          </DialogTitle>
          <DialogDescription>
            Le role est valide par le backend. Cette interface se contente d&apos;envoyer les
            valeurs attendues a l&apos;API sans recreer de logique RBAC locale.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="user-name">Nom</Label>
            <Input
              id="user-name"
              value={values.name}
              onChange={(event) => updateValue("name", event.target.value)}
              placeholder="Nom complet"
              disabled={!canSubmitUser || isSubmitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              value={values.email}
              onChange={(event) => updateValue("email", event.target.value)}
              placeholder="nom@entreprise.com"
              disabled={isEditing || !canSubmitUser || isSubmitting}
            />
            {isEditing ? (
              <p className="text-xs text-muted-foreground">
                L&apos;email ne peut pas etre modifie via cet endpoint backend.
              </p>
            ) : null}
          </div>

          {!isEditing ? (
            <div className="grid gap-2">
              <Label htmlFor="user-password">Mot de passe</Label>
              <Input
                id="user-password"
                type="password"
                autoComplete="new-password"
                value={values.password}
                onChange={(event) => updateValue("password", event.target.value)}
                placeholder="Minimum 8 caracteres"
                disabled={!canSubmitUser || isSubmitting}
              />
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="user-role">Role</Label>
            <Input
              id="user-role"
              value={values.role}
              onChange={(event) => updateValue("role", event.target.value)}
              placeholder="Role backend"
              disabled={!canUpdateUser || isSubmitting}
            />
          </div>

          {isEditing ? (
            <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/30 px-4 py-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Utilisateur actif</p>
                <p className="text-xs text-muted-foreground">
                  La liste backend ne retourne que les utilisateurs actifs. Desactiver ici fera
                  disparaitre la ligne au prochain rafraichissement.
                </p>
              </div>
              <Switch
                checked={values.isActive}
                onCheckedChange={(checked) => updateValue("isActive", checked)}
                disabled={!canUpdateUser || isSubmitting}
                aria-label="Activer ou desactiver cet utilisateur"
              />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={!canSubmitUser || isSubmitting}>
            {isSubmitting ? "Enregistrement..." : isEditing ? "Enregistrer" : "Creer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
