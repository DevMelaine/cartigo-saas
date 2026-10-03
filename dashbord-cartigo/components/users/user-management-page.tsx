"use client";

import { useMemo, useState } from "react";
import {
  LoaderCircle,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Can } from "@/components/auth/Can";
import { InviteUserDialog } from "@/components/users/invite-user-dialog";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useInvitationMutations, useInvitations } from "@/hooks/useInvitations";
import { useUserMutations, useUsers } from "@/hooks/useUsers";
import { appLogger } from "@/lib/logger";
import type { Invitation, InvitationRole } from "@/types/invitation";
import type { OrganizationUser, UserFormValues, UserStatusFilter } from "@/types/user";

const PAGE_SIZE = 10;
const STATUS_OPTIONS: Array<{ value: "active" | "pending" | "inactive"; label: string }> = [
  { value: "active", label: "Actifs" },
  { value: "pending", label: "En attente" },
  { value: "inactive", label: "Desactives" },
];

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Une erreur est survenue.";
}

export function UserManagementPage() {
  const { organization, hasPermission, role } = useAuth();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "pending" | "inactive">("active");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<OrganizationUser | null>(null);

  const debouncedSearch = useDebouncedValue(searchInput, 300).trim();
  const canReadUsers = Boolean(organization?.id) && hasPermission("user.read");
  const canCreateUser = Boolean(organization?.id) && hasPermission("user.create");
  const canUpdateUser = Boolean(organization?.id) && hasPermission("user.update");
  const canDeleteUser = Boolean(organization?.id) && hasPermission("user.delete");
  const canManageInvitations =
    Boolean(organization?.id) && (role === "ADMIN" || role === "MANAGER");

  const shouldLoadUsers = statusFilter !== "pending";
  const userStatus =
    statusFilter === "inactive" ? "inactive" : ("active" satisfies UserStatusFilter);
  const {
    users,
    pagination,
    isLoading,
    isFetching,
    error,
  } = useUsers(
    {
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      sort: "createdAt",
      order: "desc",
      status: userStatus,
    },
    canReadUsers && shouldLoadUsers
  );
  const {
    updateUser,
    deleteUser,
    deleteUserPermanently,
    isUpdating,
    isDeleting,
    isPermanentlyDeleting,
    deletingUserId,
    permanentlyDeletingUserId,
  } = useUserMutations();
  const {
    sendInvitation,
    resendInvitation,
    deleteInvitation,
    isSending,
    isResending,
    isDeleting: isDeletingInvitation,
    resendingInvitationId,
    deletingInvitationId,
  } = useInvitationMutations();

  const {
    invitations,
    isLoading: isInvitationsLoading,
    error: invitationsError,
  } = useInvitations(statusFilter === "pending" && canManageInvitations);

  const pendingInvitations = useMemo(
    () => invitations.filter((invitation) => invitation.status === "PENDING"),
    [invitations]
  );

  const filteredInvitations = useMemo(() => {
    if (!debouncedSearch) {
      return pendingInvitations;
    }

    const query = debouncedSearch.toLowerCase();
    return pendingInvitations.filter(
      (invitation) =>
        invitation.email.toLowerCase().includes(query) ||
        invitation.role.toLowerCase().includes(query)
    );
  }, [debouncedSearch, pendingInvitations]);

  const displayedUsers =
    statusFilter === "pending" ? filteredInvitations.length : users.length;
  const displayedRoles = useMemo(() => {
    const source =
      statusFilter === "pending" ? filteredInvitations.map((item) => item.role) : users.map((user) => user.role);
    return Array.from(new Set(source)).length;
  }, [filteredInvitations, statusFilter, users]);

  function buildActionMeta(extra: Record<string, unknown> = {}) {
    return {
      organizationId: organization?.id ?? null,
      actorRole: role ?? null,
      statusFilter,
      ...extra,
    };
  }

  function handleOpenChange(open: boolean) {
    setIsFormOpen(open);

    if (!open) {
      setEditingUser(null);
    }
  }

  function openCreateDialog() {
    setEditingUser(null);
    setIsInviteOpen(true);
  }

  function openEditDialog(user: OrganizationUser) {
    setEditingUser(user);
    setIsFormOpen(true);
  }

  async function handleSubmit(values: UserFormValues) {
    if (!editingUser) {
      return;
    }

    appLogger.info("Dashboard user update requested.", buildActionMeta({
      userId: editingUser.id,
      email: editingUser.email,
      nextRole: values.role,
      nextIsActive: values.isActive,
    }));

    try {
      await updateUser({
        userId: editingUser.id,
        payload: {
          name: values.name,
          role: values.role,
          isActive: values.isActive,
        },
      });
      appLogger.info("Dashboard user update succeeded.", buildActionMeta({
        userId: editingUser.id,
        email: editingUser.email,
      }));
      toast.success("Utilisateur mis a jour avec succes.");

      setIsFormOpen(false);
      setEditingUser(null);
    } catch (error) {
      const message = getErrorMessage(error);
      appLogger.warn("Dashboard user update failed.", buildActionMeta({
        userId: editingUser.id,
        email: editingUser.email,
        error: message,
      }));
      toast.error(message);
    }
  }

  async function handleInvite(payload: { email: string; role: InvitationRole }) {
    appLogger.info("Dashboard invitation requested.", buildActionMeta({
      email: payload.email,
      role: payload.role,
    }));

    try {
      await sendInvitation({
        email: payload.email,
        role: payload.role,
      });
      appLogger.info("Dashboard invitation succeeded.", buildActionMeta({
        email: payload.email,
        role: payload.role,
      }));
      toast.success("Invitation envoyee avec succes.");
      setIsInviteOpen(false);
    } catch (error) {
      const message = getErrorMessage(error);
      appLogger.warn("Dashboard invitation failed.", buildActionMeta({
        email: payload.email,
        role: payload.role,
        error: message,
      }));
      toast.error(message);
    }
  }

  async function handleResendInvitation(invitation: Invitation) {
    appLogger.info("Dashboard invitation resend requested.", buildActionMeta({
      invitationId: invitation.id,
      email: invitation.email,
      role: invitation.role,
    }));

    try {
      await resendInvitation(invitation.id);
      appLogger.info("Dashboard invitation resend succeeded.", buildActionMeta({
        invitationId: invitation.id,
        email: invitation.email,
      }));
      toast.success("Invitation renvoyee.");
    } catch (error) {
      const message = getErrorMessage(error);
      appLogger.warn("Dashboard invitation resend failed.", buildActionMeta({
        invitationId: invitation.id,
        email: invitation.email,
        error: message,
      }));
      toast.error(message);
    }
  }

  async function handleDeleteInvitation(invitation: Invitation) {
    appLogger.info("Dashboard invitation deletion requested.", buildActionMeta({
      invitationId: invitation.id,
      email: invitation.email,
      role: invitation.role,
    }));

    try {
      const result = await deleteInvitation(invitation.id);
      appLogger.info("Dashboard invitation deletion succeeded.", buildActionMeta({
        invitationId: invitation.id,
        email: invitation.email,
      }));
      toast.success(result.message);
    } catch (error) {
      const message = getErrorMessage(error);
      appLogger.warn("Dashboard invitation deletion failed.", buildActionMeta({
        invitationId: invitation.id,
        email: invitation.email,
        error: message,
      }));
      toast.error(message);
    }
  }

  async function handleReactivateUser(user: OrganizationUser) {
    appLogger.info("Dashboard user reactivation requested.", buildActionMeta({
      userId: user.id,
      email: user.email,
    }));

    try {
      await updateUser({
        userId: user.id,
        payload: {
          isActive: true,
        },
      });
      appLogger.info("Dashboard user reactivation succeeded.", buildActionMeta({
        userId: user.id,
        email: user.email,
      }));
      toast.success("Utilisateur reactive.");
    } catch (error) {
      const message = getErrorMessage(error);
      appLogger.warn("Dashboard user reactivation failed.", buildActionMeta({
        userId: user.id,
        email: user.email,
        error: message,
      }));
      toast.error(message);
    }
  }

  async function handlePermanentDelete(user: OrganizationUser) {
    appLogger.info("Dashboard user permanent deletion requested.", buildActionMeta({
      userId: user.id,
      email: user.email,
    }));

    try {
      const result = await deleteUserPermanently(user.id);
      appLogger.info("Dashboard user permanent deletion succeeded.", buildActionMeta({
        userId: user.id,
        email: user.email,
      }));
      toast.success(result.message);
    } catch (error) {
      const message = getErrorMessage(error);
      appLogger.warn("Dashboard user permanent deletion failed.", buildActionMeta({
        userId: user.id,
        email: user.email,
        error: message,
      }));
      toast.error(message);
    }
  }

  async function handleDeleteUser(user: OrganizationUser) {
    const shouldGoToPreviousPage = page > 1 && users.length === 1;
    appLogger.info("Dashboard user deactivation requested.", buildActionMeta({
      userId: user.id,
      email: user.email,
    }));

    try {
      const result = await deleteUser(user.id);
      appLogger.info("Dashboard user deactivation succeeded.", buildActionMeta({
        userId: user.id,
        email: user.email,
      }));
      toast.success(result.message);

      if (shouldGoToPreviousPage) {
        setPage((currentPage) => Math.max(1, currentPage - 1));
      }

      if (editingUser?.id === user.id) {
        setIsFormOpen(false);
        setEditingUser(null);
      }
    } catch (error) {
      const message = getErrorMessage(error);
      appLogger.warn("Dashboard user deactivation failed.", buildActionMeta({
        userId: user.id,
        email: user.email,
        error: message,
      }));
      toast.error(message);
    }
  }

  if (!canReadUsers) {
    return (
      <div className="p-6 md:p-8">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Acces restreint</CardTitle>
            <CardDescription>
              Cette page requiert la permission `user.read`.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            La lecture est maintenue cote frontend via le mapping centralise de permissions, sans
            toucher a l&apos;authentification ni au backend.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 p-6 md:p-8">
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/70 bg-background/80 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardDescription>
                  {statusFilter === "pending" ? "Invitations en attente" : "Collaborateurs actifs"}
                </CardDescription>
                <div className="rounded-2xl border border-border/70 bg-secondary/60 p-2">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">
                {statusFilter === "pending"
                  ? new Intl.NumberFormat("fr-FR").format(filteredInvitations.length)
                  : isLoading
                    ? "..."
                    : new Intl.NumberFormat("fr-FR").format(pagination.total)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              {statusFilter === "pending"
                ? "Les invitations en attente proviennent directement de l'endpoint `/invitations`."
                : "La liste est fournie directement par l'endpoint backend `/users`."}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-background/80 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardDescription>Roles visibles</CardDescription>
                <div className="rounded-2xl border border-border/70 bg-secondary/60 p-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">
                {isLoading ? "..." : new Intl.NumberFormat("fr-FR").format(displayedRoles)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              Les libelles de role sont affiches exactement comme renvoyes par l&apos;API.
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-background/80 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardDescription>Utilisateurs affiches</CardDescription>
                <div className="rounded-2xl border border-border/70 bg-secondary/60 p-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">
                {isLoading ? "..." : new Intl.NumberFormat("fr-FR").format(displayedUsers)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              Page {pagination.page} sur {Math.max(1, pagination.totalPages)}.
            </CardContent>
          </Card>
        </section>

        <Card className="border-border/70">
          <CardHeader className="flex flex-col gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle>Utilisateurs de l&apos;organisation</CardTitle>
              <CardDescription>
                Creation, mise a jour et desactivation selon le RBAC deja applique par le backend.
              </CardDescription>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:max-w-2xl">
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => {
                    setSearchInput(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Rechercher un utilisateur"
                  className="pl-9"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as "active" | "pending" | "inactive");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[170px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {canManageInvitations ? (
                <Button onClick={openCreateDialog} className="shrink-0 rounded-full">
                  <UserPlus className="h-4 w-4" />
                  Inviter un utilisateur
                </Button>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {statusFilter === "pending" ? (
              !canManageInvitations ? (
                <div className="rounded-[1.25rem] border border-amber-500/20 bg-amber-500/5 p-6 text-sm text-muted-foreground">
                  Les invitations sont reservees aux roles `ADMIN` et `MANAGER`.
                </div>
              ) : isInvitationsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-16 w-full rounded-[1.25rem]" />
                  ))}
                </div>
              ) : invitationsError ? (
                <div className="rounded-[1.25rem] border border-destructive/20 bg-destructive/5 p-6">
                  <p className="text-sm font-medium text-foreground">
                    Impossible de charger les invitations.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{invitationsError}</p>
                </div>
              ) : filteredInvitations.length === 0 ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-secondary/30 px-6 text-center">
                  <Mail className="h-8 w-8 text-primary" />
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    Aucune invitation en attente
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    Cette vue ne conserve que les invitations encore en attente d&apos;acceptation.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Expire le</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvitations.map((invitation) => (
                        <TableRow key={invitation.id}>
                          <TableCell className="text-muted-foreground">
                            {invitation.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{invitation.role}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(invitation.expiresAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isResending}
                                onClick={() => void handleResendInvitation(invitation)}
                              >
                                {resendingInvitationId === invitation.id ? (
                                  <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                                Renvoyer
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isDeletingInvitation}
                                onClick={() => void handleDeleteInvitation(invitation)}
                              >
                                {deletingInvitationId === invitation.id ? (
                                  <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                                Supprimer
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            ) : isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full rounded-[1.25rem]" />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-[1.25rem] border border-destructive/20 bg-destructive/5 p-6">
                <p className="text-sm font-medium text-foreground">
                  Impossible de charger les utilisateurs.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              </div>
            ) : users.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-secondary/30 px-6 text-center">
                <Users className="h-8 w-8 text-primary" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {statusFilter === "inactive" ? "Aucun utilisateur desactive" : "Aucun utilisateur actif"}
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {statusFilter === "inactive"
                    ? "Aucun profil desactive n'est disponible pour cette organisation."
                    : "Invitez un collaborateur ou ajustez vos filtres pour afficher plus de profils."}
                </p>
                <Button
                  onClick={openCreateDialog}
                  disabled={!canManageInvitations}
                  className="mt-5 rounded-full"
                >
                  <UserPlus className="h-4 w-4" />
                  Inviter un utilisateur
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Cree le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.id.slice(0, 8)}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.isActive ? "default" : "secondary"}
                            className="rounded-full"
                          >
                            {user.isActive ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {statusFilter === "inactive" ? (
                              <>
                                <Can permission="user.update">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void handleReactivateUser(user)}
                                    disabled={isUpdating}
                                  >
                                    <UserCheck className="h-4 w-4" />
                                    Reactiver
                                  </Button>
                                </Can>
                                <Can permission="user.delete">
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={isPermanentlyDeleting}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Supprimer
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Supprimer definitivement ?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Cette action est irreversible. L&apos;utilisateur sera
                                          supprime de la base.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => void handlePermanentDelete(user)}
                                          disabled={permanentlyDeletingUserId === user.id}
                                        >
                                          {permanentlyDeletingUserId === user.id ? (
                                            <LoaderCircle className="h-4 w-4 animate-spin" />
                                          ) : null}
                                          Confirmer
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </Can>
                              </>
                            ) : (
                              <>
                                <Can permission="user.update">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditDialog(user)}
                                  >
                                    Modifier
                                  </Button>
                                </Can>

                                <Can permission="user.delete">
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={isDeleting}
                                      >
                                        Desactiver
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Desactiver cet utilisateur ?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Le backend traite cette suppression comme une desactivation
                                          douce. L&apos;utilisateur sortira de la liste active.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => void handleDeleteUser(user)}
                                          disabled={deletingUserId === user.id}
                                        >
                                          {deletingUserId === user.id ? (
                                            <LoaderCircle className="h-4 w-4 animate-spin" />
                                          ) : null}
                                          Confirmer
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </Can>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {isFetching
                      ? "Actualisation..."
                      : `${pagination.total} utilisateur(s) ${
                          statusFilter === "inactive" ? "inactifs" : "actifs"
                        }`}
                  </p>

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                      disabled={page <= 1 || isFetching}
                    >
                      Precedent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((currentPage) =>
                          Math.min(
                            pagination.totalPages || currentPage + 1,
                            currentPage + 1
                          )
                        )
                      }
                      disabled={
                        isFetching ||
                        pagination.totalPages === 0 ||
                        page >= pagination.totalPages
                      }
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {!canUpdateUser && !canDeleteUser ? (
          <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-muted-foreground">
            Les actions d&apos;ecriture restent masquees tant que `user.update` et `user.delete` ne
            sont pas accordees par le mapping central de permissions.
          </div>
        ) : null}
      </div>

      <UserFormDialog
        key={`${editingUser?.id ?? "create"}-${isFormOpen ? "open" : "closed"}`}
        open={isFormOpen}
        user={editingUser}
        canCreateUser={canCreateUser}
        canUpdateUser={canUpdateUser}
        isSubmitting={isUpdating}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmit}
      />

      <InviteUserDialog
        open={isInviteOpen}
        canInvite={canManageInvitations}
        isSubmitting={isSending}
        onOpenChange={setIsInviteOpen}
        onSubmit={handleInvite}
      />
    </>
  );
}
