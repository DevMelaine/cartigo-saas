const Joi = require("joi");

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const organizationsQuerySchema = paginationSchema.keys({
  categoryId: Joi.string().uuid().optional(),
});

const organizationProductsQuerySchema = paginationSchema.keys({
  search: Joi.string().trim().max(100).allow("").optional(),
});

const organizationIdParamSchema = Joi.object({
  organizationId: Joi.string().uuid().required(),
});

const productIdParamSchema = Joi.object({
  productId: Joi.string().uuid().required(),
});

module.exports = {
  organizationsQuerySchema,
  organizationProductsQuerySchema,
  organizationIdParamSchema,
  productIdParamSchema,
};
