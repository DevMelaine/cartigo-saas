/**
 * Role-based authorization middleware generator.
 * Usage: router.post("/", authorizeRoles("ADMIN"), handler);
 *          router.get("/", authorizeRoles("ADMIN","MANAGER"), handler);
 */

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user && req.user.role;
    if (!userRole) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    next();
  };
}

module.exports = { authorizeRoles };
