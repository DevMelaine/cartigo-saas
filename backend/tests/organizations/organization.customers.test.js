const jwt = require("jsonwebtoken");
const request = require("supertest");
const { v4: uuidv4 } = require("uuid");

const app = require("../../src/app");
const prisma = require("../../src/lib/prisma");
const { getAuthToken } = require("../helpers/authHelper");

jest.setTimeout(120000);

function decodeToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET);
}

function signRoleToken(basePayload, role) {
  return jwt.sign(
    {
      userId: uuidv4(),
      organizationId: basePayload.organizationId,
      role,
    },
    process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    }
  );
}

async function createCustomer(name) {
  return prisma.customer.create({
    data: {
      email: `${name.toLowerCase().replace(/\s+/g, "-")}-${uuidv4()}@example.com`,
      password: "password123",
      name,
    },
  });
}

async function createOrder(organizationId, customerId, total, createdAt) {
  return prisma.order.create({
    data: {
      organizationId,
      customerId,
      total,
      status: "DELIVERED",
      createdAt,
      updatedAt: createdAt,
    },
  });
}

describe("GET /api/organizations/customers", () => {
  it("returns aggregated customers scoped to the authenticated organization", async () => {
    const organizationOneToken = await getAuthToken(app);
    const organizationTwoToken = await getAuthToken(app);
    const organizationOne = decodeToken(organizationOneToken);
    const organizationTwo = decodeToken(organizationTwoToken);

    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 5);

    const olderDate = new Date();
    olderDate.setDate(olderDate.getDate() - 45);

    const alpha = await createCustomer("Alpha Client");
    const beta = await createCustomer("Beta Client");
    const outsider = await createCustomer("Outside Client");

    await createOrder(organizationOne.organizationId, alpha.id, 10, olderDate);
    await createOrder(organizationOne.organizationId, alpha.id, 15, recentDate);
    await createOrder(organizationOne.organizationId, beta.id, 8, olderDate);
    await createOrder(organizationTwo.organizationId, outsider.id, 999, recentDate);

    const response = await request(app)
      .get("/api/organizations/customers?sortBy=totalSpent&sortOrder=desc")
      .set("Authorization", `Bearer ${organizationOneToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.pagination.total).toBe(2);
    expect(response.body.summary).toEqual({
      totalClients: 2,
      activeClients: 1,
      totalRevenue: 33,
      averageOrderValue: 11,
    });
    expect(response.body.data).toEqual([
      expect.objectContaining({
        id: alpha.id,
        name: "Alpha Client",
        email: alpha.email,
        phone: null,
        totalOrders: 2,
        totalSpent: 25,
        isActive: true,
      }),
      expect.objectContaining({
        id: beta.id,
        name: "Beta Client",
        email: beta.email,
        phone: null,
        totalOrders: 1,
        totalSpent: 8,
        isActive: false,
      }),
    ]);
    expect(
      response.body.data.some((customer) => customer.id === outsider.id)
    ).toBe(false);
  });

  it("supports search and status filters and only allows ADMIN or MANAGER", async () => {
    const adminToken = await getAuthToken(app);
    const admin = decodeToken(adminToken);
    const managerToken = signRoleToken(admin, "MANAGER");
    const staffToken = signRoleToken(admin, "STAFF");

    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 2);

    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 60);

    const alpha = await createCustomer("Alpha Search");
    const beta = await createCustomer("Beta Search");

    await createOrder(admin.organizationId, alpha.id, 30, recentDate);
    await createOrder(admin.organizationId, beta.id, 12, oldDate);

    const managerResponse = await request(app)
      .get("/api/organizations/customers?search=alpha&status=active")
      .set("Authorization", `Bearer ${managerToken}`)
      .expect(200);

    expect(managerResponse.body.pagination.total).toBe(1);
    expect(managerResponse.body.data).toEqual([
      expect.objectContaining({
        id: alpha.id,
        isActive: true,
      }),
    ]);

    await request(app)
      .get("/api/organizations/customers")
      .set("Authorization", `Bearer ${staffToken}`)
      .expect(403);
  });
});
