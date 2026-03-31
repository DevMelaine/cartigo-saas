const express = require("express");
const CartController = require("../controllers/cart.controller");
const validate = require("../middlewares/validate");
const customerAuth = require("../middlewares/customerAuth.middleware");

const {
  addItemSchema,
  updateCartItemSchema
} = require("../validators/cart.validator");

const router = express.Router();

router.post(
  "/items",
  customerAuth,
  validate(addItemSchema),
  CartController.addItem
);

router.get(
  "/",
  customerAuth,
  CartController.getCart
);

router.patch(
  "/items/:id",
  customerAuth,
  validate(updateCartItemSchema),
  CartController.updateItem
);

router.delete(
  "/items/:id",
  customerAuth,
  CartController.removeItem
);

router.delete(
  "/",
  customerAuth,
  CartController.clearCart
);

module.exports = router;
