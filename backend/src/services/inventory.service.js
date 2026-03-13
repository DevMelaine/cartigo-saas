const { PrismaClient } = require("@prisma/client");
const { addStockSchema, removeStockSchema, updateInventorySchema } = require("../validators/inventory.validator");

const prisma = global.prisma || new PrismaClient();

async function initializeInventory(productId, organizationId) {
  const existing = await prisma.inventory.findUnique({
    where: { productId },
  });

  if (existing) {
    return existing;
  }

  const inventory = await prisma.inventory.create({
    data: {
      productId,
      organizationId,
      quantity: 0,
      minStock: 0,
    },
  });

  return inventory;
}

async function addStock(data, organizationId) {
  const { error, value } = addStockSchema.validate(data, { abortEarly: false });
  if (error) {
    const err = new Error("Validation failed");
    err.statusCode = 400;
    err.details = error.details.map((d) => d.message);
    throw err;
  }

  // Verify product belongs to organization
  const product = await prisma.product.findFirst({
    where: {
      id: value.productId,
      organizationId,
    },
  });

  if (!product) {
    const err = new Error("Product not found in your organization");
    err.statusCode = 404;
    throw err;
  }

  // Get or create inventory
  let inventory = await prisma.inventory.findUnique({
    where: { productId: value.productId },
  });

  if (!inventory) {
    inventory = await initializeInventory(value.productId, organizationId);
  }

  // Update quantity
  const updated = await prisma.inventory.update({
    where: { productId: value.productId },
    data: {
      quantity: {
        increment: value.quantity,
      },
    },
  });

  return updated;
}

async function removeStock(data, organizationId) {
  const { error, value } = removeStockSchema.validate(data, { abortEarly: false });
  if (error) {
    const err = new Error("Validation failed");
    err.statusCode = 400;
    err.details = error.details.map((d) => d.message);
    throw err;
  }

  // Verify product belongs to organization
  const product = await prisma.product.findFirst({
    where: {
      id: value.productId,
      organizationId,
    },
  });

  if (!product) {
    const err = new Error("Product not found in your organization");
    err.statusCode = 404;
    throw err;
  }

  // Get inventory
  const inventory = await prisma.inventory.findUnique({
    where: { productId: value.productId },
  });

  if (!inventory) {
    const err = new Error("Inventory not found for this product");
    err.statusCode = 404;
    throw err;
  }

  // Check if enough stock
  if (inventory.quantity < value.quantity) {
    const err = new Error("Insufficient stock");
    err.statusCode = 400;
    throw err;
  }

  // Update quantity
  const updated = await prisma.inventory.update({
    where: { productId: value.productId },
    data: {
      quantity: {
        decrement: value.quantity,
      },
    },
  });

  return updated;
}

async function getInventoryByProductId(productId, organizationId) {
  // Verify product belongs to organization
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      organizationId,
    },
  });

  if (!product) {
    const err = new Error("Product not found in your organization");
    err.statusCode = 404;
    throw err;
  }

  // Get or initialize inventory
  let inventory = await prisma.inventory.findUnique({
    where: { productId },
  });

  if (!inventory) {
    inventory = await initializeInventory(productId, organizationId);
  }

  return inventory;
}

async function updateInventory(productId, data, organizationId) {
  const { error, value } = updateInventorySchema.validate(data, { abortEarly: false });
  if (error) {
    const err = new Error("Validation failed");
    err.statusCode = 400;
    err.details = error.details.map((d) => d.message);
    throw err;
  }

  // Verify product belongs to organization
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      organizationId,
    },
  });

  if (!product) {
    const err = new Error("Product not found in your organization");
    err.statusCode = 404;
    throw err;
  }

  // Get or initialize inventory
  let inventory = await prisma.inventory.findUnique({
    where: { productId },
  });

  if (!inventory) {
    inventory = await initializeInventory(productId, organizationId);
  }

  const updated = await prisma.inventory.update({
    where: { productId },
    data: value,
  });

  return updated;
}

module.exports = {
  initializeInventory,
  addStock,
  removeStock,
  getInventoryByProductId,
  updateInventory,
};
