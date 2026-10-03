export type CustomerStatusFilter = "all" | "active" | "inactive";
export type CustomerSortField = "totalSpent" | "lastOrderAt" | "totalOrders";
export type CustomerSortOrder = "asc" | "desc";

export type OrganizationCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  isActive: boolean;
};

export type CustomerListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: CustomerStatusFilter;
  sortBy?: CustomerSortField;
  sortOrder?: CustomerSortOrder;
};

export type CustomerListPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type CustomerSummary = {
  totalClients: number;
  activeClients: number;
  totalRevenue: number;
  averageOrderValue: number;
};

export type CustomerListResponse = {
  data: OrganizationCustomer[];
  pagination: CustomerListPagination;
  summary: CustomerSummary;
};
