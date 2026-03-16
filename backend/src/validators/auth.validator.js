const Joi = require("joi");

const registerOrganizationSchema = Joi.object({
  organizationName: Joi.string().trim().min(2).max(120).optional(),
  name: Joi.string().trim().min(2).max(120).optional(),
  categoryId: Joi.string().uuid().required(),
  adminName: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).max(255).required(),
}).or("organizationName", "name");

const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(1).required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().trim().required(),
});

function buildValidationError(error) {
  const err = new Error("Validation failed");
  err.statusCode = 400;
  err.details = error.details.map((detail) => detail.message);
  return err;
}

module.exports = {
  registerOrganizationSchema,
  loginSchema,
  refreshTokenSchema,
  buildValidationError,
};
