const Joi = require("joi");

const registerOrganizationSchema = Joi.object({
  organizationName: Joi.string().trim().min(2).max(120),
  name: Joi.string().trim().min(2).max(120),
  categoryId: Joi.string().uuid().required(),
  adminName: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().min(8).max(255).required(),
})
  .or("organizationName", "name")
  .messages({
    "object.missing": "Organization name is required.",
  });

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().required(),
});

const googleCallbackSchema = Joi.object({
  code: Joi.string().required(),
  state: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().trim().min(32).required(),
  password: Joi.string().min(8).max(255).required(),
});

module.exports = {
  registerOrganizationSchema,
  loginSchema,
  googleCallbackSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
