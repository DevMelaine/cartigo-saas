const request = require("supertest");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const { PrismaClient } = require("@prisma/client");
const app = require("../../src/app");
const { createTestOrganization } = require("../helpers/organizationCategoryHelper");

const prisma = global.prisma || new PrismaClient();

function uniqueEmail(prefix = "order-lifecycle") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

function signOrgUserToken({ organizationId, role, userId = randomUUID() }) {
  const token = jwt.sign(
    {
      userId,
      organizationId,
      role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    }
  );

  return {
    token,
    userId,
  };
}

async function createOrganizationCustomer(name) {
  const organization = await createTestOrganization({
    name,
  });

  const customer = await prisma.customer.create({
    data: {
      name: `${name} Customer`,
      email: uniqueEmail(name.toLowerCase().replace(/\s+/g, "-")),
      password: "Password123!",
    },
  });

  return {
    organization,
    customer,
  };
}

async function createOrder({
  organizationId,
  customerId,
  status = "PENDING_PAYMENT",
  total = 500,
  createdAt,
}) {
  return prisma.order.create({
    data: {
      organizationId,
      customerId,
      status,
      total,
      ...(createdAt ? { createdAt } : {}),
    },
  });
}

describe("Order lifecycle module", () => {
  it("allows a cashier to confirm a pending payment and writes an audit log", async () => {
    const { organization, customer } = await createOrganizationCustomer("Lifecycle Cashier Org");
    const order = await createOrder({
      organizationId: organization.id,
      customerId: customer.id,
      status: "PENDING_PAYMENT",
    });
    const session = signOrgUserToken({
      organizationId: organization.id,
      role: "CASHIER",
    });

    const response = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set("Authorization", `Bearer ${session.token}`)
      .send({ status: "PAID" })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("PAID");
    expect(response.body.data.readyForDelivery).toBe(false);

    const auditLog = await prisma.orderAuditLog.findFirst({
      where: { orderId: order.id },
      orderBy: { createdAt: "desc" },
    });

    expect(auditLog).not.toBeNull();
    expect(auditLog.previousStatus).toBe("PENDING_PAYMENT");
    expect(auditLog.newStatus).toBe("PAID");
    expect(auditLog.changedByUserId).toBe(session.userId);
    expect(auditLog.changedByRole).toBe("CASHIER");
  });

  it("rejects invalid lifecycle jumps", async () => {
    const { organization, customer } = await createOrganizationCustomer("Lifecycle Invalid Org");
    const order = await createOrder({
      organizationId: organization.id,
      customerId: customer.id,
      status: "PAID",
    });
    const session = signOrgUserToken({
      organizationId: organization.id,
      role: "ADMIN",
    });

    const response = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set("Authorization", `Bearer ${session.token}`)
      .send({ status: "READY_FOR_DELIVERY" })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/invalid status transition/i);
  });

  it("prevents staff from confirming payments", async () => {
    const { organization, customer } = await createOrganizationCustomer("Lifecycle Staff Guard Org");
    const order = await createOrder({
      organizationId: organization.id,
      customerId: customer.id,
      status: "PENDING_PAYMENT",
    });
    const session = signOrgUserToken({
      organizationId: organization.id,
      role: "STAFF",
    });

    const response = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set("Authorization", `Bearer ${session.token}`)
      .send({ status: "PAID" })
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/staff can only mark processing orders as ready for delivery/i);
  });

  it("prevents managers from performing payment confirmation", async () => {
    const { organization, customer } = await createOrganizationCustomer("Lifecycle Manager Guard Org");
    const order = await createOrder({
      organizationId: organization.id,
      customerId: customer.id,
      status: "PENDING_PAYMENT",
    });
    const session = signOrgUserToken({
      organizationId: organization.id,
      role: "MANAGER",
    });

    const response = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set("Authorization", `Bearer ${session.token}`)
      .send({ status: "PAID" })
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/financial status confirmation/i);
  });

  it("allows staff to move processing orders to ready for delivery", async () => {
    const { organization, customer } = await createOrganizationCustomer("Lifecycle Ready Org");
    const order = await createOrder({
      organizationId: organization.id,
      customerId: customer.id,
      status: "PROCESSING",
    });
    const session = signOrgUserToken({
      organizationId: organization.id,
      role: "STAFF",
    });

    const response = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set("Authorization", `Bearer ${session.token}`)
      .send({ status: "READY_FOR_DELIVERY" })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("READY_FOR_DELIVERY");
    expect(response.body.data.readyForDelivery).toBe(true);

    const refreshedOrder = await prisma.order.findUnique({
      where: { id: order.id },
    });

    expect(refreshedOrder.readyForDelivery).toBe(true);
  });

  it("lists orders with pagination and status filtering without leaking other organizations", async () => {
    const primary = await createOrganizationCustomer("Lifecycle List Primary Org");
    const secondary = await createOrganizationCustomer("Lifecycle List Secondary Org");
    const session = signOrgUserToken({
      organizationId: primary.organization.id,
      role: "ADMIN",
    });

    await createOrder({
      organizationId: primary.organization.id,
      customerId: primary.customer.id,
      status: "PAID",
      total: 100,
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
    });
    await createOrder({
      organizationId: primary.organization.id,
      customerId: primary.customer.id,
      status: "PAID",
      total: 200,
      createdAt: new Date("2026-01-02T10:00:00.000Z"),
    });
    await createOrder({
      organizationId: primary.organization.id,
      customerId: primary.customer.id,
      status: "PROCESSING",
      total: 300,
      createdAt: new Date("2026-01-03T10:00:00.000Z"),
    });
    await createOrder({
      organizationId: secondary.organization.id,
      customerId: secondary.customer.id,
      status: "PAID",
      total: 400,
      createdAt: new Date("2026-01-04T10:00:00.000Z"),
    });

    const response = await request(app)
      .get("/api/orders")
      .query({ status: "PAID", page: 1, limit: 1 })
      .set("Authorization", `Bearer ${session.token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.pagination).toEqual({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
    });
    expect(response.body.data[0].organizationId).toBe(primary.organization.id);
    expect(response.body.data[0].status).toBe("PAID");
  });

  it("filters organization orders by search, date range and amount range", async () => {
    const primary = await createOrganizationCustomer("Lifecycle Filters Org");
    const session = signOrgUserToken({
      organizationId: primary.organization.id,
      role: "ADMIN",
    });

    await createOrder({
      organizationId: primary.organization.id,
      customerId: primary.customer.id,
      status: "PAID",
      total: 150,
      createdAt: new Date("2026-01-10T10:00:00.000Z"),
    });
    await createOrder({
      organizationId: primary.organization.id,
      customerId: primary.customer.id,
      status: "PROCESSING",
      total: 950,
      createdAt: new Date("2026-01-20T10:00:00.000Z"),
    });

    const response = await request(app)
      .get("/api/orders")
      .query({
        search: primary.customer.name,
        dateFrom: "2026-01-15",
        dateTo: "2026-01-30",
        minTotal: 500,
        maxTotal: 1000,
      })
      .set("Authorization", `Bearer ${session.token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].status).toBe("PROCESSING");
    expect(response.body.data[0].total).toBe(950);
  });

  it("returns organization order details with customer and audit history", async () => {
    const { organization, customer } = await createOrganizationCustomer("Lifecycle Detail Org");
    const order = await createOrder({
      organizationId: organization.id,
      customerId: customer.id,
      status: "PENDING_PAYMENT",
      total: 640,
    });
    const session = signOrgUserToken({
      organizationId: organization.id,
      role: "ADMIN",
    });

    await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set("Authorization", `Bearer ${session.token}`)
      .send({ status: "PAID" })
      .expect(200);

    const response = await request(app)
      .get(`/api/orders/${order.id}/details`)
      .set("Authorization", `Bearer ${session.token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(order.id);
    expect(response.body.data.customer.name).toBe(customer.name);
    expect(Array.isArray(response.body.data.auditLogs)).toBe(true);
    expect(response.body.data.auditLogs.length).toBeGreaterThan(0);
  });

  it("blocks cross-tenant order status updates", async () => {
    const owner = await createOrganizationCustomer("Lifecycle Owner Org");
    const outsider = await createOrganizationCustomer("Lifecycle Outsider Org");
    const order = await createOrder({
      organizationId: owner.organization.id,
      customerId: owner.customer.id,
      status: "PAID",
    });
    const session = signOrgUserToken({
      organizationId: outsider.organization.id,
      role: "ADMIN",
    });

    const response = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set("Authorization", `Bearer ${session.token}`)
      .send({ status: "PROCESSING" })
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/order not found/i);
  });

  it("allows only one concurrent status update to succeed", async () => {
    const { organization, customer } = await createOrganizationCustomer("Lifecycle Race Org");
    const order = await createOrder({
      organizationId: organization.id,
      customerId: customer.id,
      status: "PAID",
    });
    const session = signOrgUserToken({
      organizationId: organization.id,
      role: "ADMIN",
    });

    const requests = [1, 2].map(() =>
      request(app)
        .patch(`/api/orders/${order.id}/status`)
        .set("Authorization", `Bearer ${session.token}`)
        .send({ status: "PROCESSING" })
    );

    const responses = await Promise.all(requests);
    const statusCodes = responses.map((response) => response.statusCode);

    expect(statusCodes.filter((code) => code === 200)).toHaveLength(1);
    expect(statusCodes.some((code) => code === 400 || code === 409)).toBe(true);

    const refreshedOrder = await prisma.order.findUnique({
      where: { id: order.id },
    });
    const auditCount = await prisma.orderAuditLog.count({
      where: {
        orderId: order.id,
        newStatus: "PROCESSING",
      },
    });

    expect(refreshedOrder.status).toBe("PROCESSING");
    expect(auditCount).toBe(1);
  });
});
