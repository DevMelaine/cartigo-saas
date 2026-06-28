const { PrismaClient } = require("@prisma/client");

const {
  createCategorySchema,
  updateCategorySchema,
  listCategoriesSchema,
} = require("../validators/category.validator");

const prisma = global.prisma || new PrismaClient();

function createError(message, statusCode = 400, details) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function normalizeDescription(description) {
  if (typeof description !== "string") {
    return null;
  }

  const trimmedDescription = description.trim();
  return trimmedDescription.length > 0 ? trimmedDescription : null;
}

function mapCategory(category) {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    productCount: category._count?.products ?? 0,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

async function findCategoryByName(organizationId, name, excludedCategoryId) {
  return prisma.category.findFirst({
    where: {
      organizationId,
      name: {
        equals: name,
        mode: "insensitive",
      },
      ...(excludedCategoryId ? { id: { not: excludedCategoryId } } : {}),
    },
    select: {
      id: true,
    },
  });
}

async function createCategory(data, organizationId) {
  const { error, value } = createCategorySchema.validate(data, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    throw createError(
      "Validation failed",
      400,
      error.details.map((detail) => detail.message)
    );
  }

  const duplicate = await findCategoryByName(organizationId, value.name);
  if (duplicate) {
    throw createError("Category name already exists in this organization", 409);
  }

  const category = await prisma.category.create({
    data: {
      name: value.name.trim(),
      description: normalizeDescription(value.description),
      organizationId,
    },
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  return mapCategory(category);
}

async function listCategories(organizationId, query = {}) {
  const { error, value } = listCategoriesSchema.validate(query, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    throw createError(
      "Validation failed",
      400,
      error.details.map((detail) => detail.message)
    );
  }

  const where = {
    organizationId,
    ...(value.search
      ? {
          OR: [
            {
              name: {
                contains: value.search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: value.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };

  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      where,
      skip: value.skip,
      take: value.take,
      orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    }),
    prisma.category.count({ where }),
  ]);

  return {
    data: categories.map(mapCategory),
    total,
    skip: value.skip,
    take: value.take,
  };
}

async function getCategoryById(id, organizationId) {
  const category = await prisma.category.findFirst({
    where: {
      id,
      organizationId,
    },
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  if (!category) {
    throw createError("Category not found", 404);
  }

  return mapCategory(category);
}

async function updateCategory(id, data, organizationId) {
  const { error, value } = updateCategorySchema.validate(data, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    throw createError(
      "Validation failed",
      400,
      error.details.map((detail) => detail.message)
    );
  }

  const existingCategory = await prisma.category.findFirst({
    where: {
      id,
      organizationId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!existingCategory) {
    throw createError("Category not found", 404);
  }

  if (value.name) {
    const duplicate = await findCategoryByName(organizationId, value.name, id);
    if (duplicate) {
      throw createError("Category name already exists in this organization", 409);
    }
  }

  const updatedCategory = await prisma.category.update({
    where: { id },
    data: {
      ...(value.name !== undefined ? { name: value.name.trim() } : {}),
      ...(value.description !== undefined
        ? { description: normalizeDescription(value.description) }
        : {}),
    },
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  return mapCategory(updatedCategory);
}

async function deleteCategory(id, organizationId) {
  const category = await prisma.category.findFirst({
    where: {
      id,
      organizationId,
    },
    select: {
      id: true,
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  if (!category) {
    throw createError("Category not found", 404);
  }

  if (category._count.products > 0) {
    throw createError(
      "This category is assigned to one or more products and cannot be deleted.",
      409
    );
  }

  await prisma.category.delete({
    where: { id },
  });

  return { message: "Category deleted successfully" };
}

module.exports = {
  createCategory,
  listCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
