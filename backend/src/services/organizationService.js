const prisma = require("../lib/prisma");
const { cleanupRemovedFiles } = require("../modules/storage/storageCleanup.service");
const {
  parseStorageReference,
  resolvePublicFileUrl,
} = require("../modules/storage/storage.service");
const { validateUpdateOrganization } = require("../validators/organizationValidator");
const { normalizeOptionalImageReference } = require("../utils/imageReference");

const organizationSelect = {
  id: true,
  name: true,
  address: true,
  description: true,
  logoUrl: true,
  coverImageUrl: true,
  openingHours: true,
  categoryId: true,
  createdAt: true,
  category: {
    select: {
      id: true,
      name: true,
    },
  },
};

function createError(message, statusCode = 400, details) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function mapOrganization(organization) {
  return {
    id: organization.id,
    name: organization.name,
    address: organization.address,
    description: organization.description,
    logoUrl: resolvePublicFileUrl(organization.logoUrl),
    coverImageUrl: resolvePublicFileUrl(organization.coverImageUrl),
    openingHours: organization.openingHours,
    categoryId: organization.categoryId,
    category: organization.category?.name || null,
    createdAt: organization.createdAt,
  };
}

function ensureOrganizationAssetPath(path, organizationId, allowedPrefixes) {
  const normalizedPath = normalizeOptionalImageReference(path);

  if (normalizedPath === undefined || normalizedPath === null) {
    return normalizedPath;
  }

  if (!allowedPrefixes.some((prefix) => normalizedPath.startsWith(prefix))) {
    try {
      const parsedReference = parseStorageReference(normalizedPath);

      if (
        !allowedPrefixes.some((prefix) =>
          parsedReference.storedPath.startsWith(prefix)
        )
      ) {
        console.warn(
          `STORAGE_PATH_SUSPICIOUS context=organization-update organization=${organizationId} path=${normalizedPath}`
        );
        throw createError("Invalid organization image path.", 400);
      }

      return parsedReference.publicUrl;
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }

      console.warn(
        `STORAGE_PATH_SUSPICIOUS context=organization-update organization=${organizationId} path=${normalizedPath}`
      );
      throw createError("Invalid organization image path.", 400);
    }
  }

  try {
    return parseStorageReference(normalizedPath).publicUrl;
  } catch {
    console.warn(
      `STORAGE_PATH_SUSPICIOUS context=organization-update organization=${organizationId} path=${normalizedPath}`
    );
    throw createError("Invalid organization image path.", 400);
  }
}

function toComparableImageReference(reference) {
  const normalizedReference = normalizeOptionalImageReference(reference);

  if (!normalizedReference) {
    return normalizedReference;
  }

  try {
    return parseStorageReference(normalizedReference).storedPath;
  } catch {
    return normalizedReference;
  }
}

function areEquivalentImageReferences(left, right) {
  return toComparableImageReference(left) === toComparableImageReference(right);
}

function buildImageReferenceCandidates(reference) {
  const normalizedReference = normalizeOptionalImageReference(reference);

  if (!normalizedReference) {
    return [];
  }

  const candidates = new Set([normalizedReference]);

  try {
    const parsedReference = parseStorageReference(normalizedReference);
    candidates.add(parsedReference.storedPath);
    candidates.add(parsedReference.publicUrl);
  } catch {
    // Keep the original reference candidate when it cannot be parsed.
  }

  return Array.from(candidates);
}

async function isOrganizationAssetStillReferenced(reference, organizationId) {
  const candidates = buildImageReferenceCandidates(reference);

  if (candidates.length === 0) {
    return false;
  }

  const existingReference = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      OR: candidates.flatMap((candidate) => [
        { logoUrl: candidate },
        { coverImageUrl: candidate },
      ]),
    },
    select: {
      id: true,
    },
  });

  return Boolean(existingReference);
}

async function getOrganizationProfile(organizationId) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: organizationSelect,
  });

  if (!organization) {
    throw createError("Organization not found", 404);
  }

  return mapOrganization(organization);
}

async function updateOrganization(organizationId, data) {
  const { isValid, errors } = validateUpdateOrganization(data);

  if (!isValid) {
    throw createError("Validation failed", 400, errors);
  }

  const existingOrganization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: organizationSelect,
  });

  if (!existingOrganization) {
    throw createError("Organization not found", 404);
  }

  const updateData = {};

  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.address !== undefined) updateData.address = data.address?.trim() || null;
  if (data.description !== undefined) {
    updateData.description = data.description?.trim() || null;
  }
  if (data.openingHours !== undefined) updateData.openingHours = data.openingHours;
  if (data.logoUrl !== undefined) {
    updateData.logoUrl = ensureOrganizationAssetPath(
      data.logoUrl,
      organizationId,
      [`logos/${organizationId}/`]
    );
  }
  if (data.coverImageUrl !== undefined) {
    updateData.coverImageUrl = ensureOrganizationAssetPath(
      data.coverImageUrl,
      organizationId,
      [`couverture/${organizationId}/`]
    );
  }

  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data: updateData,
    select: organizationSelect,
  });

  const removedPaths = [];

  if (
    data.logoUrl !== undefined &&
    existingOrganization.logoUrl &&
    !areEquivalentImageReferences(existingOrganization.logoUrl, organization.logoUrl)
  ) {
    removedPaths.push(existingOrganization.logoUrl);
  }

  if (
    data.coverImageUrl !== undefined &&
    existingOrganization.coverImageUrl &&
    !areEquivalentImageReferences(
      existingOrganization.coverImageUrl,
      organization.coverImageUrl
    )
  ) {
    removedPaths.push(existingOrganization.coverImageUrl);
  }

  await cleanupRemovedFiles(removedPaths, {
    allowedPrefixes: [
      `logos/${organizationId}/`,
      `couverture/${organizationId}/`,
    ],
    shouldDelete: async (path) =>
      !(await isOrganizationAssetStillReferenced(path, organizationId)),
    context: `organization=${organizationId}`,
  });

  return mapOrganization(organization);
}

module.exports = {
  getOrganizationProfile,
  updateOrganization,
};
