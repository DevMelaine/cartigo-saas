/**
 * Product validation layer using manual validation
 * Ensures all input conforms to business rules
 */

const {
  isValidImageReference,
  normalizeOptionalImageReference,
} = require("../utils/imageReference");

function isValidUuid(value) {
  return typeof value === "string" && /^[0-9a-fA-F-]{36}$/.test(value.trim());
}

function isValidProductLifecycleStatus(value) {
  return (
    typeof value === "string" &&
    ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"].includes(value.trim().toUpperCase())
  );
}

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

  // category validation
  if (!body.categoryId || typeof body.categoryId !== "string") {
    errors.push("Category ID is required and must be a string.");
  } else if (!isValidUuid(body.categoryId)) {
    errors.push("Category ID must be a valid UUID.");
  }

  // barcode validation (optional)
  if (body.barcode && typeof body.barcode !== "string") {
    errors.push("Barcode must be a string.");
  } else if (body.barcode && body.barcode.length > 100) {
    errors.push("Barcode must not exceed 100 characters.");
  }

  if (body.status !== undefined && body.status !== null) {
    if (!isValidProductLifecycleStatus(body.status)) {
      errors.push("Status must be one of DRAFT, ACTIVE, PAUSED, or ARCHIVED.");
    }
  }

  // imageUrl validation (optional)
  if (body.imageUrl && typeof body.imageUrl !== "string") {
    errors.push("Image URL must be a string.");
  } else if (body.imageUrl) {
    const normalizedImage = normalizeOptionalImageReference(body.imageUrl);
    if (normalizedImage !== null && !isValidImageReference(normalizedImage)) {
      errors.push("Image URL must be a valid storage path or HTTP URL.");
    }
  }

  if (body.galleryImages !== undefined && body.galleryImages !== null) {
    if (!Array.isArray(body.galleryImages)) {
      errors.push("Gallery images must be an array.");
    } else if (
      body.galleryImages.some((image) => {
        const normalizedImage = normalizeOptionalImageReference(image);
        return normalizedImage === null || !isValidImageReference(normalizedImage);
      })
    ) {
      errors.push("Gallery images must contain valid storage paths or HTTP URLs.");
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
  if (body.categoryId !== undefined) {
    if (typeof body.categoryId !== "string") {
      errors.push("Category ID must be a string.");
    } else if (!isValidUuid(body.categoryId)) {
      errors.push("Category ID must be a valid UUID.");
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

  if (body.status !== undefined && body.status !== null) {
    if (!isValidProductLifecycleStatus(body.status)) {
      errors.push("Status must be one of DRAFT, ACTIVE, PAUSED, or ARCHIVED.");
    }
  }

  // imageUrl validation (optional)
  if (body.imageUrl !== undefined) {
    if (body.imageUrl !== null && typeof body.imageUrl !== "string") {
      errors.push("Image URL must be a string.");
    } else if (typeof body.imageUrl === "string" && body.imageUrl.length > 0) {
      const normalizedImage = normalizeOptionalImageReference(body.imageUrl);
      if (normalizedImage !== null && !isValidImageReference(normalizedImage)) {
        errors.push("Image URL must be a valid storage path or HTTP URL.");
      }
    }
  }

  if (body.galleryImages !== undefined && body.galleryImages !== null) {
    if (!Array.isArray(body.galleryImages)) {
      errors.push("Gallery images must be an array.");
    } else if (
      body.galleryImages.some((image) => {
        const normalizedImage = normalizeOptionalImageReference(image);
        return normalizedImage === null || !isValidImageReference(normalizedImage);
      })
    ) {
      errors.push("Gallery images must contain valid storage paths or HTTP URLs.");
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

function validateProductListQuery(query) {
  const { isValid, errors, page, limit } = validatePaginationParams(query);
  const normalizedErrors = [...errors];

  const value = {
    page,
    limit,
    search: undefined,
    category: undefined,
    categoryId: undefined,
    sort: undefined,
    order: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    stockState: undefined,
    status: undefined,
  };

  if (query.search !== undefined) {
    if (typeof query.search !== "string") {
      normalizedErrors.push("Search must be a string.");
    } else {
      const trimmedSearch = query.search.trim();
      if (trimmedSearch.length > 255) {
        normalizedErrors.push("Search must not exceed 255 characters.");
      } else if (trimmedSearch.length > 0) {
        value.search = trimmedSearch;
      }
    }
  }

  if (query.category !== undefined) {
    if (typeof query.category !== "string") {
      normalizedErrors.push("Category must be a string.");
    } else {
      const trimmedCategory = query.category.trim();
      if (trimmedCategory.length > 100) {
        normalizedErrors.push("Category must not exceed 100 characters.");
      } else if (trimmedCategory.length > 0) {
        value.category = trimmedCategory;
      }
    }
  }

  if (query.categoryId !== undefined) {
    if (typeof query.categoryId !== "string") {
      normalizedErrors.push("Category ID must be a string.");
    } else {
      const trimmedCategoryId = query.categoryId.trim();
      if (trimmedCategoryId.length === 0) {
        // noop
      } else if (!/^[0-9a-fA-F-]{36}$/.test(trimmedCategoryId)) {
        normalizedErrors.push("Category ID must be a valid UUID.");
      } else {
        value.categoryId = trimmedCategoryId;
      }
    }
  }

  if (query.sort !== undefined) {
    const allowedSortFields = ["createdAt", "updatedAt", "name", "price", "stock"];
    if (
      typeof query.sort !== "string" ||
      !allowedSortFields.includes(query.sort)
    ) {
      normalizedErrors.push("Sort field is invalid.");
    } else {
      value.sort = query.sort;
    }
  }

  if (query.order !== undefined) {
    if (
      typeof query.order !== "string" ||
      !["asc", "desc"].includes(query.order.toLowerCase())
    ) {
      normalizedErrors.push("Sort order is invalid.");
    } else {
      value.order = query.order.toLowerCase();
    }
  }

  if (query.minPrice !== undefined) {
    const minPrice = parseFloat(query.minPrice);
    if (Number.isNaN(minPrice) || minPrice < 0) {
      normalizedErrors.push("Minimum price must be a non-negative number.");
    } else {
      value.minPrice = minPrice;
    }
  }

  if (query.maxPrice !== undefined) {
    const maxPrice = parseFloat(query.maxPrice);
    if (Number.isNaN(maxPrice) || maxPrice < 0) {
      normalizedErrors.push("Maximum price must be a non-negative number.");
    } else {
      value.maxPrice = maxPrice;
    }
  }

  if (
    value.minPrice !== undefined &&
    value.maxPrice !== undefined &&
    value.minPrice > value.maxPrice
  ) {
    normalizedErrors.push("Minimum price cannot be greater than maximum price.");
  }

  if (query.stockState !== undefined) {
    const allowedStockStates = ["all", "in_stock", "out_of_stock", "low_stock"];
    if (
      typeof query.stockState !== "string" ||
      !allowedStockStates.includes(query.stockState)
    ) {
      normalizedErrors.push("Stock filter is invalid.");
    } else if (query.stockState !== "all") {
      value.stockState = query.stockState;
    }
  }

  if (query.status !== undefined) {
    const allowedStatuses = ["all", "active", "draft", "paused", "archived"];
    if (
      typeof query.status !== "string" ||
      !allowedStatuses.includes(query.status)
    ) {
      normalizedErrors.push("Status filter is invalid.");
    } else if (query.status !== "active") {
      value.status = query.status;
    }
  }

  return {
    isValid: isValid && normalizedErrors.length === 0,
    errors: normalizedErrors,
    value,
  };
}

module.exports = {
  validateCreateProduct,
  validateUpdateProduct,
  validatePaginationParams,
  validateProductListQuery,
};
