const Joi = require("joi");

const registerSchema = Joi.object({
  name: Joi.string().required("Your name is required"),
  email: Joi.string().email().required("Your email is required"),
  password: Joi.string().min(8).required("your passeword is required"),
  phone: Joi.string().optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required("email is required"),
  password: Joi.string().required("enter your password"),
});

module.exports = {
  registerSchema,
  loginSchema,
};