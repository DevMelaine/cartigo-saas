const INVITABLE_ROLES = ["MANAGER", "CASHIER", "STAFF"];

function validateCreateInvitation(body) {
  const errors = [];

  if (!body.email || typeof body.email !== "string") {
    errors.push("Email is required.");
  } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) {
    errors.push("Email must be valid.");
  }

  if (!body.role || typeof body.role !== "string") {
    errors.push("Role is required.");
  } else if (!INVITABLE_ROLES.includes(body.role)) {
    errors.push(`Role must be one of: ${INVITABLE_ROLES.join(", ")}.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateAcceptInvitation(body) {
  const errors = [];

  if (!body.token || typeof body.token !== "string" || body.token.trim().length < 16) {
    errors.push("Token is required.");
  }

  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    errors.push("Name is required.");
  }

  if (!body.password || typeof body.password !== "string") {
    errors.push("Password is required.");
  } else if (body.password.length < 8) {
    errors.push("Password must be at least 8 characters.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  INVITABLE_ROLES,
  validateCreateInvitation,
  validateAcceptInvitation,
};
