const express = require("express");

const OrderController = require("../controllers/order.controller");
const customerAuth = require("../middlewares/customerAuth.middleware");

const router = express.Router();

router.post(
  "/checkout",
  customerAuth,
  OrderController.checkout
);

router.get(
  "/my-orders",
  customerAuth,
  OrderController.getMyOrders
);

router.get(
  "/:id",
  customerAuth,
  OrderController.getOrder
);

module.exports = router;