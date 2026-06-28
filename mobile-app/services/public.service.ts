import { APP_CONFIG } from '@/constants/app';
import { apiClient } from '@/services/api';
import type {
  OrganizationCategory,
  PaginatedResponse,
  PublicOrganization,
  PublicOrganizationDetails,
  PublicProduct,
  PublicProductDetails,
} from '@/types/public';

type OrganizationFilters = {
  categoryId?: string;
  page?: number;
  limit?: number;
};

type ProductFilters = {
  page?: number;
  limit?: number;
  search?: string;
};

function buildQueryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export const publicService = {
  listCategories() {
    return apiClient.get<OrganizationCategory[]>('/public/categories');
  },

  listOrganizations(filters: OrganizationFilters = {}) {
    const query = buildQueryString({
      categoryId: filters.categoryId,
      page: filters.page ?? APP_CONFIG.defaultPage,
      limit: filters.limit ?? APP_CONFIG.defaultLimit,
    });

    return apiClient.get<PaginatedResponse<PublicOrganization>>(`/public/organizations${query}`);
  },

  getOrganization(organizationId: string) {
    return apiClient.get<PublicOrganizationDetails>(`/public/organizations/${organizationId}`);
  },

  listOrganizationProducts(organizationId: string, filters: ProductFilters = {}) {
    const query = buildQueryString({
      page: filters.page ?? APP_CONFIG.defaultPage,
      limit: filters.limit ?? APP_CONFIG.defaultLimit,
      search: filters.search,
    });

    return apiClient.get<PaginatedResponse<PublicProduct>>(
      `/public/organizations/${organizationId}/products${query}`
    );
  },

  getProduct(productId: string) {
    return apiClient.get<PublicProductDetails>(`/public/products/${productId}`);
  },
};
