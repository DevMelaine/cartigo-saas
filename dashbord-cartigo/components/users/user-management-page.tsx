"use client";

import { useMemo, useState } from "react";
import {
  LoaderCircle,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Can } from "@/components/auth/Can";
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
import { useUserMutations, useUsers } from "@/hooks/useUsers";
import type { OrganizationUser, UserFormValues } from "@/types/user";

const PAGE_SIZE = 10;

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
  const { organization, hasPermission } = useAuth();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<OrganizationUser | null>(null);

  const debouncedSearch = useDebouncedValue(searchInput, 300).trim();
  const canReadUsers = Boolean(organization?.id) && hasPermission("user.read");
  const canCreateUser = Boolean(organization?.id) && hasPermission("user.create");
  const canUpdateUser = Boolean(organization?.id) && hasPermission("user.update");
  const canDeleteUser = Boolean(organization?.id) && hasPermission("user.delete");

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
    },
    canReadUsers
  );
  const {
    createUser,
    updateUser,
    deleteUser,
    isCreating,
    isUpdating,
    isDeleting,
    deletingUserId,
  } = useUserMutations();

  const displayedUsers = users.length;
  const displayedRoles = useMemo(
    () => Array.from(new Set(users.map((user) => user.role))).length,
    [users]
  );

  function handleOpenChange(open: boolean) {
    setIsFormOpen(open);

    if (!open) {
      setEditingUser(null);
    }
  }

  function openCreateDialog() {
    setEditingUser(null);
    setIsFormOpen(true);
  }

  function openEditDialog(user: OrganizationUser) {
    setEditingUser(user);
    setIsFormOpen(true);
  }

  async function handleSubmit(values: UserFormValues) {
    try {
      if (editingUser) {
        await updateUser({
          userId: editingUser.id,
          payload: {
            name: values.name,
            role: values.role,
            isActive: values.isActive,
          },
        });
        toast.success("Utilisateur mis a jour avec succes.");
      } else {
        await createUser({
          email: values.email,
          password: values.password,
          name: values.name,
          role: values.role,
        });
        toast.success("Utilisateur cree avec succes.");
      }

      setIsFormOpen(false);
      setEditingUser(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleDeleteUser(user: OrganizationUser) {
    const shouldGoToPreviousPage = page > 1 && users.length === 1;

    try {
      const result = await deleteUser(user.id);
      toast.success(result.message);

      if (shouldGoToPreviousPage) {
        setPage((currentPage) => Math.max(1, currentPage - 1));
      }

      if (editingUser?.id === user.id) {
        setIsFormOpen(false);
        setEditingUser(null);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
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
                <CardDescription>Collaborateurs actifs</CardDescription>
                <div className="rounded-2xl border border-border/70 bg-secondary/60 p-2">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">
                {isLoading ? "..." : new Intl.NumberFormat("fr-FR").format(pagination.total)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              La liste est fournie directement par l&apos;endpoint backend `/users`.
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

              <Can permission="user.create">
                <Button onClick={openCreateDialog} className="shrink-0 rounded-full">
                  <UserPlus className="h-4 w-4" />
                  Nouvel utilisateur
                </Button>
              </Can>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {isLoading ? (
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
                  Aucun utilisateur actif
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Les utilisateurs inactifs ne sont pas retournes par la liste backend actuelle.
                </p>
                <Button
                  onClick={openCreateDialog}
                  disabled={!canCreateUser}
                  className="mt-5 rounded-full"
                >
                  <UserPlus className="h-4 w-4" />
                  Ajouter un utilisateur
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
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {isFetching ? "Actualisation..." : `${pagination.total} utilisateur(s) actifs`}
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
        isSubmitting={isCreating || isUpdating}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmit}
      />
    </>
  );
}
