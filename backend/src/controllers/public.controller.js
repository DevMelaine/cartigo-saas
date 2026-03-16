const publicService = require("../services/public.service");
const {
  listOrganizationsSchema,
  organizationParamsSchema,
  listOrganizationProductsSchema,
  productParamsSchema,
  buildValidationError,
} = require("../validators/public.validator");

async function listCategories(req, res) {
  try {
    const categories = await publicService.listCategories();

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to list categories.",
    });
  }
}

async function listOrganizations(req, res) {
  try {
    const { error, value } = listOrganizationsSchema.validate(req.query, {
      abortEarly: false,
      convert: true,
    });

    if (error) {
      throw buildValidationError(error);
    }

    const result = await publicService.listOrganizations(value);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to list organizations.",
      errors: error.details || undefined,
    });
  }
}

async function listOrganizationProducts(req, res) {
  try {
    const paramsValidation = organizationParamsSchema.validate(req.params, {
      abortEarly: false,
      convert: true,
    });

    if (paramsValidation.error) {
      throw buildValidationError(paramsValidation.error);
    }

    const queryValidation = listOrganizationProductsSchema.validate(req.query, {
      abortEarly: false,
      convert: true,
    });

    if (queryValidation.error) {
      throw buildValidationError(queryValidation.error);
    }

    const result = await publicService.listOrganizationProducts({
      organizationId: paramsValidation.value.organizationId,
      ...queryValidation.value,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to list organization products.",
      errors: error.details || undefined,
    });
  }
}

async function getProductDetails(req, res) {
  try {
    const { error, value } = productParamsSchema.validate(req.params, {
      abortEarly: false,
      convert: true,
    });

    if (error) {
      throw buildValidationError(error);
    }

    const product = await publicService.getProductDetails(value.productId);

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to fetch product details.",
      errors: error.details || undefined,
    });
  }
}

module.exports = {
  listCategories,
  listOrganizations,
  listOrganizationProducts,
  getProductDetails,
};
