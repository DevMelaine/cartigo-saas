export type OrganizationCategory = {
  id: string;
  name: string;
  createdAt?: string;
  description?: string | null;
};

export type PublicOrganization = {
  id: string;
  name: string;
  address?: string | null;
  category: string | null;
  categoryId: string;
  description?: string | null;
  logo?: string | null;
};

export type PublicProduct = {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  quantity: number;
};

export type PublicProductDetails = PublicProduct & {
  description?: string | null;
};

export type PaginatedResponse<T> = {
  success?: boolean;
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
