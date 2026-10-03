import type { OrderStatus } from "@/types/order";

export type ActivityEntityType = "user" | "auth" | "system" | "order";

export type ActivityLog = {
  id: string;
  organizationId: string | null;
  performedBy: string | null;
  action: string;
  entityType: ActivityEntityType;
  entityId: string | null;
  entityLabel: string;
  orderReference: string;
  customerName: string;
  actorUserId: string | null;
  actorName: string | null;
  actorRole: string | null;
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus | null;
  timestamp: string;
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
  source: string;
};
