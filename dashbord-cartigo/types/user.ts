export type OrganizationUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserSortField = "name" | "email" | "createdAt" | "updatedAt";
export type UserSortOrder = "asc" | "desc";

export type UserListParams = {
  page?: number;
  limit?: number;
  search?: string;
  sort?: UserSortField;
  order?: UserSortOrder;
};

export type UserListResponse = {
  data: OrganizationUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CreateUserInput = {
  email: string;
  password: string;
  name: string;
  role: string;
};

export type UpdateUserInput = {
  name?: string;
  role?: string;
  isActive?: boolean;
};

export type UserFormValues = {
  email: string;
  password: string;
  name: string;
  role: string;
  isActive: boolean;
};
