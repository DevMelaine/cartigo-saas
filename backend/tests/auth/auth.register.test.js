const request = require("supertest");
const app = require("../../src/app");
const { seedTestUser } = require("../seed");

/**
 * These tests verify the organization registration endpoint.
 * The global Prisma client is available via `global.prisma` thanks
 * to the jest.setup.js helper.
 */

describe("POST /api/auth/register-organization", () => {
  it("should create organization and admin user successfully", async () => {
    const res = await request(app)
      .post("/api/auth/register-organization")
      .send({
        name: "Test Org",
        adminName: "Admin User",
        email: "admin@test.com",
        password: "password123",
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.organization).toHaveProperty("id");
    expect(res.body.data.user).toHaveProperty("email", "admin@test.com");
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();

    const user = await global.prisma.user.findUnique({
      where: { email: "admin@test.com" },
    });
    expect(user).not.toBeNull();
  });

  it("should return JWT access token in correct format", async () => {
    const res = await request(app)
      .post("/api/auth/register-organization")
      .send({
        name: "Org2",
        adminName: "Admin2",
        email: "admin2@test.com",
        password: "password123",
      })
      .expect(201);

    expect(res.body.data.accessToken).toMatch(
      /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/
    );
  });

  it("should fail if email already exists", async () => {
    // create first organization
    await request(app)
      .post("/api/auth/register-organization")
      .send({
        name: "Org3",
        adminName: "Admin3",
        email: "duplicate@test.com",
        password: "password123",
      })
      .expect(201);

    const res = await request(app)
      .post("/api/auth/register-organization")
      .send({
        name: "Org4",
        adminName: "Admin4",
        email: "duplicate@test.com",
        password: "password456",
      })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Email already in use/);
  });

  it("should fail if required fields are missing or invalid", async () => {
    const res = await request(app)
      .post("/api/auth/register-organization")
      .send({
        name: "",
        adminName: "",
        email: "bad",
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });
});
