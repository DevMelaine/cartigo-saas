export type ProductCategory = {
  id: string;
  name: string;
  description: string | null;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductCategoryListResponse = {
  data: ProductCategory[];
  total: number;
  skip: number;
  take: number;
};

export type CreateProductCategoryInput = {
  name: string;
  description?: string;
};

export type UpdateProductCategoryInput = Partial<CreateProductCategoryInput>;
