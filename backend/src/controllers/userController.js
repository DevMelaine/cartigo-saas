
/**
 * User controller - HTTP layer for staff management
 */

const userService = require("../services/userService");
const { validatePaginationParams } = require("../validators/userValidator");

async function createUser(req, res) {
  try {
    // only ADMIN is allowed - middleware normally handles but extra guard
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const user = await userService.createUser(req.body, req.user.organizationId);
    return res.status(201).json({ success: true, data: user });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message, errors: err.details });
  }
}

async function listUsers(req, res) {
  try {
    const { isValid, errors, page, limit } = validatePaginationParams(req.query);
    if (!isValid) {
      return res.status(400).json({ success: false, message: "Invalid pagination", errors });
    }

    const filters = { page, limit, search: req.query.search, sort: req.query.sort, order: req.query.order };
    const result = await userService.listUsers(req.user.organizationId, filters);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

async function getUser(req, res) {
  try {
    const user = await userService.getUserById(req.params.id, req.user.organizationId);
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

async function updateUser(req, res) {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const user = await userService.updateUser(req.params.id, req.body, req.user.organizationId);
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message, errors: err.details });
  }
}

async function deleteUser(req, res) {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    await userService.deleteUser(req.params.id, req.user.organizationId);
    return res.status(200).json({ success: true, message: "User deactivated." });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

module.exports = { createUser, listUsers, getUser, updateUser, deleteUser };
