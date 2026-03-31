const Joi = require("joi");

const normalizedNameField = Joi.string().trim().min(1).max(100);
const normalizedDescriptionField = Joi.string().trim().max(500).allow("", null);

const createCategorySchema = Joi.object({
  name: normalizedNameField.required().messages({
    "any.required": "Category name is required.",
    "string.empty": "Category name is required.",
  }),
  description: normalizedDescriptionField.optional(),
});

const updateCategorySchema = Joi.object({
  name: normalizedNameField.optional(),
  description: normalizedDescriptionField.optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided to update a category.",
  });

const listCategoriesSchema = Joi.object({
  skip: Joi.number().integer().min(0).default(0),
  take: Joi.number().integer().min(1).max(100).default(25),
  search: Joi.string().trim().max(100).allow("", null).optional(),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  listCategoriesSchema,
};
