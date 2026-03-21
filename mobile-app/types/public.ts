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
  coverImage?: string | null;
};

export type PublicProduct = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  quantity: number;
  categoryId?: string | null;
  categoryName?: string | null;
};

export type PublicProductDetails = PublicProduct & {
  description?: string | null;
};

export type OrganizationOpeningHour = {
  day: string;
  label: string;
  opensAt?: string | null;
  closesAt?: string | null;
  isClosed: boolean;
};

export type OrganizationProductCategory = {
  id: string;
  name: string;
  productCount: number;
};

export type PublicOrganizationDetails = {
  id: string;
  name: string;
  address?: string | null;
  description?: string | null;
  logo?: string | null;
  coverImage?: string | null;
  categoryId: string;
  category: string | null;
  isOpen: boolean | null;
  statusLabel: string;
  openingHoursLabel: string;
  openingHours: {
    timezone?: string | null;
    schedule: OrganizationOpeningHour[];
  };
  categories: OrganizationProductCategory[];
  products: PublicProduct[];
};

export type PaginatedResponse<T> = {
  success?: boolean;
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
