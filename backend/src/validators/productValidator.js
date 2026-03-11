/**
 * Product validation layer using manual validation
 * Ensures all input conforms to business rules
 */

function validateCreateProduct(body) {
  const errors = [];

  // name validation
  if (!body.name || typeof body.name !== "string") {
    errors.push("Product name is required and must be a string.");
  } else if (body.name.trim().length < 2 || body.name.length > 255) {
    errors.push("Product name must be between 2 and 255 characters.");
  }

  // description validation
  if (body.description && typeof body.description !== "string") {
    errors.push("Description must be a string.");
  } else if (body.description && body.description.length > 2000) {
    errors.push("Description must not exceed 2000 characters.");
  }

  // price validation
  if (body.price === undefined || body.price === null) {
    errors.push("Price is required.");
  } else {
    const price = parseFloat(body.price);
    if (isNaN(price) || price <= 0) {
      errors.push("Price must be a positive number.");
    } else if (price > 999999.99) {
      errors.push("Price must not exceed 999999.99.");
    }
  }

  // costPrice validation (optional)
  if (body.costPrice !== undefined && body.costPrice !== null) {
    const costPrice = parseFloat(body.costPrice);
    if (isNaN(costPrice) || costPrice < 0) {
      errors.push("Cost price must be a non-negative number.");
    } else if (costPrice > 999999.99) {
      errors.push("Cost price must not exceed 999999.99.");
    }
    // cost price should not be greater than selling price
    if (body.price && costPrice > parseFloat(body.price)) {
      errors.push("Cost price cannot be greater than selling price.");
    }
  }

  // stock validation
  if (body.stock === undefined || body.stock === null) {
    errors.push("Stock is required.");
  } else {
    const stock = parseInt(body.stock);
    if (isNaN(stock) || stock < 0) {
      errors.push("Stock must be a non-negative integer.");
    } else if (stock > 9999999) {
      errors.push("Stock must not exceed 9999999.");
    }
  }

  // sku validation
  if (!body.sku || typeof body.sku !== "string") {
    errors.push("SKU is required and must be a string.");
  } else if (body.sku.trim().length < 1 || body.sku.length > 100) {
    errors.push("SKU must be between 1 and 100 characters.");
  } else if (!/^[A-Za-z0-9\-_]+$/.test(body.sku)) {
    errors.push("SKU must contain only letters, numbers, hyphens, or underscores. It will be normalized to uppercase.");
  }

  // category validation (optional)
  if (body.category && typeof body.category !== "string") {
    errors.push("Category must be a string.");
  } else if (body.category && body.category.length > 100) {
    errors.push("Category must not exceed 100 characters.");
  }

  // barcode validation (optional)
  if (body.barcode && typeof body.barcode !== "string") {
    errors.push("Barcode must be a string.");
  } else if (body.barcode && body.barcode.length > 100) {
    errors.push("Barcode must not exceed 100 characters.");
  }

  // imageUrl validation (optional)
  if (body.imageUrl && typeof body.imageUrl !== "string") {
    errors.push("Image URL must be a string.");
  } else if (body.imageUrl) {
    try {
      new URL(body.imageUrl);
    } catch {
      errors.push("Image URL must be a valid URL.");
    }
  }

  // lowStockThreshold validation (optional)
  if (body.lowStockThreshold !== undefined && body.lowStockThreshold !== null) {
    const threshold = parseInt(body.lowStockThreshold);
    if (isNaN(threshold) || threshold < 0) {
      errors.push("Low stock threshold must be a non-negative integer.");
    } else if (threshold > 9999999) {
      errors.push("Low stock threshold must not exceed 9999999.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateUpdateProduct(body) {
  const errors = [];

  // name validation (optional in updates)
  if (body.name !== undefined && body.name !== null) {
    if (typeof body.name !== "string") {
      errors.push("Product name must be a string.");
    } else if (body.name.trim().length < 2 || body.name.length > 255) {
      errors.push("Product name must be between 2 and 255 characters.");
    }
  }

  // description validation (optional)
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string") {
      errors.push("Description must be a string.");
    } else if (body.description.length > 2000) {
      errors.push("Description must not exceed 2000 characters.");
    }
  }

  // price validation (optional)
  if (body.price !== undefined && body.price !== null) {
    const price = parseFloat(body.price);
    if (isNaN(price) || price <= 0) {
      errors.push("Price must be a positive number.");
    } else if (price > 999999.99) {
      errors.push("Price must not exceed 999999.99.");
    }
  }

  // costPrice validation (optional)
  if (body.costPrice !== undefined && body.costPrice !== null) {
    const costPrice = parseFloat(body.costPrice);
    if (isNaN(costPrice) || costPrice < 0) {
      errors.push("Cost price must be a non-negative number.");
    } else if (costPrice > 999999.99) {
      errors.push("Cost price must not exceed 999999.99.");
    }
    // if price also provided, ensure relationship
    if (
      body.price !== undefined &&
      body.price !== null &&
      !isNaN(parseFloat(body.price)) &&
      costPrice > parseFloat(body.price)
    ) {
      errors.push("Cost price cannot be greater than selling price.");
    }
  }

  // stock validation (optional)
  if (body.stock !== undefined && body.stock !== null) {
    const stock = parseInt(body.stock);
    if (isNaN(stock) || stock < 0) {
      errors.push("Stock must be a non-negative integer.");
    } else if (stock > 9999999) {
      errors.push("Stock must not exceed 9999999.");
    }
  }

  // sku validation (optional)
  if (body.sku !== undefined && body.sku !== null) {
    if (typeof body.sku !== "string") {
      errors.push("SKU must be a string.");
    } else if (body.sku.trim().length < 1 || body.sku.length > 100) {
      errors.push("SKU must be between 1 and 100 characters.");
    } else if (!/^[A-Za-z0-9\-_]+$/.test(body.sku)) {
      errors.push("SKU must contain only letters, numbers, hyphens, or underscores.");
    }
  }

  // category validation (optional)
  if (body.category !== undefined && body.category !== null) {
    if (typeof body.category !== "string") {
      errors.push("Category must be a string.");
    } else if (body.category.length > 100) {
      errors.push("Category must not exceed 100 characters.");
    }
  }

  // barcode validation (optional)
  if (body.barcode !== undefined && body.barcode !== null) {
    if (typeof body.barcode !== "string") {
      errors.push("Barcode must be a string.");
    } else if (body.barcode.length > 100) {
      errors.push("Barcode must not exceed 100 characters.");
    }
  }

  // imageUrl validation (optional)
  if (body.imageUrl !== undefined && body.imageUrl !== null) {
    if (typeof body.imageUrl !== "string") {
      errors.push("Image URL must be a string.");
    } else if (body.imageUrl.length > 0) {
      try {
        new URL(body.imageUrl);
      } catch {
        errors.push("Image URL must be a valid URL.");
      }
    }
  }

  // isActive validation (optional)
  if (body.isActive !== undefined && body.isActive !== null) {
    if (typeof body.isActive !== "boolean") {
      errors.push("isActive must be a boolean.");
    }
  }

  // lowStockThreshold validation (optional)
  if (body.lowStockThreshold !== undefined && body.lowStockThreshold !== null) {
    const threshold = parseInt(body.lowStockThreshold);
    if (isNaN(threshold) || threshold < 0) {
      errors.push("Low stock threshold must be a non-negative integer.");
    } else if (threshold > 9999999) {
      errors.push("Low stock threshold must not exceed 9999999.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validatePaginationParams(query) {
  const errors = [];

  let page = 1;
  let limit = 10;

  if (query.page !== undefined) {
    const parsedPage = parseInt(query.page);
    if (isNaN(parsedPage) || parsedPage < 1) {
      errors.push("Page must be a positive integer.");
    } else {
      page = parsedPage;
    }
  }

  if (query.limit !== undefined) {
    const parsedLimit = parseInt(query.limit);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      errors.push("Limit must be between 1 and 100.");
    } else {
      limit = parsedLimit;
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
  validateCreateProduct,
  validateUpdateProduct,
  validatePaginationParams,
};
