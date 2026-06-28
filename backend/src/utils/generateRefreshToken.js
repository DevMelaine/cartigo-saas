const crypto = require("crypto");

// Generates a random opaque refresh token string
function generateRefreshTokenString() {
  return crypto.randomBytes(48).toString("hex");
}

function getRefreshTokenExpiryDate() {
  const days = Number(process.env.REFRESH_TOKEN_DAYS || 7);
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  return expires;
}

module.exports = {
  generateRefreshTokenString,
  getRefreshTokenExpiryDate,
};

