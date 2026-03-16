const rateLimit = require("express-rate-limit");

const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 1000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({
      success: false,
      message: "Too many public requests, please try again later.",
    }),
});

module.exports = { publicApiLimiter };
