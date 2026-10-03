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

const CUSTOMER_STATUS_FILTERS = new Set(["all", "active", "inactive"]);
const CUSTOMER_SORT_FIELDS = new Set(["lastOrderAt", "totalSpent", "totalOrders"]);
const CUSTOMER_SORT_ORDERS = new Set(["asc", "desc"]);

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

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeCustomerFilters(rawFilters = {}) {
  const status = typeof rawFilters.status === "string" ? rawFilters.status : "all";
  const sortBy =
    typeof rawFilters.sortBy === "string"
      ? rawFilters.sortBy
      : typeof rawFilters.sort === "string"
        ? rawFilters.sort
        : "lastOrderAt";
  const sortOrder =
    typeof rawFilters.sortOrder === "string"
      ? rawFilters.sortOrder
      : typeof rawFilters.order === "string"
        ? rawFilters.order
        : "desc";
  const search =
    typeof rawFilters.search === "string" && rawFilters.search.trim().length > 0
      ? rawFilters.search.trim()
      : undefined;

  return {
    page: parsePositiveInt(rawFilters.page, 1),
    limit: parsePositiveInt(rawFilters.limit, 10),
    search,
    status: CUSTOMER_STATUS_FILTERS.has(status) ? status : "all",
    sortBy: CUSTOMER_SORT_FIELDS.has(sortBy) ? sortBy : "lastOrderAt",
    sortOrder: CUSTOMER_SORT_ORDERS.has(sortOrder) ? sortOrder : "desc",
  };
}

function toComparableNumber(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  return Number.parseFloat(value.toString()) || 0;
}

function resolveCustomerActiveState(lastOrderAt, thresholdDate) {
  if (!lastOrderAt) {
    return false;
  }

  const lastOrderDate = new Date(lastOrderAt);
  return !Number.isNaN(lastOrderDate.getTime()) && lastOrderDate >= thresholdDate;
}

function compareCustomers(left, right, sortBy, sortOrder) {
  let comparison = 0;

  switch (sortBy) {
    case "totalSpent":
      comparison = left.totalSpent - right.totalSpent;
      break;
    case "totalOrders":
      comparison = left.totalOrders - right.totalOrders;
      break;
    case "lastOrderAt":
    default: {
      const leftTime = left.lastOrderAt ? new Date(left.lastOrderAt).getTime() : 0;
      const rightTime = right.lastOrderAt ? new Date(right.lastOrderAt).getTime() : 0;
      comparison = leftTime - rightTime;
      break;
    }
  }

  if (comparison === 0) {
    comparison = left.name.localeCompare(right.name);
  }

  if (comparison === 0) {
    comparison = left.id.localeCompare(right.id);
  }

  return sortOrder === "asc" ? comparison : comparison * -1;
}

async function listOrganizationCustomers(organizationId, rawFilters = {}) {
  const filters = normalizeCustomerFilters(rawFilters);
  const activeThreshold = new Date();
  activeThreshold.setDate(activeThreshold.getDate() - 30);

  const orderWhere = {
    organizationId,
    ...(filters.search
      ? {
          customer: {
            is: {
              OR: [
                { name: { contains: filters.search, mode: "insensitive" } },
                { email: { contains: filters.search, mode: "insensitive" } },
              ],
            },
          },
        }
      : {}),
  };

  const groupedOrders = await prisma.order.groupBy({
    by: ["customerId"],
    where: orderWhere,
    _count: {
      _all: true,
    },
    _sum: {
      total: true,
    },
    _max: {
      createdAt: true,
    },
  });

  if (groupedOrders.length === 0) {
    return {
      data: [],
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: 0,
        totalPages: 0,
      },
      summary: {
        totalClients: 0,
        activeClients: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
      },
    };
  }

  const customers = await prisma.customer.findMany({
    where: {
      id: {
        in: groupedOrders.map((entry) => entry.customerId),
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

  const aggregatedCustomers = groupedOrders
    .map((entry) => {
      const customer = customerMap.get(entry.customerId);

      if (!customer) {
        return null;
      }

      const lastOrderAt = entry._max.createdAt ? entry._max.createdAt.toISOString() : null;
      const totalSpent = toComparableNumber(entry._sum.total);
      const totalOrders = entry._count._all ?? 0;
      const isActive = resolveCustomerActiveState(lastOrderAt, activeThreshold);

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: null,
        totalOrders,
        totalSpent,
        lastOrderAt,
        isActive,
      };
    })
    .filter(Boolean);

  const filteredCustomers =
    filters.status === "all"
      ? aggregatedCustomers
      : aggregatedCustomers.filter((customer) =>
          filters.status === "active" ? customer.isActive : !customer.isActive
        );

  filteredCustomers.sort((left, right) =>
    compareCustomers(left, right, filters.sortBy, filters.sortOrder)
  );

  const totalClients = filteredCustomers.length;
  const totalRevenue = filteredCustomers.reduce(
    (sum, customer) => sum + customer.totalSpent,
    0
  );
  const totalOrders = filteredCustomers.reduce(
    (sum, customer) => sum + customer.totalOrders,
    0
  );
  const totalPages = totalClients > 0 ? Math.ceil(totalClients / filters.limit) : 0;
  const offset = (filters.page - 1) * filters.limit;
  const paginatedCustomers = filteredCustomers.slice(offset, offset + filters.limit);

  return {
    data: paginatedCustomers,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total: totalClients,
      totalPages,
    },
    summary: {
      totalClients,
      activeClients: filteredCustomers.filter((customer) => customer.isActive).length,
      totalRevenue,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    },
  };
}

module.exports = {
  getOrganizationProfile,
  updateOrganization,
  listOrganizationCustomers,
};
