const tokenService = require("../services/tokenService");
const customerService = require("../services/customer.service");

async function register(req, res) {
  try {
    const customer = await customerService.registerCustomer(req.body);
    const { accessToken, refreshToken } = await tokenService.createTokenPairForCustomer(customer);
    return res.status(201).json({ success: true, data: { customer, accessToken, refreshToken } });
  } catch (err) {
    const status = err.statusCode || 500;
    console.error("Customer register error", err);
    return res.status(status).json({ success: false, message: err.message });
  }
}

async function login(req, res) {
  try {
    const customer = await customerService.loginCustomer(req.body);
    const { accessToken, refreshToken } = await tokenService.createTokenPairForCustomer(customer);
    return res.status(200).json({ success: true, data: { customer, accessToken, refreshToken } });
  } catch (err) {
    const status = err.statusCode || 401;
    console.error("Customer login error", err);
    return res.status(status).json({ success: false, message: err.message });
  }
}

async function refreshCustomerToken(req, res) {
  try {
    // support both refreshToken and refreshCustomerToken keys
    const refreshToken = req.body.refreshToken || req.body.refreshCustomerToken;
    if (!refreshToken || typeof refreshToken !== "string") {
      return res.status(400).json({ success: false, message: "Refresh token required" });
    }
    const result = await tokenService.rotateCustomerRefreshToken(refreshToken);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid refresh token" });
  }
}

async function profile(req, res) {
  // req.customer injected by customerAuthMiddleware
  try {
    const customer = await customerService.getCustomerById(req.customer.customerId);
    return res.status(200).json({ success: true, data: customer });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Unable to fetch profile" });
  }
}

module.exports = { register, login, refreshCustomerToken, profile };
