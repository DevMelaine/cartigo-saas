"use client";

import { useMemo, useState } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INVITABLE_ROLES, type InvitationRole } from "@/types/invitation";

type InviteUserDialogProps = {
  open: boolean;
  isSubmitting: boolean;
  canInvite: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { email: string; role: InvitationRole }) => Promise<void>;
};

export function InviteUserDialog({
  open,
  isSubmitting,
  canInvite,
  onOpenChange,
  onSubmit,
}: InviteUserDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitationRole>(INVITABLE_ROLES[0]);

  const canSubmit = canInvite && !isSubmitting;
  const roleOptions = useMemo(() => INVITABLE_ROLES, []);

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    await onSubmit({ email, role });
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      setEmail("");
      setRole(INVITABLE_ROLES[0]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Inviter un utilisateur</DialogTitle>
          <DialogDescription>
            Un email d&apos;invitation sera envoye avec un lien d&apos;activation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nom@entreprise.com"
              disabled={!canSubmit}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as InvitationRole)}
              disabled={!canSubmit}
            >
              <SelectTrigger id="invite-role">
                <SelectValue placeholder="Choisir un role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((roleOption) => (
                  <SelectItem key={roleOption} value={roleOption}>
                    {roleOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={!canSubmit}>
            {isSubmitting ? "Envoi..." : "Envoyer l'invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
