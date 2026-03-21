const publicService = require("../services/public.service");
const {
  organizationsQuerySchema,
  organizationProductsQuerySchema,
  organizationIdParamSchema,
  productIdParamSchema,
} = require("../validators/public.validator");

function validateOrThrow(schema, payload) {
  const { error, value } = schema.validate(payload, {
    abortEarly: false,
    convert: true,
    stripUnknown: true,
  });

  if (error) {
    const validationError = new Error("Validation failed");
    validationError.statusCode = 400;
    validationError.details = error.details.map((detail) => detail.message);
    throw validationError;
  }

  return value;
}

async function listCategories(req, res) {
  try {
    const categories = await publicService.listCategories();
    return res.status(200).json(categories);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Unable to load categories",
      errors: error.details,
    });
  }
}

async function listOrganizations(req, res) {
  try {
    const filters = validateOrThrow(organizationsQuerySchema, req.query);
    const organizations = await publicService.listOrganizations(filters);
    return res.status(200).json(organizations);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Unable to load organizations",
      errors: error.details,
    });
  }
}

async function getOrganization(req, res) {
  try {
    const params = validateOrThrow(organizationIdParamSchema, req.params);
    const organization = await publicService.getOrganization(params.organizationId);
    return res.status(200).json(organization);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Unable to load organization",
      errors: error.details,
    });
  }
}

async function listOrganizationProducts(req, res) {
  try {
    const params = validateOrThrow(organizationIdParamSchema, req.params);
    const filters = validateOrThrow(organizationProductsQuerySchema, req.query);
    const products = await publicService.listOrganizationProducts({
      organizationId: params.organizationId,
      ...filters,
    });
    return res.status(200).json(products);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Unable to load products",
      errors: error.details,
    });
  }
}

async function getProduct(req, res) {
  try {
    const params = validateOrThrow(productIdParamSchema, req.params);
    const product = await publicService.getProduct(params.productId);
    return res.status(200).json(product);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Unable to load product",
      errors: error.details,
    });
  }
}

module.exports = {
  listCategories,
  listOrganizations,
  getOrganization,
  listOrganizationProducts,
  getProduct,
};
