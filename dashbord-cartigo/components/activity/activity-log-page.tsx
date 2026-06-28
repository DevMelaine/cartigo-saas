"use client";

import { useMemo, useState } from "react";
import {
  Clock3,
  Filter,
  History,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

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
import { useAuth } from "@/hooks/useAuth";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { ActivityLog, ActivityLogFilters } from "@/types/activity";

import { getOrderStatusLabel } from "@/components/orders/order-status-utils";

const PAGE_SIZE = 10;

function formatExactDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatRelativeDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffInSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, seconds] of units) {
    if (Math.abs(diffInSeconds) >= seconds) {
      return formatter.format(Math.round(diffInSeconds / seconds), unit);
    }
  }

  return formatter.format(diffInSeconds, "second");
}

function getActionTone(log: ActivityLog) {
  if (log.newStatus === "CANCELLED") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-700";
  }

  if (log.newStatus === "DELIVERED" || log.newStatus === "PAID") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
  }

  return "border-primary/20 bg-primary/10 text-primary";
}

function buildActivitySummary(log: ActivityLog) {
  const actor = log.actorName ?? log.actorRole ?? "Systeme";

  if (log.previousStatus && log.newStatus) {
    return `${actor} a fait passer ${log.orderReference} de ${getOrderStatusLabel(
      log.previousStatus
    )} a ${getOrderStatusLabel(log.newStatus)}`;
  }

  return `${actor} a enregistre une activite sur ${log.orderReference}`;
}

export function ActivityLogPage() {
  const { hasPermission } = useAuth();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const debouncedSearch = useDebouncedValue(searchInput, 300).trim();
  const canReadActivity =
    hasPermission("activity.read") &&
    hasPermission("order.read") &&
    hasPermission("user.read");

  const filters = useMemo<ActivityLogFilters>(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      userId: selectedUserId === "all" ? undefined : selectedUserId,
      action: selectedAction === "all" ? undefined : selectedAction,
      type: selectedType === "all" ? "all" : "order",
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [dateFrom, dateTo, debouncedSearch, page, selectedAction, selectedType, selectedUserId]
  );

  const { data, isLoading, isFetching, error, refetch } = useActivityLogs(filters, canReadActivity);

  if (!canReadActivity) {
    return (
      <div className="space-y-8 p-6 md:p-8">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Acces restreint</CardTitle>
            <CardDescription>
              Cette page requiert `activity.read`, `order.read` et `user.read`.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            La source disponible aujourd&apos;hui est le journal d&apos;audit des commandes expose par
            le backend existant.
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
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1 uppercase tracking-[0.18em]">
                Activite
              </Badge>
              <Badge variant="outline" className="rounded-full">
                Source: {data.source}
              </Badge>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Journal d&apos;activite
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                Timeline premium construite sans nouvel endpoint: elle agrege les `auditLogs`
                commandes exposes par `/orders` et `/orders/:id/details`.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/80 px-4 py-2 text-sm text-secondary-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            RBAC frontend centralise
          </div>
        </div>
      </section>

      <Card className="border-border/70">
        <CardHeader className="flex flex-col gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              Filtres avances
            </CardTitle>
            <CardDescription>
              Les filtres `utilisateur`, `action`, `date` et `type` s&apos;appuient strictement sur
              les donnees deja exposees par l&apos;API.
            </CardDescription>
          </div>

          <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualiser
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-2 xl:grid-cols-3">
          <Input
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setPage(1);
            }}
            placeholder="Rechercher par commande ou client"
          />

          <Select
            value={selectedUserId}
            onValueChange={(value) => {
              setSelectedUserId(value);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Utilisateur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les utilisateurs</SelectItem>
              {data.filterOptions.users.map((user) => (
                <SelectItem key={user.value} value={user.value}>
                  {user.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedAction}
            onValueChange={(value) => {
              setSelectedAction(value);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les actions</SelectItem>
              {data.filterOptions.actions.map((action) => (
                <SelectItem key={action.value} value={action.value}>
                  {action.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedType}
            onValueChange={(value) => {
              setSelectedType(value);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {data.filterOptions.types.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
          />

          <Input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Timeline d&apos;activite
          </CardTitle>
          <CardDescription>
            Vue consolidee des transitions de statut commandes visibles sur la page courante.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-28 w-full rounded-[1.5rem]" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-[1.5rem] border border-destructive/20 bg-destructive/5 p-6 text-sm text-muted-foreground">
              {error}
            </div>
          ) : data.data.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-secondary/30 p-8 text-center text-sm text-muted-foreground">
              Aucun log d&apos;activite ne correspond aux filtres actuels.
            </div>
          ) : (
            data.data.map((log, index) => (
              <div key={log.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="rounded-full border border-border/70 bg-secondary/60 p-2">
                    <Clock3 className="h-4 w-4 text-primary" />
                  </div>
                  {index < data.data.length - 1 ? (
                    <div className="mt-2 h-full w-px bg-border/70" />
                  ) : null}
                </div>
                <div className="flex-1 rounded-[1.5rem] border border-border/70 bg-card/95 p-5 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={getActionTone(log)}>
                          {log.action}
                        </Badge>
                        <Badge variant="secondary">{log.entityType}</Badge>
                        <Badge variant="outline">{log.orderReference}</Badge>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {buildActivitySummary(log)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Client: {log.customerName} | Entite: {log.entityLabel}
                      </p>
                    </div>

                    <div className="text-right text-sm text-muted-foreground">
                      <p>{formatRelativeDate(log.createdAt)}</p>
                      <p className="mt-1 text-xs">{formatExactDate(log.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {data.pagination.page} sur {Math.max(1, data.pagination.totalPages)} des
              commandes auditees.
            </p>
            <div className="flex items-center gap-2">
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
                onClick={() => setPage((currentPage) => currentPage + 1)}
                disabled={
                  isFetching ||
                  data.pagination.totalPages === 0 ||
                  page >= data.pagination.totalPages
                }
              >
                Suivant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
