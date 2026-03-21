const { PrismaClient } = require("@prisma/client");

const prisma = global.prisma || new PrismaClient();

function createPagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

async function ensureCategoryExists(categoryId) {
  if (!categoryId) {
    return null;
  }

  const category = await prisma.organizationCategory.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
  });

  if (!category) {
    const error = new Error("Organization category not found");
    error.statusCode = 404;
    throw error;
  }

  return category;
}

async function listCategories() {
  return prisma.organizationCategory.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
  });
}

async function listOrganizations({ page, limit, categoryId }) {
  const skip = (page - 1) * limit;

  await ensureCategoryExists(categoryId);

  const where = categoryId
    ? {
        categoryId,
      }
    : {};

  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        {
          category: {
            name: "asc",
          },
        },
        {
          name: "asc",
        },
      ],
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.organization.count({ where }),
  ]);

  return {
    data: organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      address: organization.address,
      categoryId: organization.categoryId,
      category: organization.category.name,
      logo: null,
      description: organization.address,
    })),
    ...createPagination(page, limit, total),
  };
}

async function listOrganizationProducts({ organizationId, page, limit, search }) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!organization) {
    const error = new Error("Organization not found");
    error.statusCode = 404;
    throw error;
  }

  const skip = (page - 1) * limit;
  const where = {
    organizationId,
    isActive: true,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { sku: { contains: search.toUpperCase(), mode: "insensitive" } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        price: true,
        imageUrl: true,
        inventory: {
          select: {
            quantity: true,
          },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data: products.map((product) => ({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image: product.imageUrl || null,
      quantity: product.inventory?.quantity ?? 0,
    })),
    ...createPagination(page, limit, total),
  };
}

async function getProduct(productId) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      isActive: true,
    },
    select: {
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
      organization: {
        select: {
          id: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    image: product.imageUrl || null,
    quantity: product.inventory?.quantity ?? 0,
    organizationId: product.organization.id,
    categoryId: product.organization.category.id,
    category: product.organization.category.name,
  };
}

module.exports = {
  listCategories,
  listOrganizations,
  listOrganizationProducts,
  getProduct,
};
