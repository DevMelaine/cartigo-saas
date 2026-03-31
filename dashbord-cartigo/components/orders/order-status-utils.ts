import type { OrderAuditLog, OrderStatus, OrderStatusAction } from "@/types/order";

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "En attente paiement",
  PAID: "Payee",
  PROCESSING: "En preparation",
  READY_FOR_DELIVERY: "Prete",
  IN_DELIVERY: "Expediee",
  DELIVERED: "Livree",
  CANCELLED: "Annulee",
};

const STATUS_TONES: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200",
  PAID: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  PROCESSING: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200",
  READY_FOR_DELIVERY: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-200",
  IN_DELIVERY: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200",
  DELIVERED: "border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-200",
  CANCELLED: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200",
};

const STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "La commande attend la confirmation du paiement.",
  PAID: "Le paiement est confirme, la commande peut entrer en preparation.",
  PROCESSING: "L'equipe traite actuellement la commande.",
  READY_FOR_DELIVERY: "La commande est prete a etre remise au livreur.",
  IN_DELIVERY: "La commande a quitte l'organisation et est en cours de livraison.",
  DELIVERED: "La commande a ete remise au client.",
  CANCELLED: "La commande a ete annulee et ne poursuit plus son cycle.",
};

const STATUS_ACTIONS: Record<OrderStatus, OrderStatusAction[]> = {
  PENDING_PAYMENT: [
    {
      label: "Confirmer le paiement",
      nextStatus: "PAID",
      description: "Le paiement est valide et la commande entre dans le flux operationnel.",
    },
    {
      label: "Annuler la commande",
      nextStatus: "CANCELLED",
      tone: "destructive",
      description: "La commande est annulee avant tout traitement.",
    },
  ],
  PAID: [
    {
      label: "Lancer la preparation",
      nextStatus: "PROCESSING",
      description: "La commande passe en preparation par l'equipe.",
    },
    {
      label: "Annuler la commande",
      nextStatus: "CANCELLED",
      tone: "destructive",
      description: "La commande est annulee apres paiement.",
    },
  ],
  PROCESSING: [
    {
      label: "Marquer comme prete",
      nextStatus: "READY_FOR_DELIVERY",
      description: "La commande est prete pour remise ou expedition.",
    },
    {
      label: "Annuler la commande",
      nextStatus: "CANCELLED",
      tone: "destructive",
      description: "La commande est annulee pendant la preparation.",
    },
  ],
  READY_FOR_DELIVERY: [
    {
      label: "Expedier la commande",
      nextStatus: "IN_DELIVERY",
      description: "La commande quitte l'organisation pour livraison.",
    },
    {
      label: "Annuler la commande",
      nextStatus: "CANCELLED",
      tone: "destructive",
      description: "La commande est annulee avant son expedition.",
    },
  ],
  IN_DELIVERY: [
    {
      label: "Marquer comme livree",
      nextStatus: "DELIVERED",
      description: "La commande est finalisee et remise au client.",
    },
  ],
  DELIVERED: [],
  CANCELLED: [],
};

export function getOrderStatusLabel(status: OrderStatus) {
  return STATUS_LABELS[status];
}

export function getOrderStatusTone(status: OrderStatus) {
  return STATUS_TONES[status];
}

export function getOrderStatusDescription(status: OrderStatus) {
  return STATUS_DESCRIPTIONS[status];
}

function canApplyOrderAction(
  nextStatus: OrderStatus,
  hasPermission: (permission: string) => boolean
) {
  if (nextStatus === "PAID") {
    return hasPermission("order.payment.confirm");
  }

  if (nextStatus === "READY_FOR_DELIVERY") {
    return hasPermission("order.status.ready") || hasPermission("order.update");
  }

  if (nextStatus === "CANCELLED") {
    return hasPermission("order.cancel");
  }

  return hasPermission("order.update");
}

export function getAllowedOrderStatusActions(
  status: OrderStatus,
  hasPermission: (permission: string) => boolean
) {
  const actions = STATUS_ACTIONS[status];

  if (!actions.length) {
    return [];
  }

  return actions.filter((action) => canApplyOrderAction(action.nextStatus, hasPermission));
}

export function formatOrderTimelineLabel(
  previousStatus: OrderStatus,
  nextStatus: OrderStatus
) {
  return `${getOrderStatusLabel(previousStatus)} -> ${getOrderStatusLabel(nextStatus)}`;
}

export function formatOrderActor(log: OrderAuditLog) {
  if (log.changedByRole) {
    return log.changedByRole;
  }

  return "Systeme";
}
