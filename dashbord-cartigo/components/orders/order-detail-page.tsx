"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  Clock3Icon,
  LoaderCircle,
  MailIcon,
  PackageIcon,
  UserIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useOrder, useOrderMutations } from "@/hooks/useOrders";
import type { OrderStatusAction } from "@/types/order";

import {
  formatOrderActor,
  formatOrderTimelineLabel,
  getAllowedOrderStatusActions,
  getOrderStatusDescription,
  getOrderStatusLabel,
  getOrderStatusTone,
} from "./order-status-utils";

type OrderDetailPageProps = {
  orderId: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatOrderReference(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

export function OrderDetailPage({ orderId }: OrderDetailPageProps) {
  const { hasPermission } = useAuth();
  const { data: order, isLoading, error } = useOrder(orderId, true);
  const { updateOrderStatus, updatingOrderId, isUpdatingStatus } = useOrderMutations();
  const [pendingAction, setPendingAction] = useState<OrderStatusAction | null>(null);

  const canChangeStatus =
    hasPermission("order.update") ||
    hasPermission("order.cancel") ||
    hasPermission("order.payment.confirm") ||
    hasPermission("order.status.ready");
  const availableActions = useMemo(
    () => (order ? getAllowedOrderStatusActions(order.status, hasPermission) : []),
    [hasPermission, order]
  );

  const timeline = useMemo(() => {
    if (!order) {
      return [];
    }

    const history = [...order.auditLogs].sort(
      (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    );

    return [
      {
        id: `${order.id}-created`,
        title: "Commande creee",
        description: "La commande a ete enregistree dans le systeme.",
        createdAt: order.createdAt,
        tone: "default" as const,
      },
      ...history.map((log) => ({
        id: log.id,
        title: formatOrderTimelineLabel(log.previousStatus, log.newStatus),
        description: `Action appliquee par ${formatOrderActor(log)}.`,
        createdAt: log.createdAt,
        tone: log.newStatus === "CANCELLED" ? ("destructive" as const) : ("default" as const),
      })),
    ];
  }, [order]);

  async function handleConfirmStatusChange() {
    if (!order || !pendingAction) {
      return;
    }

    try {
      await updateOrderStatus({
        orderId: order.id,
        status: pendingAction.nextStatus,
      });

      toast.success(`Commande mise a jour: ${getOrderStatusLabel(pendingAction.nextStatus)}.`);
      setPendingAction(null);
    } catch (updateError) {
      toast.error(
        updateError instanceof Error
          ? updateError.message
          : "Impossible de mettre a jour cette commande."
      );
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6 md:p-8">
        <Skeleton className="h-10 w-56 rounded-full" />
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <Skeleton className="h-96 rounded-[1.75rem]" />
          <Skeleton className="h-96 rounded-[1.75rem]" />
        </div>
      </div>
    );
  }

  if (!order || error) {
    return (
      <div className="space-y-4 p-6 md:p-8">
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/dashboard/orders">
            <ArrowLeftIcon className="h-4 w-4" />
            Retour aux commandes
          </Link>
        </Button>
        <div className="rounded-[1.75rem] border border-destructive/20 bg-destructive/5 p-6">
          <p className="text-sm font-medium text-destructive">Impossible de charger la commande.</p>
          <p className="mt-2 text-sm text-destructive/80">
            {error instanceof Error ? error.message : "Commande introuvable ou acces refuse."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Button asChild variant="outline" className="w-fit rounded-full">
              <Link href="/dashboard/orders">
                <ArrowLeftIcon className="h-4 w-4" />
                Retour aux commandes
              </Link>
            </Button>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  {formatOrderReference(order.id)}
                </h1>
                <Badge variant="outline" className={getOrderStatusTone(order.status)}>
                  {getOrderStatusLabel(order.status)}
                </Badge>
              </div>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                {getOrderStatusDescription(order.status)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[26rem]">
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Total commande</CardDescription>
                <CardTitle>{formatCurrency(order.total)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Derniere mise a jour</CardDescription>
                <CardTitle className="text-base">{formatDateTime(order.updatedAt)}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Articles de la commande</CardTitle>
                <CardDescription>
                  Detail des produits, quantites et prix enregistres au moment de la commande.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/30 px-4 py-6 text-sm text-muted-foreground">
                    Aucun article detaille n&apos;est attache a cette commande.
                  </div>
                ) : (
                  order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-4 rounded-[1.5rem] border border-border/70 bg-card/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-secondary/50">
                          {item.product?.imagePreviewUrl || item.product?.imageUrl ? (
                            <Image
                              src={item.product.imagePreviewUrl ?? item.product.imageUrl ?? ""}
                              alt={item.product.name}
                              fill
                              unoptimized
                              loading="eager"
                              priority={false}
                              placeholder="empty"
                              sizes="64px"
                              className="object-cover"
                            />
                          ) : (
                            <PackageIcon className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {item.product?.name ?? "Produit supprime"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Quantite: {item.quantity} | Prix unitaire: {formatCurrency(item.price)}
                          </p>
                          {typeof item.product?.inventory?.quantity === "number" ? (
                            <p className="text-xs text-muted-foreground">
                              Stock restant: {item.product.inventory.quantity}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Sous-total</p>
                        <p className="text-lg font-semibold text-foreground">
                          {formatCurrency(item.quantity * item.price)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Historique de traitement</CardTitle>
                <CardDescription>
                  Timeline des changements de statut pour audit et pilotage operationnel.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {timeline.map((entry, index) => (
                  <div key={entry.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="rounded-full border border-border/70 bg-secondary/60 p-2">
                        <Clock3Icon className="h-4 w-4 text-primary" />
                      </div>
                      {index < timeline.length - 1 ? (
                        <div className="mt-2 h-full w-px bg-border/70" />
                      ) : null}
                    </div>
                    <div className="space-y-1 pb-5">
                      <p className="font-medium text-foreground">{entry.title}</p>
                      <p className="text-sm text-muted-foreground">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Client</CardTitle>
                <CardDescription>Informations de contact rattachees a la commande.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-secondary/40 px-4 py-3">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{order.customer.name}</p>
                    <p className="text-sm text-muted-foreground">Client rattache a la commande</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-secondary/40 px-4 py-3">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <MailIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{order.customer.email}</p>
                    <p className="text-sm text-muted-foreground">Adresse de contact</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Actions de statut</CardTitle>
                <CardDescription>
                  Les actions disponibles respectent les regles de role et le cycle de vie backend.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!canChangeStatus ? (
                  <div className="rounded-2xl border border-border/70 bg-secondary/40 px-4 py-4 text-sm text-muted-foreground">
                    Aucune action disponible pour votre session.
                  </div>
                ) : availableActions.length === 0 ? (
                  <div className="rounded-2xl border border-border/70 bg-secondary/40 px-4 py-4 text-sm text-muted-foreground">
                    Aucun changement de statut disponible pour cette commande.
                  </div>
                ) : (
                  availableActions.map((action) => (
                    <button
                      key={action.nextStatus}
                      type="button"
                      onClick={() => setPendingAction(action)}
                      disabled={isUpdatingStatus && updatingOrderId === order.id}
                      className="flex w-full items-start justify-between rounded-[1.25rem] border border-border/70 bg-card/90 px-4 py-4 text-left transition hover:border-primary/30 hover:bg-secondary/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{action.label}</p>
                        <p className="text-sm text-muted-foreground">{action.description}</p>
                      </div>
                      <div className="rounded-full bg-primary/10 p-2 text-primary">
                        <CheckCircle2Icon className="h-4 w-4" />
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le changement de statut</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction
                ? `Vous allez appliquer "${pendingAction.label}" a la commande ${formatOrderReference(order.id)}.`
                : "Confirmez cette action."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingStatus}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmStatusChange()}
              disabled={isUpdatingStatus}
              className={
                pendingAction?.tone === "destructive"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
            >
              {isUpdatingStatus ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
