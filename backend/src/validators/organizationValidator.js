const {
  isValidImageReference,
  normalizeOptionalImageReference,
} = require("../utils/imageReference");

function validateUpdateOrganization(body) {
  const errors = [];

  if (body.name !== undefined && body.name !== null) {
    if (typeof body.name !== "string") {
      errors.push("Organization name must be a string.");
    } else if (body.name.trim().length < 2 || body.name.trim().length > 120) {
      errors.push("Organization name must be between 2 and 120 characters.");
    }
  }

  if (body.address !== undefined && body.address !== null) {
    if (typeof body.address !== "string") {
      errors.push("Address must be a string.");
    } else if (body.address.trim().length > 255) {
      errors.push("Address must not exceed 255 characters.");
    }
  }

  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string") {
      errors.push("Description must be a string.");
    } else if (body.description.trim().length > 2000) {
      errors.push("Description must not exceed 2000 characters.");
    }
  }

  if (body.logoUrl !== undefined && body.logoUrl !== null) {
    const normalizedLogo = normalizeOptionalImageReference(body.logoUrl);

    if (normalizedLogo !== null && !isValidImageReference(normalizedLogo)) {
      errors.push("Logo path must be a valid storage path or HTTP URL.");
    }
  }

  if (body.coverImageUrl !== undefined && body.coverImageUrl !== null) {
    const normalizedCover = normalizeOptionalImageReference(body.coverImageUrl);

    if (normalizedCover !== null && !isValidImageReference(normalizedCover)) {
      errors.push("Cover image path must be a valid storage path or HTTP URL.");
    }
  }

  if (body.openingHours !== undefined && body.openingHours !== null) {
    const isObjectLike =
      typeof body.openingHours === "object" && !Array.isArray(body.openingHours);
    const isArrayLike = Array.isArray(body.openingHours);

    if (!isObjectLike && !isArrayLike) {
      errors.push("Opening hours must be an object or an array.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateUpdateOrganization,
};
