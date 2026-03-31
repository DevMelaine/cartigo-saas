/*
 * Validation logic for user management endpoints.
 * We implement simple manual checks here but you could easily
 * migrate to Joi/Zod if desired.
 */

const validRoles = ["MANAGER", "CASHIER", "STAFF"];

function validateCreateUser(body) {
  const errors = [];

  if (!body.email || typeof body.email !== "string") {
    errors.push("Email is required.");
  } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) {
    errors.push("Email must be valid.");
  }

  if (!body.password || typeof body.password !== "string") {
    errors.push("Password is required.");
  } else if (body.password.length < 8) {
    errors.push("Password must be at least 8 characters.");
  }

  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    errors.push("Name is required.");
  }

  if (!body.role || typeof body.role !== "string") {
    errors.push("Role is required.");
  } else if (!validRoles.includes(body.role)) {
    errors.push(`Role must be one of: ${validRoles.join(", ")}.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateUpdateUser(body) {
  const errors = [];

  if (body.email !== undefined) {
    errors.push("Email cannot be changed.");
  }

  if (body.password !== undefined) {
    errors.push("Password cannot be changed via this endpoint.");
  }

  if (body.name !== undefined && typeof body.name !== "string") {
    errors.push("Name must be a string.");
  }

  if (body.role !== undefined) {
    if (typeof body.role !== "string" || !validRoles.includes(body.role)) {
      errors.push(`Role must be one of: ${validRoles.join(", ")}.`);
    }
  }

  if (body.isActive !== undefined && typeof body.isActive !== "boolean") {
    errors.push("isActive must be a boolean.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validatePaginationParams(query) {
  const errors = [];
  let page = 1;
  let limit = 20;

  if (query.page !== undefined) {
    const p = parseInt(query.page);
    if (isNaN(p) || p < 1) {
      errors.push("Page must be a positive integer.");
    } else {
      page = p;
    }
  }

  if (query.limit !== undefined) {
    const l = parseInt(query.limit);
    if (isNaN(l) || l < 1 || l > 100) {
      errors.push("Limit must be between 1 and 100.");
    } else {
      limit = l;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    page,
    limit,
  };
}

module.exports = {
  validateCreateUser,
  validateUpdateUser,
  validatePaginationParams,
};
