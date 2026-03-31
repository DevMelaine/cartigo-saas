function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidStoragePath(value) {
  if (typeof value !== "string") {
    return false;
  }

  const trimmedValue = value.trim();

  if (
    !trimmedValue ||
    trimmedValue.startsWith("/") ||
    trimmedValue.endsWith("/") ||
    trimmedValue.includes("..") ||
    trimmedValue.includes("\\")
  ) {
    return false;
  }

  const segments = trimmedValue.split("/");

  return segments.length >= 3 && segments.every((segment) => segment.length > 0);
}

function isValidImageReference(value) {
  if (typeof value !== "string") {
    return false;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return false;
  }

  return isValidHttpUrl(trimmedValue) || isValidStoragePath(trimmedValue);
}

function normalizeOptionalImageReference(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeImageReferenceArray(values) {
  if (!Array.isArray(values)) {
    return values;
  }

  const deduplicatedValues = [];
  const seen = new Set();

  values.forEach((value) => {
    if (typeof value !== "string") {
      deduplicatedValues.push(value);
      return;
    }

    const normalizedValue = value.trim();

    if (!normalizedValue || seen.has(normalizedValue)) {
      return;
    }

    seen.add(normalizedValue);
    deduplicatedValues.push(normalizedValue);
  });

  return deduplicatedValues;
}

module.exports = {
  isValidImageReference,
  isValidStoragePath,
  normalizeOptionalImageReference,
  normalizeImageReferenceArray,
};
