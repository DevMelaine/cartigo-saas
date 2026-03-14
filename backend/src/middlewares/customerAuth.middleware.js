const jwt = require("jsonwebtoken");

// similar to authMiddleware but for customers only
function customerAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Authorization token missing or malformed." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "CUSTOMER") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const customerId = decoded.customerId || decoded.userId;

    req.customer = {
      id: customerId,
      customerId,
      organizationId: decoded.organizationId || null,
      role: decoded.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
}

module.exports = customerAuthMiddleware;
