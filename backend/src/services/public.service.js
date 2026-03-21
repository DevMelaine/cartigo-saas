const { PrismaClient } = require("@prisma/client");

const prisma = global.prisma || new PrismaClient();

const DAY_ORDER = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const DAY_LABELS = {
  MONDAY: "Lundi",
  TUESDAY: "Mardi",
  WEDNESDAY: "Mercredi",
  THURSDAY: "Jeudi",
  FRIDAY: "Vendredi",
  SATURDAY: "Samedi",
  SUNDAY: "Dimanche",
};

function createPagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

function createNotFoundError(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

function getDatePartsForTimezone(timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    dayName: String(values.weekday || "").toUpperCase(),
    timeString: `${values.hour}:${values.minute}`,
  };
}

function getCurrentScheduleContext(timeZone) {
  if (!timeZone) {
    const now = new Date();
    const utcDay = now.getUTCDay();

    return {
      dayName: DAY_ORDER[(utcDay + 6) % 7],
      timeString: now.toISOString().slice(11, 16),
    };
  }

  try {
    return getDatePartsForTimezone(timeZone);
  } catch {
    return getCurrentScheduleContext();
  }
}

function normalizeOpeningHours(rawOpeningHours) {
  if (!rawOpeningHours) {
    return {
      timezone: null,
      schedule: [],
    };
  }

  const source = Array.isArray(rawOpeningHours)
    ? { timezone: null, schedule: rawOpeningHours }
    : rawOpeningHours;

  const schedule = Array.isArray(source.schedule)
    ? source.schedule
        .map((entry) => {
          if (!entry || typeof entry !== "object") {
            return null;
          }

          const day = typeof entry.day === "string" ? entry.day.toUpperCase() : null;

          if (!day || !DAY_ORDER.includes(day)) {
            return null;
          }

          return {
            day,
            label: DAY_LABELS[day],
            opensAt: typeof entry.opensAt === "string" ? entry.opensAt : null,
            closesAt: typeof entry.closesAt === "string" ? entry.closesAt : null,
            isClosed: Boolean(entry.isClosed),
          };
        })
        .filter(Boolean)
        .sort((left, right) => DAY_ORDER.indexOf(left.day) - DAY_ORDER.indexOf(right.day))
    : [];

  return {
    timezone: typeof source.timezone === "string" ? source.timezone : null,
    schedule,
  };
}

function getOpeningStatus(openingHours) {
  if (!openingHours.schedule.length) {
    return {
      isOpen: null,
      statusLabel: "Horaires indisponibles",
      shortLabel: "Horaires indisponibles",
    };
  }

  const { dayName, timeString } = getCurrentScheduleContext(openingHours.timezone);
  const todayEntry = openingHours.schedule.find((entry) => entry.day === dayName);

  if (!todayEntry || todayEntry.isClosed || !todayEntry.opensAt || !todayEntry.closesAt) {
    return {
      isOpen: false,
      statusLabel: "Ferme aujourd'hui",
      shortLabel: "Ferme aujourd'hui",
    };
  }

  const isOpen = timeString >= todayEntry.opensAt && timeString <= todayEntry.closesAt;
  const formattedCloseTime = todayEntry.closesAt.slice(0, 5);
  const formattedOpenTime = todayEntry.opensAt.slice(0, 5);

  return {
    isOpen,
    statusLabel: isOpen ? "Ouvert" : "Ferme",
    shortLabel: isOpen
      ? `Ouvert jusqu'a ${formattedCloseTime}`
      : `Ouvre a ${formattedOpenTime}`,
  };
}

function buildPublicProduct(product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description || null,
    price: Number(product.price),
    image: product.imageUrl || null,
    quantity: product.inventory?.quantity ?? 0,
    categoryId: product.category?.id || null,
    categoryName: product.category?.name || null,
  };
}

async function ensureCategoryExists(categoryId) {
  if (!categoryId) {
    return null;
  }

  const category = await prisma.organizationCategory.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
  });

  if (!category) {
    throw createNotFoundError("Organization category not found");
  }

  return category;
}

async function listCategories() {
  return prisma.organizationCategory.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
  });
}

async function listOrganizations({ page, limit, categoryId }) {
  const skip = (page - 1) * limit;

  await ensureCategoryExists(categoryId);

  const where = categoryId ? { categoryId } : {};

  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        {
          category: {
            name: "asc",
          },
        },
        {
          name: "asc",
        },
      ],
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.organization.count({ where }),
  ]);

  return {
    data: organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      address: organization.address,
      categoryId: organization.categoryId,
      category: organization.category.name,
      logo: organization.logoUrl || null,
      coverImage: organization.coverImageUrl || null,
      description: organization.description || null,
    })),
    ...createPagination(page, limit, total),
  };
}

async function getOrganization(organizationId) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      address: true,
      description: true,
      logoUrl: true,
      coverImageUrl: true,
      openingHours: true,
      categoryId: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      products: {
        where: {
          isActive: true,
        },
        orderBy: [
          {
            category: {
              name: "asc",
            },
          },
          {
            name: "asc",
          },
        ],
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          imageUrl: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          inventory: {
            select: {
              quantity: true,
            },
          },
        },
      },
    },
  });

  if (!organization) {
    throw createNotFoundError("Organization not found");
  }

  const products = organization.products.map(buildPublicProduct);
  const categories = organization.products.reduce((accumulator, product) => {
    if (!product.category?.id) {
      return accumulator;
    }

    const existing = accumulator.find((entry) => entry.id === product.category.id);

    if (existing) {
      existing.productCount += 1;
      return accumulator;
    }

    accumulator.push({
      id: product.category.id,
      name: product.category.name,
      productCount: 1,
    });

    return accumulator;
  }, []);

  const openingHours = normalizeOpeningHours(organization.openingHours);
  const openingStatus = getOpeningStatus(openingHours);

  return {
    id: organization.id,
    name: organization.name,
    address: organization.address || null,
    description: organization.description || null,
    logo: organization.logoUrl || null,
    coverImage: organization.coverImageUrl || null,
    categoryId: organization.categoryId,
    category: organization.category.name,
    isOpen: openingStatus.isOpen,
    statusLabel: openingStatus.statusLabel,
    openingHoursLabel: openingStatus.shortLabel,
    openingHours,
    categories,
    products,
  };
}

async function listOrganizationProducts({ organizationId, page, limit, search }) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
    },
  });

  if (!organization) {
    throw createNotFoundError("Organization not found");
  }

  const skip = (page - 1) * limit;
  const where = {
    organizationId,
    isActive: true,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { sku: { contains: search.toUpperCase(), mode: "insensitive" } },
      { category: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        {
          category: {
            name: "asc",
          },
        },
        {
          name: "asc",
        },
      ],
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        inventory: {
          select: {
            quantity: true,
          },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data: products.map(buildPublicProduct),
    ...createPagination(page, limit, total),
  };
}

async function getProduct(productId) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      imageUrl: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      inventory: {
        select: {
          quantity: true,
        },
      },
      organization: {
        select: {
          id: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!product) {
    throw createNotFoundError("Product not found");
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    image: product.imageUrl || null,
    quantity: product.inventory?.quantity ?? 0,
    organizationId: product.organization.id,
    categoryId: product.category?.id || null,
    category: product.category?.name || null,
    organizationCategoryId: product.organization.category.id,
    organizationCategory: product.organization.category.name,
  };
}

module.exports = {
  listCategories,
  listOrganizations,
  getOrganization,
  listOrganizationProducts,
  getProduct,
};
