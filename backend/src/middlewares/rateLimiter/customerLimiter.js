const rateLimit = require("express-rate-limit");

const customerAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50000000,
  message: "Too many authentication attempts, please try again later"
});

module.exports = { customerAuthLimiter };