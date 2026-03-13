const Joi = require("joi");

const createCategorySchema = Joi.object({
  name: Joi.string().min(1).max(100).required("Category name is required"),
  description: Joi.string().max(500).optional(),
});

const updateCategorySchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
};
