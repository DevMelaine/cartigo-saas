"use client";

import { useMemo, useState } from "react";
import {
  Copy,
  LoaderCircle,
  MailPlus,
  ShieldAlert,
  TimerReset,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useInvitationMutations, useInvitations } from "@/hooks/useInvitations";
import { cn } from "@/lib/utils";
import { INVITABLE_ROLES, type Invitation, type InvitationRole } from "@/types/invitation";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusLabel(status: Invitation["status"]) {
  switch (status) {
    case "PENDING":
      return "En attente";
    case "ACCEPTED":
      return "Acceptee";
    case "EXPIRED":
      return "Expiree";
    default:
      return status;
  }
}

function getStatusClassName(status: Invitation["status"]) {
  switch (status) {
    case "PENDING":
      return "border-amber-500/20 bg-amber-500/10 text-amber-700";
    case "ACCEPTED":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
    case "EXPIRED":
      return "border-slate-500/20 bg-slate-500/10 text-slate-700";
    default:
      return "";
  }
}

export function TeamSettingsPage() {
  const { organization, role } = useAuth();
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<InvitationRole>(INVITABLE_ROLES[0]);

  const canManageInvitations =
    Boolean(organization?.id) && (role === "ADMIN" || role === "MANAGER");
  const { invitations, isLoading, isFetching, error, refetch } = useInvitations(
    canManageInvitations
  );
  const { sendInvitation, isSending } = useInvitationMutations();

  const pendingInvitations = useMemo(
    () => invitations.filter((invitation) => invitation.status === "PENDING").length,
    [invitations]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageInvitations || isSending) {
      return;
    }

    try {
      const invitation = await sendInvitation({
        email,
        role: selectedRole,
      });

      setEmail("");
      toast.success(`Invitation envoyee a ${invitation.email}.`);
    } catch (submitError) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : "Impossible d'envoyer l'invitation."
      );
    }
  }

  async function handleCopyInvitation(invitation: Invitation) {
    if (!invitation.inviteUrl) {
      toast.error("Aucun lien disponible pour cette invitation.");
      return;
    }

    try {
      await navigator.clipboard.writeText(invitation.inviteUrl);
      toast.success("Lien d'invitation copie.");
    } catch (copyError) {
      toast.error(
        copyError instanceof Error ? copyError.message : "Impossible de copier le lien."
      );
    }
  }

  if (!canManageInvitations) {
    return (
      <div className="space-y-6 p-6 md:p-8">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Acces restreint</CardTitle>
            <CardDescription>
              Seuls les roles backend `ADMIN` et `MANAGER` peuvent gerer les invitations.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Cette page reste volontairement pilotee par le role serveur, sans nouvelle logique
            de permissions frontend.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 md:p-8">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/95 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge variant="secondary" className="rounded-full px-3 py-1 uppercase tracking-[0.18em]">
              Team settings
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Invitations de l&apos;organisation
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                Invitez de nouveaux collaborateurs sans modifier le flux auth actuel: le backend
                derive l&apos;organisation depuis le JWT et l&apos;invite accepte ensuite son acces
                via un lien securise.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/80 px-4 py-2 text-sm text-secondary-foreground">
            <Users className="h-4 w-4 text-primary" />
            {organization?.name ?? "Organisation"}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70 bg-background/80 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardDescription>Invitations totales</CardDescription>
              <div className="rounded-2xl border border-border/70 bg-secondary/60 p-2">
                <MailPlus className="h-4 w-4 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">
              {isLoading ? "..." : new Intl.NumberFormat("fr-FR").format(invitations.length)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            Historique des invitations emises pour l&apos;organisation courante.
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/80 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardDescription>Invitations en attente</CardDescription>
              <div className="rounded-2xl border border-border/70 bg-secondary/60 p-2">
                <TimerReset className="h-4 w-4 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">
              {isLoading ? "..." : new Intl.NumberFormat("fr-FR").format(pendingInvitations)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            Liens encore utilisables par les futurs collaborateurs.
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/80 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardDescription>Roles invitables</CardDescription>
              <div className="rounded-2xl border border-border/70 bg-secondary/60 p-2">
                <ShieldAlert className="h-4 w-4 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">
              {new Intl.NumberFormat("fr-FR").format(INVITABLE_ROLES.length)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            La liste reprend exactement les roles de staff deja acceptes par le backend.
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Inviter un utilisateur</CardTitle>
            <CardDescription>
              Le backend extrait automatiquement `organizationId` depuis le token JWT.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="nom@entreprise.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSending}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value) => setSelectedRole(value as InvitationRole)}
                  disabled={isSending}
                >
                  <SelectTrigger id="invite-role">
                    <SelectValue placeholder="Choisir un role" />
                  </SelectTrigger>
                  <SelectContent>
                    {INVITABLE_ROLES.map((roleOption) => (
                      <SelectItem key={roleOption} value={roleOption}>
                        {roleOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={isSending} className="w-full">
                {isSending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <MailPlus className="h-4 w-4" />
                )}
                Envoyer invitation
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Invitations en attente</CardTitle>
              <CardDescription>
                Liste des invitations de l&apos;organisation avec expiration et lien de partage.
              </CardDescription>
            </div>

            <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
              {isFetching ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <TimerReset className="h-4 w-4" />
              )}
              Actualiser
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-28 w-full rounded-[1.25rem]" />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-[1.25rem] border border-destructive/20 bg-destructive/5 p-6">
                <p className="text-sm font-medium text-foreground">
                  Impossible de charger les invitations.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              </div>
            ) : invitations.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-secondary/30 p-8 text-center text-sm text-muted-foreground">
                Aucune invitation n&apos;a encore ete envoyee pour cette organisation.
              </div>
            ) : (
              invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="rounded-[1.5rem] border border-border/70 bg-card/95 p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{invitation.role}</Badge>
                        <Badge
                          variant="outline"
                          className={cn("rounded-full", getStatusClassName(invitation.status))}
                        >
                          {getStatusLabel(invitation.status)}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{invitation.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Expire le {formatDate(invitation.expiresAt)}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleCopyInvitation(invitation)}
                      disabled={!invitation.inviteUrl}
                    >
                      <Copy className="h-4 w-4" />
                      Copier le lien
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
