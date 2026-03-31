const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000000,
  message: "Too many authentication attempts, please try again later"
});

module.exports = { authLimiter };