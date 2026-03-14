const Joi = require("joi");

const checkoutSchema = Joi.object({
  // extensible si paiement plus tard
});

module.exports = {
  checkoutSchema
};