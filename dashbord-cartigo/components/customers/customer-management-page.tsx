"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
import { useCustomers } from "@/hooks/useCustomers";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";
import type {
  CustomerListParams,
  CustomerSortField,
  CustomerStatusFilter,
  OrganizationCustomer,
} from "@/types/customer";

const PAGE_SIZE = 10;

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Aucun achat";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function buildCustomerStatusBadge(isActive: boolean) {
  if (isActive) {
    return {
      label: "Actif",
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
    };
  }

  return {
    label: "Inactif",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  };
}

function buildSortValue(sortBy: CustomerSortField, sortOrder: "asc" | "desc") {
  return `${sortBy}-${sortOrder}`;
}

export function CustomerManagementPage() {
  const { loading: authLoading, role } = useAuth();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<CustomerStatusFilter>("all");
  const [sortValue, setSortValue] = useState("lastOrderAt-desc");
  const [selectedCustomer, setSelectedCustomer] = useState<OrganizationCustomer | null>(null);

  const debouncedSearch = useDebouncedValue(searchInput, 300).trim();
  const canReadCustomers = role === "ADMIN" || role === "MANAGER";

  const filters = useMemo<CustomerListParams>(() => {
    const [sortBy, sortOrder] = sortValue.split("-") as [CustomerSortField, "asc" | "desc"];

    return {
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status,
      sortBy,
      sortOrder,
    };
  }, [debouncedSearch, page, sortValue, status]);

  const { data, isLoading, isFetching, error, refetch } = useCustomers(filters, canReadCustomers);

  const metricCards = useMemo(
    () => [
      {
        title: "Clients",
        value: formatNumber(data.summary.totalClients),
        description: "Clients ayant deja passe au moins une commande chez vous.",
        icon: Users,
      },
      {
        title: "Clients actifs",
        value: formatNumber(data.summary.activeClients),
        description: "Clients avec une commande sur les 30 derniers jours.",
        icon: UserRound,
      },
      {
        title: "Revenu genere",
        value: formatCurrency(data.summary.totalRevenue),
        description: "Montant cumule issu des commandes de vos clients.",
        icon: Wallet,
      },
      {
        title: "Panier moyen",
        value: formatCurrency(data.summary.averageOrderValue),
        description: "Valeur moyenne par commande sur la base filtree.",
        icon: ShoppingBag,
      },
    ],
    [data.summary]
  );

  const hasPreviousPage = data.pagination.page > 1;
  const hasNextPage = data.pagination.page < data.pagination.totalPages;

  const handleStatusChange = useCallback((value: string) => {
    setStatus(value as CustomerStatusFilter);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((value: string) => {
    setSortValue(value);
    setPage(1);
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
      toast.success("La liste clients a ete actualisee.");
    } catch (refreshError) {
      toast.error(
        refreshError instanceof Error
          ? refreshError.message
          : "Impossible d'actualiser les clients."
      );
    }
  }, [refetch]);

  if (authLoading) {
    return (
      <div className="space-y-8 p-6 md:p-8">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="border-border/70">
              <CardHeader className="space-y-3 pb-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </section>
        <Card className="border-border/70">
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-72 w-full rounded-[1.5rem]" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canReadCustomers) {
    return (
      <div className="space-y-8 p-6 md:p-8">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Acces restreint</CardTitle>
            <CardDescription>
              Cette vue est reservee aux roles `ADMIN` et `MANAGER`.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Le dashboard n&apos;interroge pas l&apos;endpoint clients si votre session n&apos;est pas
            autorisee.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 p-6 md:p-8">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => (
            <Card key={card.title} className="min-w-0 border-border/70 bg-card/95 shadow-sm">
              <CardHeader className="space-y-3 pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardDescription className="line-clamp-2 text-xs leading-5">
                    {card.title}
                  </CardDescription>
                  <div className="rounded-2xl border border-border/70 bg-secondary/60 p-2">
                    <card.icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-xl leading-none xl:text-2xl">
                  {isLoading ? "..." : card.value}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-xs leading-5 text-muted-foreground">
                {card.description}
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="border-border/70">
          <CardHeader className="flex flex-col gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle>Base clients</CardTitle>
              <CardDescription>
                Analyse des clients mobiles rattaches a votre organisation via leurs commandes.
              </CardDescription>
            </div>

            <Button variant="outline" onClick={() => void handleRefresh()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              {isFetching ? "Actualisation..." : "Actualiser"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => {
                    setSearchInput(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Rechercher par nom ou email"
                  className="pl-9"
                />
              </div>

              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actifs</SelectItem>
                  <SelectItem value="inactive">Inactifs</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortValue} onValueChange={handleSortChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={buildSortValue("lastOrderAt", "desc")}>
                    Dernier achat recent
                  </SelectItem>
                  <SelectItem value={buildSortValue("lastOrderAt", "asc")}>
                    Dernier achat ancien
                  </SelectItem>
                  <SelectItem value={buildSortValue("totalSpent", "desc")}>
                    Plus gros depensiers
                  </SelectItem>
                  <SelectItem value={buildSortValue("totalSpent", "asc")}>
                    Plus faible depense
                  </SelectItem>
                  <SelectItem value={buildSortValue("totalOrders", "desc")}>
                    Plus de commandes
                  </SelectItem>
                  <SelectItem value={buildSortValue("totalOrders", "asc")}>
                    Moins de commandes
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error ? (
              <div className="rounded-[1.5rem] border border-destructive/20 bg-destructive/5 p-6 text-sm text-muted-foreground">
                {error}
              </div>
            ) : (
              <div className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-sm">
                <div className="max-h-[42rem] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                          Nom
                        </TableHead>
                        <TableHead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                          Contact
                        </TableHead>
                        <TableHead className="sticky top-0 z-10 text-right bg-card/95 backdrop-blur">
                          Commandes
                        </TableHead>
                        <TableHead className="sticky top-0 z-10 text-right bg-card/95 backdrop-blur">
                          Total depense
                        </TableHead>
                        <TableHead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                          Dernier achat
                        </TableHead>
                        <TableHead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                          Statut
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading
                        ? Array.from({ length: 6 }).map((_, index) => (
                            <TableRow key={`customer-skeleton-${index}`}>
                              <TableCell>
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-32" />
                                  <Skeleton className="h-3 w-24" />
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-44" />
                                  <Skeleton className="h-3 w-28" />
                                </div>
                              </TableCell>
                              <TableCell>
                                <Skeleton className="ml-auto h-4 w-10" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="ml-auto h-4 w-24" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-32" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-6 w-20 rounded-full" />
                              </TableCell>
                            </TableRow>
                          ))
                        : null}

                      {!isLoading && data.data.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-[20rem]">
                            <Empty className="border-0 bg-transparent">
                              <EmptyHeader>
                                <EmptyMedia variant="icon">
                                  <Users className="h-6 w-6" />
                                </EmptyMedia>
                                <EmptyTitle>Aucun client trouve</EmptyTitle>
                                <EmptyDescription>
                                  Aucune interaction client ne correspond aux filtres actuels.
                                </EmptyDescription>
                              </EmptyHeader>
                              <EmptyContent>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setSearchInput("");
                                    setStatus("all");
                                    setSortValue("lastOrderAt-desc");
                                    setPage(1);
                                  }}
                                >
                                  Reinitialiser les filtres
                                </Button>
                              </EmptyContent>
                            </Empty>
                          </TableCell>
                        </TableRow>
                      ) : null}

                      {!isLoading
                        ? data.data.map((customer) => {
                            const statusBadge = buildCustomerStatusBadge(customer.isActive);

                            return (
                              <TableRow
                                key={customer.id}
                                className="cursor-pointer"
                                onClick={() => setSelectedCustomer(customer)}
                              >
                                <TableCell>
                                  <div className="space-y-1.5">
                                    <p className="font-medium text-foreground">{customer.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      ID: {customer.id.slice(0, 8)}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1.5 text-sm text-muted-foreground">
                                    <p>{customer.email}</p>
                                    <p>{customer.phone ?? "Telephone non renseigne"}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium text-foreground">
                                  {formatNumber(customer.totalOrders)}
                                </TableCell>
                                <TableCell className="text-right font-medium text-foreground">
                                  {formatCurrency(customer.totalSpent)}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {formatDate(customer.lastOrderAt)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={statusBadge.className}>
                                    {statusBadge.label}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        : null}
                    </TableBody>
                  </Table>
                </div>

                {!isLoading && data.data.length > 0 ? (
                  <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Page {data.pagination.page} sur {Math.max(1, data.pagination.totalPages)} |{" "}
                      {data.pagination.total} client{data.pagination.total > 1 ? "s" : ""}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                        disabled={!hasPreviousPage || isFetching}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Precedent
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((currentPage) => currentPage + 1)}
                        disabled={!hasNextPage || isFetching}
                      >
                        Suivant
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(selectedCustomer)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCustomer(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail client</DialogTitle>
            <DialogDescription>
              Vue lecture seule du client et de ses indicateurs au sein de votre organisation.
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">Identite</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <UserRound className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{selectedCustomer.name}</p>
                      <p>Client mobile rattache via ses commandes.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Email</p>
                      <p>{selectedCustomer.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Telephone</p>
                      <p>{selectedCustomer.phone ?? "Non renseigne"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">Valeur client</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <Wallet className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Total depense</p>
                      <p>{formatCurrency(selectedCustomer.totalSpent)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <ShoppingBag className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Total commandes</p>
                      <p>{formatNumber(selectedCustomer.totalOrders)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Dernier achat</p>
                      <p>{formatDate(selectedCustomer.lastOrderAt)}</p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Badge
                      variant="outline"
                      className={buildCustomerStatusBadge(selectedCustomer.isActive).className}
                    >
                      {buildCustomerStatusBadge(selectedCustomer.isActive).label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
