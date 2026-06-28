import * as orderService from "@/services/orders";
import * as userService from "@/services/users";
import type {
  ActivityFilterOption,
  ActivityLog,
  ActivityLogFilters,
  ActivityLogResponse,
} from "@/types/activity";

function formatOrderReference(orderId: string) {
  return `#${orderId.slice(0, 8).toUpperCase()}`;
}

function normalizeDate(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildOption(value: string, label: string): ActivityFilterOption {
  return { value, label };
}

export async function getActivityLogs(
  params: ActivityLogFilters = {}
): Promise<ActivityLogResponse> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;

  const [ordersResponse, usersResponse] = await Promise.all([
    orderService.getOrders({
      page,
      limit,
      search: params.search?.trim() || undefined,
      dateFrom: params.dateFrom || undefined,
      dateTo: params.dateTo || undefined,
    }),
    userService.getUsers({
      page: 1,
      limit: 100,
    }),
  ]);

  const [orderDetails] = await Promise.all([
    Promise.all(ordersResponse.data.map((order) => orderService.getOrder(order.id))),
  ]);

  const userNamesById = new Map(
    usersResponse.data.map((user) => [user.id, user.name])
  );
  const actionSet = new Set<string>();

  const dateFrom = normalizeDate(params.dateFrom);
  const dateTo = normalizeDate(params.dateTo);

  const logs = orderDetails
    .flatMap<ActivityLog>((order) =>
      order.auditLogs.map((log) => {
        actionSet.add(log.action);

        return {
          id: log.id,
          action: log.action,
          entityType: "order",
          entityId: order.id,
          entityLabel: `Commande ${formatOrderReference(order.id)}`,
          orderReference: formatOrderReference(order.id),
          customerName: order.customer.name,
          actorUserId: log.changedByUserId,
          actorName: log.changedByUserId
            ? userNamesById.get(log.changedByUserId) ?? null
            : null,
          actorRole: log.changedByRole,
          previousStatus: log.previousStatus,
          newStatus: log.newStatus,
          createdAt: log.createdAt,
        };
      })
    )
    .filter((log) => {
      if (params.userId && log.actorUserId !== params.userId) {
        return false;
      }

      if (params.action && params.action !== "all" && log.action !== params.action) {
        return false;
      }

      if (params.type && params.type !== "all" && log.entityType !== params.type) {
        return false;
      }

      const createdAt = normalizeDate(log.createdAt);
      if (!createdAt) {
        return true;
      }

      if (dateFrom && createdAt < dateFrom) {
        return false;
      }

      if (dateTo && createdAt > dateTo) {
        return false;
      }

      return true;
    })
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );

  return {
    data: logs,
    pagination: ordersResponse.pagination,
    filterOptions: {
      actions: Array.from(actionSet)
        .sort((left, right) => left.localeCompare(right))
        .map((action) => buildOption(action, action.replace(/_/g, " "))),
      users: usersResponse.data
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((user) => buildOption(user.id, user.name)),
      types: [buildOption("order", "Commandes")],
    },
    source: "order-audit-logs",
  };
}
