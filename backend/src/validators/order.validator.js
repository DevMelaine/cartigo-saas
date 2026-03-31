const Joi = require("joi");
const { ORDER_LIFECYCLE_STATUSES } = require("../utils/orderLifecycle");

const checkoutSchema = Joi.object({}).unknown(false);

const listOrdersSchema = Joi.object({
  status: Joi.string().valid(...ORDER_LIFECYCLE_STATUSES),
  organizationId: Joi.string().uuid(),
  search: Joi.string().trim().max(120),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso(),
  minTotal: Joi.number().min(0),
  maxTotal: Joi.number().min(0),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).custom((value, helpers) => {
  if (value.dateFrom && value.dateTo && new Date(value.dateFrom) > new Date(value.dateTo)) {
    return helpers.error("any.invalid", {
      message: "dateFrom must be before or equal to dateTo.",
    });
  }

  if (
    value.minTotal !== undefined &&
    value.maxTotal !== undefined &&
    Number(value.minTotal) > Number(value.maxTotal)
  ) {
    return helpers.error("any.invalid", {
      message: "minTotal must be less than or equal to maxTotal.",
    });
  }

  return value;
}, "order list filters validation");

const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid(...ORDER_LIFECYCLE_STATUSES).required(),
});

module.exports = {
  checkoutSchema,
  listOrdersSchema,
  updateOrderStatusSchema,
  lifecycleStatuses: ORDER_LIFECYCLE_STATUSES,
};
