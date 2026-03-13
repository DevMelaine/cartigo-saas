const { PrismaClient } = require("@prisma/client");
const { createCategorySchema, updateCategorySchema } = require("../validators/category.validator");

const prisma = global.prisma || new PrismaClient();

async function createCategory(data, organizationId) {
  const { error, value } = createCategorySchema.validate(data, { abortEarly: false });
  if (error) {
    const err = new Error("Validation failed");
    err.statusCode = 400;
    err.details = error.details.map((d) => d.message);
    throw err;
  }

  // Check for duplicate name in organization
  const existing = await prisma.category.findUnique({
    where: {
      organizationId_name: {
        organizationId,
        name: value.name,
      },
    },
  });

  if (existing) {
    const err = new Error("Category name already exists in this organization");
    err.statusCode = 409;
    throw err;
  }

  const category = await prisma.category.create({
    data: {
      name: value.name,
      description: value.description,
      organizationId,
    },
  });

  return category;
}

async function listCategories(organizationId, { skip = 0, take = 10 } = {}) {
  const categories = await prisma.category.findMany({
    where: { organizationId },
    skip: parseInt(skip),
    take: parseInt(take),
    orderBy: { createdAt: "desc" },
  });

  const total = await prisma.category.count({ where: { organizationId } });

  return {
    data: categories,
    total,
    skip: parseInt(skip),
    take: parseInt(take),
  };
}

async function getCategoryById(id, organizationId) {
  const category = await prisma.category.findFirst({
    where: {
      id,
      organizationId,
    },
  });

  if (!category) {
    const err = new Error("Category not found");
    err.statusCode = 404;
    throw err;
  }

  return category;
}

async function updateCategory(id, data, organizationId) {
  const { error, value } = updateCategorySchema.validate(data, { abortEarly: false });
  if (error) {
    const err = new Error("Validation failed");
    err.statusCode = 400;
    err.details = error.details.map((d) => d.message);
    throw err;
  }

  // Verify category exists and belongs to organization
  const existing = await prisma.category.findFirst({
    where: {
      id,
      organizationId,
    },
  });

  if (!existing) {
    const err = new Error("Category not found");
    err.statusCode = 404;
    throw err;
  }

  // Check for duplicate name if updating name
  if (value.name && value.name !== existing.name) {
    const duplicate = await prisma.category.findUnique({
      where: {
        organizationId_name: {
          organizationId,
          name: value.name,
        },
      },
    });

    if (duplicate) {
      const err = new Error("Category name already exists in this organization");
      err.statusCode = 409;
      throw err;
    }
  }

  const updated = await prisma.category.update({
    where: { id },
    data: value,
  });

  return updated;
}

async function deleteCategory(id, organizationId) {
  const category = await prisma.category.findFirst({
    where: {
      id,
      organizationId,
    },
  });

  if (!category) {
    const err = new Error("Category not found");
    err.statusCode = 404;
    throw err;
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
