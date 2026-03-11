const request = require("supertest");
const app = require("../../src/app");
const { seedTestUser } = require("../seed");
const { PrismaClient } = require("@prisma/client");
const tokenService = require("../../src/services/tokenService");
const bcrypt = require("bcrypt");

let prisma;
let user;
let organization;

beforeAll(() => {
  prisma = global.prisma;
});

beforeEach(async () => {

  const password = await bcrypt.hash("password123", 10);

  // créer organisation
  organization = await prisma.organization.create({
    data: {
      name: "Test Organization"
    }
  });

  // créer utilisateur lié à l'organisation
  user = await prisma.user.create({
    data: {
      name: "Refresh Test User",
      email: "refresh@test.com",
      password,
      role: "ADMIN",
      organizationId: organization.id
    }
  });

});

// helper that registers a user and returns login tokens
async function loginAndGetRefresh() {
  const email = `refresh${Date.now()}@test.com`;
  await request(app).post("/api/auth/register-organization").send({
    name: "Refresh Org",
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
    // create a token manually and expire it
    const email = `expired${Date.now()}@test.com`;
    await request(app).post("/api/auth/register-organization").send({
      name: "Expire Org",
      adminName: "Expire Admin",
      email,
      password: "password123",
    });

    const user = await prisma.user.findUnique({ where: { email } });
    // create token pair via service
    const { refreshToken } = await tokenService.createTokenPairForUser(user);

    // mark token record expired
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
