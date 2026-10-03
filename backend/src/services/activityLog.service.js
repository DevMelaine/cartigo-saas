const { PrismaClient } = require("@prisma/client");

const prisma = global.prisma || new PrismaClient();

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeOptionalSearch(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeDateStart(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function normalizeDateEnd(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setUTCHours(23, 59, 59, 999);
  return date;
}

function normalizeEntityType(action, entityType) {
  if (entityType && entityType.trim()) {
    return entityType.trim().toLowerCase();
  }

  if (/LOGIN|PASSWORD|ACCOUNT_LOCKED|GOOGLE_LOGIN/i.test(action)) {
    return "auth";
  }

  return "system";
}

function buildEntityLabel(log, subjectUser) {
  if (log.entityLabel) {
    return log.entityLabel;
  }

  if (subjectUser) {
    return `${subjectUser.name} (${subjectUser.email})`;
  }

  const normalizedType = normalizeEntityType(log.action, log.entityType);

  if (normalizedType === "auth") {
    return `Authentification ${log.action.replace(/_/g, " ").toLowerCase()}`;
  }

  return log.action.replace(/_/g, " ");
}

function buildAuxiliaryLabel(log, subjectUser) {
  if (subjectUser) {
    return subjectUser.email;
  }

  const normalizedType = normalizeEntityType(log.action, log.entityType);

  if (normalizedType === "auth") {
    return "Authentification";
  }

  if (normalizedType === "user") {
    return "Utilisateur";
  }

  return "Activite";
}

function buildWhere({ organizationId, filters = {} }) {
  const where = {
    organizationId,
  };

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.action && filters.action !== "all") {
    where.action = filters.action;
  }

  if (filters.type && filters.type !== "all" && filters.type !== "order") {
    where.entityType = filters.type;
  }

  const search = normalizeOptionalSearch(filters.search);
  if (search) {
    where.OR = [
      { action: { contains: search, mode: "insensitive" } },
      { entityLabel: { contains: search, mode: "insensitive" } },
      {
        user: {
          is: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      },
    ];
  }

  const dateFrom = normalizeDateStart(filters.dateFrom);
  const dateTo = normalizeDateEnd(filters.dateTo);
  if (dateFrom || dateTo) {
    where.createdAt = {};
  }

  if (dateFrom) {
    where.createdAt.gte = dateFrom;
  }

  if (dateTo) {
    where.createdAt.lte = dateTo;
  }

  return where;
}

async function logActivity(activity, client = prisma) {
  if (!activity?.action) {
    return null;
  }

  return client.auditLog.create({
    data: {
      userId: activity.performedBy || null,
      organizationId: activity.organizationId || null,
      action: activity.action,
      entityType: activity.entityType || null,
      entityId: activity.entityId || null,
      entityLabel: activity.entityLabel || null,
      ipAddress: activity.ipAddress || null,
      userAgent: activity.userAgent || null,
    },
  });
}

async function listActivityLogs(authUser, filters = {}) {
  const organizationId =
    typeof authUser === "string" ? authUser : authUser?.organizationId || null;

  if (!organizationId) {
    throw createError("Organization context is required.", 400);
  }

  const page = normalizePositiveInteger(filters.page, 1);
  const limit = normalizePositiveInteger(filters.limit, 10);
  const skip = (page - 1) * limit;
  const where = buildWhere({ organizationId, filters });

  const [logs, total, users, actionRows, typeRows] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
    prisma.user.findMany({
      where: {
        organizationId,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.auditLog.findMany({
      where: {
        organizationId,
      },
      select: {
        action: true,
      },
      distinct: ["action"],
      orderBy: {
        action: "asc",
      },
    }),
    prisma.auditLog.findMany({
      where: {
        organizationId,
        entityType: {
          not: null,
        },
      },
      select: {
        entityType: true,
      },
      distinct: ["entityType"],
      orderBy: {
        entityType: "asc",
      },
    }),
  ]);

  const subjectUserIds = Array.from(
    new Set(
      logs
        .filter((log) => normalizeEntityType(log.action, log.entityType) === "user" && log.entityId)
        .map((log) => log.entityId)
    )
  );

  const subjectUsers = subjectUserIds.length
    ? await prisma.user.findMany({
        where: {
          id: {
            in: subjectUserIds,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        },
      })
    : [];

  const subjectUsersById = new Map(subjectUsers.map((user) => [user.id, user]));

  return {
    data: logs.map((log) => {
      const subjectUser = log.entityId ? subjectUsersById.get(log.entityId) ?? null : null;
      const entityType = normalizeEntityType(log.action, log.entityType);
      const entityLabel = buildEntityLabel(log, subjectUser);
      const auxiliaryLabel = buildAuxiliaryLabel(log, subjectUser);

      return {
        id: log.id,
        organizationId: log.organizationId,
        performedBy: log.userId,
        action: log.action,
        entityType,
        entityId: log.entityId || subjectUser?.id || log.userId || null,
        entityLabel,
        orderReference: entityLabel,
        customerName: auxiliaryLabel,
        actorUserId: log.user?.id ?? log.userId ?? null,
        actorName: log.user?.name ?? null,
        actorRole: log.user?.role ?? null,
        previousStatus: null,
        newStatus: null,
        timestamp: log.createdAt,
        createdAt: log.createdAt,
      };
    }),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    filterOptions: {
      actions: actionRows.map((row) => ({
        value: row.action,
        label: row.action.replace(/_/g, " "),
      })),
      users: users.map((user) => ({
        value: user.id,
        label: user.name,
      })),
      types: typeRows.length
        ? [
            {
              value: "order",
              label: "Activites",
            },
          ]
        : [
            {
              value: "order",
              label: "Activites",
            },
          ],
    },
    source: "activity-logs",
  };
}

module.exports = {
  logActivity,
  listActivityLogs,
};
