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

module.exports = {
  registerOrganizationSchema,
  loginSchema,
};
