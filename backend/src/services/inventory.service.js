const { PrismaClient } = require("@prisma/client");
const { addStockSchema, removeStockSchema, updateInventorySchema } = require("../validators/inventory.validator");
const notificationService = require("./notification.service");
const { NOTIFICATION_TYPES } = require("../utils/notificationEvents");

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

function buildValidationError(error) {
  const err = new Error("Validation failed");
  err.statusCode = 400;
  err.details = error.details.map((d) => d.message);
  return err;
}

function shouldNotifyLowStock(product, previousInventory, updatedInventory) {
  const threshold = product.lowStockThreshold ?? updatedInventory.minStock ?? previousInventory?.minStock ?? 0;
  const previousQuantity = previousInventory?.quantity ?? 0;
  const nextQuantity = updatedInventory.quantity;

  if (!threshold) {
    return false;
  }

  return previousQuantity > threshold && nextQuantity <= threshold;
}

async function maybeNotifyLowStock(product, previousInventory, updatedInventory) {
  if (!shouldNotifyLowStock(product, previousInventory, updatedInventory)) {
    return;
  }

  await notificationService.notifyEvent(NOTIFICATION_TYPES.LOW_STOCK, {
    organizationId: product.organizationId,
    productId: product.id,
    productName: product.name,
    quantity: updatedInventory.quantity,
    lowStockThreshold: product.lowStockThreshold ?? updatedInventory.minStock,
  });
}

async function getProductOrThrow(productId, organizationId) {
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

  return product;
}

async function addStock(data, organizationId) {
  const { error, value } = addStockSchema.validate(data, { abortEarly: false });
  if (error) {
    throw buildValidationError(error);
  }

  const product = await getProductOrThrow(value.productId, organizationId);

  let inventory = await prisma.inventory.findUnique({
    where: { productId: value.productId },
  });

  if (!inventory) {
    inventory = await initializeInventory(value.productId, organizationId);
  }

  const previousInventory = inventory;
  const updated = await prisma.inventory.update({
    where: { productId: value.productId },
    data: {
      quantity: {
        increment: value.quantity,
      },
    },
  });

  await maybeNotifyLowStock(product, previousInventory, updated);

  return updated;
}

async function removeStock(data, organizationId) {
  const { error, value } = removeStockSchema.validate(data, { abortEarly: false });
  if (error) {
    throw buildValidationError(error);
  }

  const product = await getProductOrThrow(value.productId, organizationId);

  const inventory = await prisma.inventory.findUnique({
    where: { productId: value.productId },
  });

  if (!inventory) {
    const err = new Error("Inventory not found for this product");
    err.statusCode = 404;
    throw err;
  }

  if (inventory.quantity < value.quantity) {
    const err = new Error("Insufficient stock");
    err.statusCode = 400;
    throw err;
  }

  const previousInventory = inventory;
  const updated = await prisma.inventory.update({
    where: { productId: value.productId },
    data: {
      quantity: {
        decrement: value.quantity,
      },
    },
  });

  await maybeNotifyLowStock(product, previousInventory, updated);

  return updated;
}

async function getInventoryByProductId(productId, organizationId) {
  await getProductOrThrow(productId, organizationId);

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
    throw buildValidationError(error);
  }

  const product = await getProductOrThrow(productId, organizationId);

  let inventory = await prisma.inventory.findUnique({
    where: { productId },
  });

  if (!inventory) {
    inventory = await initializeInventory(productId, organizationId);
  }

  const previousInventory = inventory;
  const updated = await prisma.inventory.update({
    where: { productId },
    data: value,
  });

  await maybeNotifyLowStock(product, previousInventory, updated);

  return updated;
}

module.exports = {
  initializeInventory,
  addStock,
  removeStock,
  getInventoryByProductId,
  updateInventory,
};
