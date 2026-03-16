const { PrismaClient } = require("@prisma/client");
const organizationCategoryService = require("./organizationCategory.service");

const prisma = global.prisma || new PrismaClient();

const discoverableOrganizationWhere = {
  isActive: true,
};

const publicOrganizationSelect = {
  id: true,
  name: true,
  logo: true,
  organizationCategory: {
    select: {
      name: true,
    },
  },
};

const publicProductSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  imageUrl: true,
  inventory: {
    select: {
      quantity: true,
    },
  },
};

function buildPagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

function normalizeSearchValue(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapOrganization(organization) {
  return {
    id: organization.id,
    name: organization.name,
    category: organization.organizationCategory?.name || null,
    logo: organization.logo,
  };
}

function mapProduct(product, { includeDescription = false } = {}) {
  const mappedProduct = {
    id: product.id,
    name: product.name,
    price: Number(product.price),
    image: product.imageUrl,
    quantity: product.inventory?.quantity ?? 0,
  };

  if (includeDescription) {
    mappedProduct.description = product.description;
  }

  return mappedProduct;
}

class PublicService {
  constructor({ prismaClient = prisma } = {}) {
    this.prisma = prismaClient;
  }

  /**
   * Returns the predefined organization categories for customer discovery.
   */
  async listCategories() {
    const categories = await organizationCategoryService.listCategories();

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
    }));
  }

  /**
   * Lists active organizations with optional category filtering for customer browsing.
   */
  async listOrganizations({ categoryId, category, page = 1, limit = 20 }) {
    const skip = (page - 1) * limit;
    const normalizedCategory = normalizeSearchValue(category);

    const where = {
      ...discoverableOrganizationWhere,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    } else if (normalizedCategory) {
      where.organizationCategory = {
        is: {
          name: {
            equals: normalizedCategory,
            mode: "insensitive",
          },
        },
      };
    }

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        select: publicOrganizationSelect,
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      data: organizations.map(mapOrganization),
      pagination: buildPagination(page, limit, total),
    };
  }

  /**
   * Ensures the requested organization exists and is active before exposing products.
   */
  async assertDiscoverableOrganization(organizationId) {
    const organization = await this.prisma.organization.findFirst({
      where: {
        id: organizationId,
        ...discoverableOrganizationWhere,
      },
      select: publicOrganizationSelect,
    });

    if (!organization) {
      const error = new Error("Organization not found");
      error.statusCode = 404;
      throw error;
    }

    return organization;
  }

  /**
   * Lists active products for one active organization without leaking internal product fields.
   */
  async listOrganizationProducts({ organizationId, page = 1, limit = 20, search }) {
    await this.assertDiscoverableOrganization(organizationId);

    const normalizedSearch = normalizeSearchValue(search);
    const skip = (page - 1) * limit;
    const where = {
      organizationId,
      isActive: true,
    };

    if (normalizedSearch) {
      where.OR = [
        {
          name: {
            contains: normalizedSearch,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: normalizedSearch,
            mode: "insensitive",
          },
        },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        select: publicProductSelect,
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products.map((product) => mapProduct(product)),
      pagination: buildPagination(page, limit, total),
    };
  }

  /**
   * Returns a single active product only when its organization is active and discoverable.
   */
  async getProductDetails(productId) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        isActive: true,
        organization: {
          is: discoverableOrganizationWhere,
        },
      },
      select: publicProductSelect,
    });

    if (!product) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    return mapProduct(product, { includeDescription: true });
  }
}

module.exports = new PublicService();
module.exports.PublicService = PublicService;
