const express = require("express");

const OrderController = require("../controllers/order.controller");
const authMiddleware = require("../middlewares/authMiddleware");
const customerAuth = require("../middlewares/customerAuth.middleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  authorizeRoles("ADMIN", "MANAGER", "CASHIER", "STAFF"),
  OrderController.listOrders
);

router.patch(
  "/:id/status",
  authMiddleware,
  authorizeRoles("ADMIN", "MANAGER", "CASHIER", "STAFF"),
  OrderController.updateStatus
);

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
