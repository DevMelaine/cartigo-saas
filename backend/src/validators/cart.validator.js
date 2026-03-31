const Joi = require("joi")

const addItemSchema = Joi.object({

productId:Joi.string().uuid().required(),

quantity:Joi.number()
.integer()
.min(1)
.required()

});

const updateCartItemSchema = Joi.object({
    quantity: Joi.number().integer().min(1).max(100).required()
});

module.exports = {
    addItemSchema,
    updateCartItemSchema
};