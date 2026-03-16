const Joi = require("joi");

const listOrganizationCategoriesSchema = Joi.object({}).unknown(false);

function buildValidationError(error) {
  const err = new Error("Validation failed");
  err.statusCode = 400;
  err.details = error.details.map((detail) => detail.message);
  return err;
}

module.exports = {
  listOrganizationCategoriesSchema,
  buildValidationError,
};
