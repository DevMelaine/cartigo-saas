const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customer.controller");
const { customerAuthLimiter } = require("../middlewares/rateLimiter/customerLimiter");
const customerAuth = require("../middlewares/customerAuth.middleware");

// public endpoints with rate limiting
router.post("/register", customerAuthLimiter, customerController.register);
router.post("/login", customerAuthLimiter, customerController.login);
router.post("/refresh-token", customerController.refreshCustomerToken);

// protected profile
router.get("/profile", customerAuth, customerController.profile);

module.exports = router;