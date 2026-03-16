const organizationCategoryService = require("../services/organizationCategory.service");
const {
  listOrganizationCategoriesSchema,
  buildValidationError,
} = require("../validators/organizationCategory.validator");

async function listCategories(req, res) {
  try {
    const { error } = listOrganizationCategoriesSchema.validate(req.query, {
      abortEarly: false,
      convert: true,
    });

    if (error) {
      throw buildValidationError(error);
    }

    const categories = await organizationCategoryService.listCategories();

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to list organization categories.",
      errors: error.details || undefined,
    });
  }
}

module.exports = {
  listCategories,
};
