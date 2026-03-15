const Joi = require("joi");
const { ORDER_LIFECYCLE_STATUSES } = require("../utils/orderLifecycle");

const checkoutSchema = Joi.object({}).unknown(false);

const listOrdersSchema = Joi.object({
  status: Joi.string().valid(...ORDER_LIFECYCLE_STATUSES),
  organizationId: Joi.string().uuid(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid(...ORDER_LIFECYCLE_STATUSES).required(),
});

module.exports = {
  checkoutSchema,
  listOrdersSchema,
  updateOrderStatusSchema,
  lifecycleStatuses: ORDER_LIFECYCLE_STATUSES,
};
