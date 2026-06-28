const jwt = require("jsonwebtoken");

function notificationAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authorization token missing or malformed.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === "CUSTOMER") {
      const customerId = decoded.customerId || decoded.userId;

      req.customer = {
        id: customerId,
        customerId,
        organizationId: decoded.organizationId || null,
        role: decoded.role,
      };

      req.notificationActor = {
        actorType: "customer",
        actorId: customerId,
        organizationId: decoded.organizationId || null,
        role: decoded.role,
      };

      return next();
    }

    req.user = {
      userId: decoded.userId,
      organizationId: decoded.organizationId,
      role: decoded.role,
    };

    req.notificationActor = {
      actorType: "user",
      actorId: decoded.userId,
      organizationId: decoded.organizationId || null,
      role: decoded.role,
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
}

module.exports = notificationAuthMiddleware;
