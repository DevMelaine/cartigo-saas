const request = require("supertest");
const jwt = require("jsonwebtoken");
const { PrismaClient, Prisma } = require("@prisma/client");

const app = require("../../src/app");
const { getAuthToken } = require("../helpers/authHelper");

const prisma = global.prisma || new PrismaClient();

function getOrganizationIdFromToken(token) {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  const decoded = jwt.verify(token, secret);
  return decoded.organizationId;
}

async function createAnalyticsProduct(organizationId, overrides = {}) {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return prisma.product.create({
    data: {
      name: `Analytics product ${uniqueSuffix}`,
      price: 7500,
      organizationId,
      sku: `AN-${uniqueSuffix.slice(-8).toUpperCase()}`,
      isActive: true,
      ...overrides,
    },
  });
}

async function createDeliveredOrder({
  organizationId,
  productId,
  quantity,
  price,
  createdAt,
}) {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const customer = await prisma.customer.create({
    data: {
      email: `orders-analytics-${uniqueSuffix}@example.com`,
      password: "hashed-password",
      name: "Analytics customer",
    },
  });

  const order = await prisma.order.create({
    data: {
      customerId: customer.id,
      organizationId,
      status: "DELIVERED",
      total: new Prisma.Decimal(price * quantity),
      createdAt,
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order.id,
      productId,
      quantity,
      price: new Prisma.Decimal(price),
    },
  });
}

describe("GET /api/orders/stats/sales-trend", () => {
  it("should return a 7 day revenue trend for the organization", async () => {
    const token = await getAuthToken(app);
    const organizationId = getOrganizationIdFromToken(token);
    const product = await createAnalyticsProduct(organizationId);

    const today = new Date();
    today.setUTCHours(12, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setUTCDate(today.getUTCDate() - 1);

    await createDeliveredOrder({
      organizationId,
      productId: product.id,
      quantity: 2,
      price: 7500,
      createdAt: today,
    });

    await createDeliveredOrder({
      organizationId,
      productId: product.id,
      quantity: 1,
      price: 7500,
      createdAt: yesterday,
    });

    const res = await request(app)
      .get("/api/orders/stats/sales-trend?days=7")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(7);

    const todayKey = today.toISOString().slice(0, 10);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

    const todayPoint = res.body.data.find((point) => point.date === todayKey);
    const yesterdayPoint = res.body.data.find((point) => point.date === yesterdayKey);

    expect(todayPoint).toMatchObject({
      date: todayKey,
      orders: 1,
      revenue: 15000,
    });
    expect(yesterdayPoint).toMatchObject({
      date: yesterdayKey,
      orders: 1,
      revenue: 7500,
    });
  });
});

describe("GET /api/orders/stats/overview", () => {
  it("should return organization order overview metrics", async () => {
    const token = await getAuthToken(app);
    const organizationId = getOrganizationIdFromToken(token);
    const product = await createAnalyticsProduct(organizationId);

    const uniqueSuffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const customer = await prisma.customer.create({
      data: {
        email: `orders-overview-${uniqueSuffix}@example.com`,
        password: "hashed-password",
        name: "Overview customer",
      },
    });

    await prisma.order.createMany({
      data: [
        {
          customerId: customer.id,
          organizationId,
          status: "PENDING_PAYMENT",
          total: new Prisma.Decimal(1200),
        },
        {
          customerId: customer.id,
          organizationId,
          status: "PROCESSING",
          total: new Prisma.Decimal(4200),
        },
        {
          customerId: customer.id,
          organizationId,
          status: "DELIVERED",
          total: new Prisma.Decimal(6800),
        },
        {
          customerId: customer.id,
          organizationId,
          status: "CANCELLED",
          total: new Prisma.Decimal(2200),
        },
      ],
    });

    await prisma.orderItem.create({
      data: {
        orderId: (
          await prisma.order.findFirst({
            where: {
              organizationId,
              status: "DELIVERED",
            },
            orderBy: {
              createdAt: "desc",
            },
          })
        ).id,
        productId: product.id,
        quantity: 1,
        price: new Prisma.Decimal(6800),
      },
    });

    const response = await request(app)
      .get("/api/orders/stats/overview")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      totalOrders: 4,
      pendingOrders: 1,
      inProgressOrders: 1,
      deliveredOrders: 1,
      cancelledOrders: 1,
      totalRevenue: 11000,
    });
  });
});
