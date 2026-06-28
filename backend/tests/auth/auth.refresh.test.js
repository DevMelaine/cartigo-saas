const request = require("supertest");
const bcrypt = require("bcrypt");
const app = require("../../src/app");
const tokenService = require("../../src/services/tokenService");
const {
  createTestOrganization,
  ensureOrganizationCategory,
} = require("../helpers/organizationCategoryHelper");

let prisma;

beforeAll(() => {
  prisma = global.prisma;
});

beforeEach(async () => {
  const password = await bcrypt.hash("password123", 10);
  const organization = await createTestOrganization({
    name: "Test Organization",
  });

  await prisma.user.create({
    data: {
      name: "Refresh Test User",
      email: "refresh@test.com",
      password,
      role: "ADMIN",
      organizationId: organization.id,
    },
  });
});

async function loginAndGetRefresh() {
  const email = `refresh${Date.now()}@test.com`;
  const category = await ensureOrganizationCategory();

  await request(app).post("/api/auth/register-organization").send({
    name: "Refresh Org",
    categoryId: category.id,
    adminName: "Refresh Admin",
    email,
    password: "password123",
  });

  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "password123" });

  return res.body.data.refreshToken;
}

describe("POST /api/auth/refresh-token", () => {
  it("should generate a new access token using a valid refresh token", async () => {
    const oldRefresh = await loginAndGetRefresh();

    const res = await request(app)
      .post("/api/auth/refresh-token")
      .send({ refreshToken: oldRefresh })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.refreshToken).not.toEqual(oldRefresh);
  });

  it("should fail with invalid refresh token", async () => {
    const res = await request(app)
      .post("/api/auth/refresh-token")
      .send({ refreshToken: "not-a-token" })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid refresh token/);
  });

  it("should fail if refresh token expired", async () => {
    const email = `expired${Date.now()}@test.com`;
    const category = await ensureOrganizationCategory();

    await request(app).post("/api/auth/register-organization").send({
      name: "Expire Org",
      categoryId: category.id,
      adminName: "Expire Admin",
      email,
      password: "password123",
    });

    const user = await prisma.user.findUnique({ where: { email } });
    const { refreshToken } = await tokenService.createTokenPairForUser(user);

    await prisma.refreshToken.updateMany({
      where: {},
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await request(app)
      .post("/api/auth/refresh-token")
      .send({ refreshToken })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid refresh token/);
  });
});
