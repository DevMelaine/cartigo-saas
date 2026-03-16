const Joi = require("joi");

const paginationSchema = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

const listOrganizationsSchema = Joi.object({
  ...paginationSchema,
  categoryId: Joi.string().uuid().optional(),
  category: Joi.string().trim().max(100).empty("").optional(),
}).oxor("categoryId", "category");

const organizationParamsSchema = Joi.object({
  organizationId: Joi.string().uuid().required(),
});

const listOrganizationProductsSchema = Joi.object({
  ...paginationSchema,
  search: Joi.string().trim().max(120).empty("").optional(),
});

const productParamsSchema = Joi.object({
  productId: Joi.string().uuid().required(),
});

function buildValidationError(error) {
  const err = new Error("Validation failed");
  err.statusCode = 400;
  err.details = error.details.map((detail) => detail.message);
  return err;
}

module.exports = {
  listOrganizationsSchema,
  organizationParamsSchema,
  listOrganizationProductsSchema,
  productParamsSchema,
  buildValidationError,
};
