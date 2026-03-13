const Joi = require("joi");

const addStockSchema = Joi.object({
  productId: Joi.string().uuid().required("Product ID is required"),
  quantity: Joi.number().integer().min(1).required("Quantity must be at least 1"),
});

const removeStockSchema = Joi.object({
  productId: Joi.string().uuid().required("Product ID is required"),
  quantity: Joi.number().integer().min(1).required("Quantity must be at least 1"),
});

const updateInventorySchema = Joi.object({
  quantity: Joi.number().integer().min(0).optional(),
  minStock: Joi.number().integer().min(0).optional(),
});

module.exports = {
  addStockSchema,
  removeStockSchema,
  updateInventorySchema,
};
