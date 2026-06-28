import type { OrderStatus } from "@/types/order";

export type ActivityEntityType = "order";

export type ActivityLog = {
  id: string;
  action: string;
  entityType: ActivityEntityType;
  entityId: string;
  entityLabel: string;
  orderReference: string;
  customerName: string;
  actorUserId: string | null;
  actorName: string | null;
  actorRole: string | null;
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus | null;
  createdAt: string;
};

export type ActivityLogFilters = {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
  action?: string;
  type?: ActivityEntityType | "all";
  dateFrom?: string;
  dateTo?: string;
};

export type ActivityFilterOption = {
  value: string;
  label: string;
};

export type ActivityLogResponse = {
  data: ActivityLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filterOptions: {
    actions: ActivityFilterOption[];
    users: ActivityFilterOption[];
    types: ActivityFilterOption[];
  };
  source: "order-audit-logs";
};
