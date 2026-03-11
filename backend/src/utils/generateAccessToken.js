const jwt = require("jsonwebtoken");

function generateAccessToken(payload) {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET (or JWT_SECRET) is not defined");
  }

  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "15m";

  return jwt.sign(payload, secret, { expiresIn });
}

module.exports = generateAccessToken;

